import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { GeoPoint, FieldValue } from "@google-cloud/firestore";

if (process.env.FUNCTIONS_EMULATOR === "true") {
  try {
    const dotenv = require("dotenv");
    dotenv.config();
  } catch (_) { /* no-op */ }
}

admin.initializeApp();
const db = admin.firestore();

const projectId = process.env.GCLOUD_PROJECT || "flashback-25e2f";
const gcloudLocation = "us-central1";

let _vertexAI: any = null;
let _speechClient: any = null;

function getVertexAI() {
  if (!_vertexAI) {
    const { VertexAI } = require("@google-cloud/vertexai");
    _vertexAI = new VertexAI({ project: projectId, location: gcloudLocation });
  }
  return _vertexAI;
}

function getSpeechClient() {
  if (!_speechClient) {
    const { SpeechClient } = require("@google-cloud/speech");
    _speechClient = new SpeechClient();
  }
  return _speechClient;
}

// Request data interface
interface CreateDropRequest {
  artistName?: string;
  trackName?: string;
  coverUrl?: string;
  previewUrl?: string;
  userText?: string;
  mood?: string;
  latitude?: number;
  longitude?: number;
}

// 1. Create drop function (customized for screenshot schema)
export const createDrop = functions.https.onCall(async (data: CreateDropRequest, context) => {
  // (Optional) Authentication check: Can be commented out during testing if needed
//   if (!context.auth) {
//     throw new functions.https.HttpsError(
//       "unauthenticated",
//       "Authentication is required for this feature."
//     );
//   }

  // 2. Receive data from frontend (matching schema field names)
  const { 
    artistName, 
    trackName, 
    coverUrl, 
    previewUrl, 
    userText, 
    mood, 
    latitude, 
    longitude 
  } = data;

  // 3. Validate required data
  if (!trackName || !latitude || !longitude) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Required information (track name, location) is missing."
    );
  }

  try {
    // Check for duplicate drops (same trackName + similar location within 100m)
    const TOLERANCE = 0.001; // ~100m tolerance
    console.log(`Checking for duplicates: ${trackName} at (${latitude}, ${longitude})`);
    
    const existingDrops = await db.collection("drops")
      .where("trackName", "==", trackName)
      .limit(50)
      .get();
    
    let isDuplicate = false;
    for (const doc of existingDrops.docs) {
      const data = doc.data();
      const dropLocation = data.location;
      
      if (dropLocation && typeof dropLocation === 'object') {
        const lat = dropLocation.latitude ?? dropLocation._latitude ?? 0;
        const lng = dropLocation.longitude ?? dropLocation._longitude ?? 0;
        
        const latDiff = Math.abs(lat - latitude);
        const lngDiff = Math.abs(lng - longitude);
        
        if (latDiff < TOLERANCE && lngDiff < TOLERANCE) {
          console.log(`⚠️ Duplicate drop detected: ${trackName} at (${lat}, ${lng}) - skipping save`);
          isDuplicate = true;
          break;
        }
      }
    }
    
    if (isDuplicate) {
      return { 
        success: false,
        id: "",
        message: "Duplicate drop detected. A similar drop already exists at this location."
      };
    }

    // Save to Firestore (works in both emulator and production with GCP auth)
    console.log("💾 Saving drop to Firestore...");
    console.log("Drop data:", {
      trackName,
      artistName,
      latitude,
      longitude,
      mood,
      userText: userText?.substring(0, 50) || ""
    });

    // 4. Create object to save to database
    const newDrop = {
      // Music information
      artistName: artistName || "Unknown Artist",
      trackName: trackName,
      coverUrl: coverUrl || "",
      previewUrl: previewUrl || "",

      // User input
      userText: userText || "",
      mood: mood || "neutral", // Default value (sad, happy, calm, etc.)
      
      // System management fields
      likeCount: 0, // Initially 0 likes
      // Create GeoPoint using @google-cloud/firestore
      location: new GeoPoint(latitude, longitude), // Convert latitude/longitude
      // Use FieldValue from @google-cloud/firestore
      timestamp: FieldValue.serverTimestamp(), // Server timestamp
      
      // (Recommended) It's safer to get author information from context.auth
      // Not in the screenshot, but needed later to find 'my posts'
      uid: context.auth?.uid || "anonymous", 
    };

    // 5. Save to 'drops' collection
    console.log("📤 Adding document to Firestore collection 'drops'...");
    const docRef = await db.collection("drops").add(newDrop);
    console.log("✅ Drop saved successfully! Document ID:", docRef.id);
    console.log("📍 Location saved:", { latitude, longitude });

    return { 
      success: true, 
      id: docRef.id, 
      message: "Drop saved successfully!" 
    };

  } catch (error: any) {
    console.error("Error creating drop:", error);
    console.error("Error details:", error?.message || String(error));
    console.error("Error stack:", error?.stack);
    
    // Provide more detailed error info
    const errorMessage = error?.message || "An error occurred while saving.";
    throw new functions.https.HttpsError(
      "internal", 
      errorMessage,
      { originalError: String(error) }
    );
  }
});

// ElevenLabs TTS request payload
interface TtsRequestBody {
  text?: string;
  voiceId?: string;
}

/**
 * POST /tts
 * Body: { text: string; voiceId?: string }
 * Response: audio/mpeg (MP3) binary
 */
export const tts = functions.runWith({
  timeoutSeconds: 120,
  memory: '256MB'
}).https.onRequest(async (req: functions.https.Request, res: functions.Response) => {
  // Basic CORS (open for rapid prototyping; tighten for production)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  // Use only the standard env/secret key name
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const defaultVoiceId = process.env.ELEVENLABS_DEFAULT_VOICE;

  if (!apiKey) {
    console.error("ELEVENLABS_API_KEY is not set");
    res.status(500).json({ error: "TTS configuration error (missing api key)" });
    return;
  }

  const body = req.body as TtsRequestBody;
  const text = body?.text?.trim();
  const voiceId = body?.voiceId || defaultVoiceId;

  if (!text) {
    res.status(400).json({ error: "text is required" });
    return;
  }

  if (!voiceId) {
    console.error("ELEVENLABS_DEFAULT_VOICE (or voiceId in body) is not set");
    res.status(500).json({ error: "TTS voice configuration error" });
    return;
  }

  try {
    const elevenLabsUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
    const elevenResponse = await fetch(elevenLabsUrl, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        // Optionally extend with model_id or voice_settings if needed later
        // model_id: "eleven_multilingual_v2",
      }),
    });

    if (!elevenResponse.ok) {
      const errorText = await elevenResponse.text().catch(() => "");
      console.error("ElevenLabs TTS error", elevenResponse.status, errorText);
      res
        .status(502)
        .json({ error: "TTS provider error", status: elevenResponse.status });
      return;
    }

    const audioArrayBuffer = await elevenResponse.arrayBuffer();
    const audioBuffer = Buffer.from(audioArrayBuffer);

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", audioBuffer.byteLength.toString());
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(audioBuffer);
  } catch (error) {
    console.error("Unexpected TTS error", error);
    res.status(500).json({ error: "Internal TTS error" });
  }
});

// Storytelling endpoint: AI adds context then TTS
interface StorytellingRequest {
  title: string;
  artist?: string;
  mood?: string;
  text?: string;
  lat: number;
  lng: number;
  createdAt: number;
  timezone?: string; // Client timezone (e.g., "Asia/Seoul", "America/Los_Angeles")
}

export const storytelling = functions.runWith({
  timeoutSeconds: 120,
  memory: '256MB'
}).https.onRequest(async (req: functions.https.Request, res: functions.Response) => {
  // Set CORS headers first (so they're sent even if an error occurs)
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  try {
    const body = req.body as StorytellingRequest;
    const { title, artist, mood, text, createdAt, timezone } = body;

    if (!text) {
      res.status(400).json({ error: "text is required" });
      return;
    }

    // Format date (English) - Use client's timezone if provided
    // createdAt is a timestamp (UTC milliseconds from Date.now())
    const date = new Date(createdAt);
    
    // Debug log to check timezone
    console.log("Storytelling debug:", {
      createdAt,
      timezone,
      dateUTC: date.toISOString(),
    });
    
    // Use client timezone if provided, otherwise default to UTC
    // This converts the UTC timestamp to the client's local time
    const formattedDate = date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: timezone || 'UTC', // Use client timezone if available
    });

    console.log("Formatted date:", formattedDate);

    // Generate storytelling text with Gemini AI
    let storytellingText: string;

    // In local environment, use default text without trying Gemini
    if (process.env.FUNCTIONS_EMULATOR === "true") {
      console.log("Running in emulator - using default storytelling text");
      const musicDesc = `${title}${artist ? ` by ${artist}` : ''}${mood ? ` - a ${mood} moment` : ''}`;
      storytellingText = `On ${formattedDate}, a moment with ${musicDesc}. ${text}`;
    } else {
      // Production: Try Gemini AI
      try {
        const model = getVertexAI().preview.getGenerativeModel({
          model: "gemini-2.0-flash-001",
          generationConfig: {
            maxOutputTokens: 512,
            temperature: 0.8,
          },
          systemInstruction: `You are a warm, emotional storyteller. Create a brief, poetic introduction (2-3 sentences) that sets the scene for a music memory. CRITICAL: Use the EXACT date and time provided in the prompt - do NOT convert, interpret, or modify it in any way. Never add "UTC" or any timezone. Never mention specific coordinates. Always respond in English. Read the user's memory text exactly as written, word-for-word.`,
        });

        // Build music information
        const musicInfo = [];
        if (title) musicInfo.push(`Music: ${title}`);
        if (artist) musicInfo.push(`Artist: ${artist}`);
        if (mood) musicInfo.push(`Mood: ${mood}`);

        const prompt = `Create a storytelling narration for this music memory.

CRITICAL: You MUST use EXACTLY this date and time: "${formattedDate}"
Do NOT convert, modify, or interpret this time in any way. Use it EXACTLY as provided.

Music: ${title}${artist ? ` by ${artist}` : ''}
Mood: ${mood || 'unknown'}

User memory (read exactly as written):
"${text}"

Create a 2-3 sentence introduction, then read the user's memory text word-for-word.
Start with: "On ${formattedDate}..."
Do not mention coordinates or locations.
Do not convert or change the time in any way.`;

        // Add timeout to prevent hanging (30 seconds for storytelling)
        const geminiPromise = model.generateContent({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
        });

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Gemini API timeout after 30 seconds")), 30000);
        });

        const result = await Promise.race([geminiPromise, timeoutPromise]) as any;
        const response = result.response;
        storytellingText = response.candidates?.[0]?.content?.parts?.[0]?.text || 
          `On ${formattedDate}, a moment with ${title}${artist ? ` by ${artist}` : ''}${mood ? ` - a ${mood} moment` : ''}. ${text}`;
      } catch (geminiError: any) {
        // Use default text when Gemini fails (without coordinates)
        console.warn("Gemini API call failed, using default text:", geminiError.message);
        const musicDesc = `${title}${artist ? ` by ${artist}` : ''}${mood ? ` - a ${mood} moment` : ''}`;
        storytellingText = `On ${formattedDate}, a moment with ${musicDesc}. ${text}`;
      }
    }

    // Convert to ElevenLabs TTS
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const defaultVoiceId = process.env.ELEVENLABS_DEFAULT_VOICE;

    if (!apiKey || !defaultVoiceId) {
      res.status(500).json({ error: "TTS configuration error" });
      return;
    }

    const elevenLabsUrl = `https://api.elevenlabs.io/v1/text-to-speech/${defaultVoiceId}`;
    const elevenResponse = await fetch(elevenLabsUrl, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({ text: storytellingText }),
    });

    if (!elevenResponse.ok) {
      const errorText = await elevenResponse.text().catch(() => "");
      console.error("ElevenLabs TTS error", elevenResponse.status, errorText);
      res.status(502).json({ error: "TTS provider error", status: elevenResponse.status });
      return;
    }

    const audioArrayBuffer = await elevenResponse.arrayBuffer();
    const audioBuffer = Buffer.from(audioArrayBuffer);

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", audioBuffer.byteLength.toString());
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(audioBuffer);
  } catch (error) {
    console.error("Unexpected storytelling error", error);
    // Set CORS headers even on error
    setCorsHeaders(res);
    res.status(500).json({ error: "Internal storytelling error" });
  }
});

// ========== Day 8-10: Gemini AI Integration ==========
// ========== Day 11-12: STT Integration ==========

// Helper: Convert audio URL to text using Google Cloud Speech-to-Text
async function transcribeAudio(audioUrl: string): Promise<string | null> {
  try {
    let audioBytes: string;
    let encoding: "WEBM_OPUS" | "LINEAR16" | "FLAC" | "MP3" = "WEBM_OPUS";
    const urlLower = audioUrl.toLowerCase();

    // Handle base64 data URL (from frontend)
    if (audioUrl.startsWith("data:")) {
      // Extract base64 data from data URL
      // Format: data:audio/webm;base64,<base64data>
      const base64Match = audioUrl.match(/^data:audio\/([^;]+);base64,(.+)$/);
      if (!base64Match) {
        console.error("Invalid data URL format");
        return null;
      }
      
      const mimeType = base64Match[1];
      const base64Data = base64Match[2];
      audioBytes = base64Data;

      // Detect encoding from MIME type
      if (mimeType.includes("webm") || mimeType.includes("opus")) {
        encoding = "WEBM_OPUS";
      } else if (mimeType.includes("wav")) {
        encoding = "LINEAR16";
      } else if (mimeType.includes("flac")) {
        encoding = "FLAC";
      } else if (mimeType.includes("mp3") || mimeType.includes("mpeg")) {
        encoding = "MP3";
      }
    } else {
      // Download audio from HTTP URL
      const audioResponse = await fetch(audioUrl);
      if (!audioResponse.ok) {
        console.error("Failed to download audio:", audioResponse.status);
        return null;
      }

      const audioBuffer = await audioResponse.arrayBuffer();
      audioBytes = Buffer.from(audioBuffer).toString("base64");

      // Detect audio format from URL or Content-Type
      const contentType = audioResponse.headers.get("content-type") || "";
      
      if (urlLower.includes(".wav") || contentType.includes("wav")) {
        encoding = "LINEAR16";
      } else if (urlLower.includes(".flac") || contentType.includes("flac")) {
        encoding = "FLAC";
      } else if (urlLower.includes(".mp3") || contentType.includes("mp3")) {
        encoding = "MP3";
      }
    }

    // Configure Speech-to-Text request
    const request = {
      audio: {
        content: audioBytes,
      },
      config: {
        encoding: encoding,
        sampleRateHertz: encoding === "WEBM_OPUS" ? 48000 : 16000, // Adjust based on format
        languageCode: "en-US", // English (primary)
        alternativeLanguageCodes: ["ko-KR"], // Fallback to Korean
        enableAutomaticPunctuation: true,
        model: "latest_long", // Best for longer audio
        useEnhanced: true, // Use enhanced model for better accuracy
      },
    };

    // Perform transcription with timeout (shorter timeout for faster failure)
    // In local development, STT may fail due to GCP authentication issues
    const timeoutMs = process.env.FUNCTIONS_EMULATOR === "true" ? 5000 : 10000; // 5s for emulator, 10s for production
    
    try {
      const [response] = await Promise.race([
        getSpeechClient().recognize(request),
        new Promise<any>((_, reject) => 
          setTimeout(() => reject(new Error("STT timeout")), timeoutMs)
        ),
      ]);
      
      if (!response.results || response.results.length === 0) {
        console.warn("No transcription results");
        return null;
      }

      // Combine all transcription results
      const transcript = response.results
        .map((result: any) => result.alternatives?.[0]?.transcript)
        .filter((text: any) => text)
        .join(" ");

      return transcript || null;
    } catch (sttError: any) {
      // If STT fails in emulator, log and return null (don't block the request)
      if (process.env.FUNCTIONS_EMULATOR === "true") {
        console.warn("STT failed in emulator (expected in local dev):", sttError?.message || String(sttError));
        return null;
      }
      throw sttError;
    }
  } catch (error) {
    console.error("STT error:", error);
    // Return null to allow fallback to text input
    return null;
  }
}

// Helper: Query nearby drops from Firestore
async function queryNearbyDrops(
  latitude: number,
  longitude: number,
  radiusKm: number = 5,
  mood?: string,
  limit: number = 10
): Promise<any[]> {
  try {
    console.log(`Querying nearby drops: lat=${latitude}, lng=${longitude}, radius=${radiusKm}km, mood=${mood || 'any'}, limit=${limit}`);
    
    // Query drops collection
    let query = db.collection("drops").limit(limit);
    
    // Filter by mood if provided
    if (mood) {
      query = query.where("mood", "==", mood);
    }
    
    const snapshot = await query.get();
    console.log(`Retrieved ${snapshot.size} total drops from Firestore`);
    const drops: any[] = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      const dropLocation = data.location;
      
      // Parse location from GeoPoint, plain object, or string format
      let lat: number | undefined, lng: number | undefined;
      
      if (!dropLocation) {
        // No location
      } else if (typeof dropLocation === 'string') {
        // String format: "[47.83328812770472° N, 122.27492890589406° W]"
        const match = dropLocation.match(/\[([\d.]+)°\s*([NS]),\s*([\d.]+)°\s*([EW])\]/);
        if (match) {
          lat = parseFloat(match[1]);
          if (match[2] === 'S') lat = -lat;
          lng = parseFloat(match[3]);
          if (match[4] === 'W') lng = -lng;
        } else {
          // Try to extract numbers only
          const numbers = dropLocation.match(/[\d.]+/g);
          if (numbers && numbers.length >= 2) {
            lat = parseFloat(numbers[0]);
            lng = parseFloat(numbers[1]);
          }
        }
      } else if (typeof dropLocation === 'object') {
        // GeoPoint or plain object
        lat = dropLocation.latitude ?? dropLocation._latitude;
        lng = dropLocation.longitude ?? dropLocation._longitude;
      }
      
      if (lat !== undefined && lng !== undefined) {
        // Calculate distance (Haversine formula - simplified)
        const distance = calculateDistance(
          latitude,
          longitude,
          lat,
          lng
        );
        
        console.log(`Drop "${data.trackName}" by ${data.artistName}: distance=${distance.toFixed(2)}km, within radius=${distance <= radiusKm}`);
        
        if (distance <= radiusKm) {
          drops.push({
            id: doc.id,
            trackName: data.trackName || "",
            artistName: data.artistName || "",
            mood: data.mood || "neutral",
            userText: data.userText || "",
            coverUrl: data.coverUrl || "",
            previewUrl: data.previewUrl || "",
            distance: Math.round(distance * 100) / 100, // Round to 2 decimals
            likeCount: data.likeCount || 0,
          });
        }
      } else {
        console.warn(`Drop "${data.trackName}" by ${data.artistName} has invalid location:`, dropLocation);
      }
    });
    
    // Sort by distance
    drops.sort((a, b) => a.distance - b.distance);
    console.log(`Returning ${drops.length} drops within ${radiusKm}km radius`);
    return drops;
  } catch (error: any) {
    console.error("Error querying nearby drops:", error);
    console.error("Error details:", error?.message || String(error));
    // Return empty array on Firestore error (do not treat as fatal)
    return [];
  }
}

// Helper: Calculate distance between two coordinates (Haversine)
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Helper: Generate TTS audio URL (internal call to tts function)
async function generateTtsAudio(text: string): Promise<string | null> {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const defaultVoiceId = process.env.ELEVENLABS_DEFAULT_VOICE;
    
    console.log("TTS Configuration check:", {
      hasApiKey: !!apiKey,
      hasVoiceId: !!defaultVoiceId,
      voiceId: defaultVoiceId || "NOT SET"
    });
    
    if (!apiKey || !defaultVoiceId) {
      console.error("TTS configuration missing:", {
        apiKey: apiKey ? "SET" : "MISSING",
        voiceId: defaultVoiceId ? "SET" : "MISSING"
      });
      return null;
    }
    
    const elevenLabsUrl = `https://api.elevenlabs.io/v1/text-to-speech/${defaultVoiceId}`;
    console.log("Calling ElevenLabs TTS API...", { url: elevenLabsUrl, textLength: text.length });
    
    const response = await fetch(elevenLabsUrl, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({ text }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("TTS generation failed:", {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      return null;
    }
    
    console.log("TTS API call successful, converting to base64...");
    // For now, return a placeholder URL. In production, you might want to:
    // 1. Upload to Cloud Storage and return public URL
    // 2. Return base64 encoded audio
    // 3. Return a signed URL
    // For now, we'll return a data URL pattern or handle it in frontend
    const audioBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(audioBuffer).toString("base64");
    console.log("TTS audio converted to base64, length:", base64.length);
    return `data:audio/mpeg;base64,${base64}`;
  } catch (error: any) {
    console.error("TTS generation error:", error);
    console.error("Error details:", error?.message || String(error));
    return null;
  }
}

// AI Ask request interface
interface AiAskRequest {
  text?: string;
  audioUrl?: string;
  location: {
    latitude: number;
    longitude: number;
  };
}

/**
 * POST /ai/ask
 * Body: { text?: string; audioUrl?: string; location: { latitude, longitude } }
 * Response: { answerText: string; tracks: any[]; ttsAudioUrl?: string }
 */
// CORS header helper
const setCorsHeaders = (res: any) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS, GET");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age", "3600");
};

export const aiAsk = functions.runWith({
  timeoutSeconds: 300, // 5 minutes for AI processing
  memory: '512MB' // More memory for AI operations
}).https.onRequest(async (req: functions.https.Request, res: functions.Response) => {
  // Set CORS headers first (so they're sent even if an error occurs)
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  try {
    let text: string | undefined;
    let audioUrl: string | undefined;
    let location: { latitude: number; longitude: number } | undefined;

    // Check if FormData or JSON
    const contentType = req.headers["content-type"] || "";
    if (contentType.includes("multipart/form-data")) {
      // FormData handling (busboy)
      const Busboy = require("busboy");
      const { Readable } = require("stream");
      const busboy = Busboy({ headers: req.headers });
      
      const fields: any = {};
      const files: any[] = [];
      
      await new Promise<void>((resolve, reject) => {
        busboy.on("field", (fieldName: string, value: string) => {
          fields[fieldName] = value;
        });
        
        busboy.on("file", (fieldName: string, file: any, info: any) => {
          const chunks: Buffer[] = [];
          file.on("data", (chunk: Buffer) => {
            chunks.push(chunk);
          });
          file.on("end", () => {
            const buffer = Buffer.concat(chunks);
            const base64 = buffer.toString("base64");
            const mimeType = info.mimeType || "audio/webm";
            files.push({
              fieldName,
              data: `data:${mimeType};base64,${base64}`,
            });
          });
        });
        
        busboy.on("finish", () => {
          resolve();
        });
        
        busboy.on("error", (err: Error) => {
          reject(err);
        });
        
        // In Firebase Functions use req.rawBody (body may already be parsed)
        if (req.rawBody) {
          const stream = Readable.from(req.rawBody);
          stream.pipe(busboy);
        } else {
        req.pipe(busboy);
        }
      });
      
      // Extract values from FormData
      text = fields.text;
      audioUrl = files[0]?.data;
      try {
        location = JSON.parse(fields.location);
      } catch {
        location = undefined;
      }
    } else {
      // Process JSON
      const body = req.body as AiAskRequest;
      text = body.text;
      audioUrl = body.audioUrl;
      location = body.location;
    }

    const { text: userText, audioUrl: userAudioUrl, location: userLocation } = { text, audioUrl, location };

    // Validate input
    if (!userText && !userAudioUrl) {
      res.status(400).json({ error: "Either text or audioUrl is required" });
      return;
    }

    if (!userLocation?.latitude || !userLocation?.longitude) {
      res.status(400).json({ error: "Location (latitude, longitude) is required" });
      return;
    }

    // Process audio input if provided (Day 11-12: STT integration)
    let userQuery = userText;
    
    // In emulator, skip Firestore query to avoid production access
    // and use mock data for local development
    let nearbyDrops: any[] = [];
    let transcribedText: string | null = null;
    
    // Query nearby drops and transcribe audio (works in both emulator and production)
    // GCP auth needed: gcloud auth application-default login
    console.log("Querying nearby drops and processing audio...");
    console.log("User location:", {
      latitude: userLocation.latitude,
      longitude: userLocation.longitude
    });
    
    try {
      const results = await Promise.all([
        queryNearbyDrops(
          userLocation.latitude,
          userLocation.longitude,
          5, // 5km radius
          undefined, // No mood filter for now
          20 // Limit to 20 drops
        ),
        userAudioUrl && !userText ? transcribeAudio(userAudioUrl) : Promise.resolve(null),
      ]);
      nearbyDrops = results[0];
      transcribedText = results[1];
      console.log(`Found ${nearbyDrops.length} nearby drops`);
      console.log("Nearby drops details:", nearbyDrops.map((drop: any) => ({
        trackName: drop.trackName,
        artistName: drop.artistName,
        distance: drop.distance,
        location: `${drop.distance}km away`
      })));
    } catch (queryErr: any) {
      console.warn("Query failed (using empty drops):", queryErr?.message);
      nearbyDrops = [];
      // Still try STT separately if audio provided
      if (userAudioUrl && !userText) {
        try {
          transcribedText = await transcribeAudio(userAudioUrl);
        } catch (sttErr: any) {
          console.warn("STT failed:", sttErr?.message);
          transcribedText = null;
        }
      }
    }

    if (!userQuery && userAudioUrl) {
      if (transcribedText) {
        userQuery = transcribedText;
        console.log("STT result:", transcribedText);
      } else {
        // In emulator, STT may fail - provide helpful error message
        if (process.env.FUNCTIONS_EMULATOR === "true") {
          res.status(400).json({ 
            error: "Speech recognition failed. Please use text input in local development environment.",
            details: "STT requires GCP authentication which may not work in emulator"
          });
        } else {
          res.status(400).json({ error: "Failed to transcribe audio. Please try again or use text input." });
        }
        return;
      }
    }

    if (!userQuery) {
      res.status(400).json({ error: "Either text or audioUrl with valid transcription is required" });
      return;
    }

    // Initialize Gemini model with Function Calling
    let responseText: string;
    
    // Try actual Gemini API (both local and production)
    try {
      const model = getVertexAI().preview.getGenerativeModel({
        model: "gemini-2.0-flash-001",
        generationConfig: {
          maxOutputTokens: 1024,
          temperature: 0.7,
        },
        systemInstruction: `You are a warm, emotional DJ for the city called FlashBack. Your role is to help people discover music memories and stories shared by others in their area.

You can handle queries like:
- "Are there any sad songs here?" - Find emotional/sad music nearby
- "What music is nearby?" - List music drops in the area  
- "Tell me about songs near City Hall" or "서울시청 주변에 뭐 있어?" - Location-specific queries
- "Any good memories around downtown?" - Area-based searches
- "Recommend something based on my mood" - Mood-based recommendations
- "What's the vibe like in this neighborhood?" - Area atmosphere queries

CRITICAL RULES FOR LOCATION-BASED RESPONSES:
1. **LIST ALL NEARBY DROPS**: When the user asks about music at a location, you MUST mention ALL drops that are nearby (within 5km), not just one. If there are 2 drops, mention both. If there are 5 drops, mention all 5.
2. **DISTANCE-BASED PRIORITY**: Always prioritize drops by distance - mention the closest ones first, but include all nearby drops.
3. **NO REPETITION**: Do not keep recommending the same drop if the user moves to a different location. Only recommend drops that are actually near the user's CURRENT location.
4. **LOCATION AWARENESS**: If the user mentions a specific location (e.g., "City Hall", "서울시청", "Seoul City Hall"), acknowledge that location and ONLY mention drops that are actually near that location based on the distance data provided.

IMPORTANT GUIDELINES:
1. **CONTEXT AWARENESS**: Only provide music recommendations when the user's query is clearly related to music, location-based music searches, mood-based recommendations, or asking about nearby music memories. For general greetings (e.g., "Hello", "Hi", "안녕"), simply respond warmly without automatically providing music recommendations.
2. When users mention a specific location (e.g., "near City Hall", "around downtown"), acknowledge that location and describe the music memories found there.
3. **ALWAYS mention WHERE each music drop is located** - use the distance information (e.g., "0.5km away", "2km from here") to describe proximity. Say things like "There's a song about 0.3km away" or "I found music memories within 1km of your location".
4. Share the stories and emotions behind each music drop warmly and personally, including WHERE they are located relative to the user.
5. Never mention specific coordinates or exact lat/lng numbers. Use descriptive location references and distance instead (e.g., "a few blocks away", "about 1km from here", "nearby").
6. Be conversational, empathetic, and make users feel connected to the music community.
7. If no drops are found, encourage the user to be the first to drop a memory there!
8. Always respond in English with a friendly, DJ-like personality.

Format your response naturally, mentioning ALL nearby songs, artists, WHERE they are located (distance), and the feelings/stories behind them.`,
      });

      // Prepare user message with context
      const userMessage = userQuery;

      // Prepare context with nearby drops for Gemini (include distance info)
      const dropsContext = nearbyDrops.length > 0
        ? `\n\nFound ${nearbyDrops.length} music drops nearby (within 5km of user's location at ${userLocation.latitude}, ${userLocation.longitude}):\n${nearbyDrops.slice(0, 10).map((drop: any, idx: number) => 
          `${idx + 1}. "${drop.trackName}" by ${drop.artistName} - ${drop.mood || 'neutral'} mood, ${(drop.distance || 0).toFixed(2)}km away${drop.userText ? ` - Note: "${drop.userText}"` : ''}`
        ).join('\n')}\n\nCRITICAL INSTRUCTIONS:
- The user is asking about music at their CURRENT LOCATION (${userLocation.latitude}, ${userLocation.longitude})
- ONLY recommend drops that are ACTUALLY NEARBY (within 5km)
- If the user asks about a specific location (e.g., "City Hall", "서울시청"), prioritize drops closest to that location
- List ALL nearby drops, not just one
- Always mention WHERE each drop is located using the distance (e.g., "0.5km away", "2km from here")
- If multiple drops exist, mention ALL of them, not just the first one`
        : `\n\nNo music drops found within 5km of the user's location (${userLocation.latitude}, ${userLocation.longitude}). Encourage them to be the first to drop a memory here!`;

      console.log("Context being sent to Gemini:", {
        userMessage,
        dropsCount: nearbyDrops.length,
        dropsContext: dropsContext.substring(0, 200) + "..."
      });

      const queryWithContext = `${userMessage}${dropsContext}`;

      // Call Gemini with proper format and timeout (45 seconds to avoid function timeout)
      const geminiPromise = model.generateContent({
        contents: [
          {
            role: "user",
            parts: [{ text: queryWithContext }],
          },
        ],
      });

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Gemini API timeout after 45 seconds")), 45000);
      });

      const result = await Promise.race([geminiPromise, timeoutPromise]) as any;

      const response = result.response;
      responseText = response.candidates?.[0]?.content?.parts?.[0]?.text || 
        "Unable to generate response. Please try again.";
      
      console.log("Gemini response:", responseText);
    } catch (geminiError: any) {
      // Fallback to Mock response when Gemini API fails
      console.warn("Gemini API call failed, using Mock response:", geminiError.message);
      
      // Generate natural Mock response based on user question
      const questionLower = userQuery.toLowerCase();
      let mockResponse = "";
      
      // Check if query is music-related
      const isMusicRelated = 
        questionLower.includes("music") || 
        questionLower.includes("song") || 
        questionLower.includes("음악") || 
        questionLower.includes("노래") ||
        questionLower.includes("추천") || 
        questionLower.includes("recommend") ||
        questionLower.includes("슬프") || 
        questionLower.includes("우울") || 
        questionLower.includes("sad") ||
        questionLower.includes("기쁘") || 
        questionLower.includes("행복") || 
        questionLower.includes("happy") ||
        questionLower.includes("뭐") || 
        questionLower.includes("what") || 
        questionLower.includes("어떤") ||
        questionLower.includes("memory") ||
        questionLower.includes("memories") ||
        questionLower.includes("nearby") ||
        questionLower.includes("around") ||
        questionLower.includes("here");
      
      // Check if it's just a greeting
      const isGreeting = 
        (questionLower === "hello" || 
         questionLower === "hi" || 
         questionLower === "안녕" || 
         questionLower === "안녕하세요" ||
         questionLower.startsWith("hello ") === false && 
         questionLower.startsWith("hi ") === false) &&
        !isMusicRelated;
      
      if (isGreeting) {
        mockResponse = "Hello! I'm FlashBack, your emotional DJ. How can I help you discover music memories today?";
      } else if (questionLower.includes("슬프") || questionLower.includes("우울") || questionLower.includes("sad")) {
        mockResponse = "I sense some sadness. Let me find some emotional music nearby. Sometimes music that shares your sadness can be a great comfort. 🎵";
      } else if (questionLower.includes("기쁘") || questionLower.includes("행복") || questionLower.includes("happy") || questionLower.includes("joy")) {
        mockResponse = "I feel your joy! Let me recommend some bright and cheerful music nearby. Share your good feelings with music! ✨";
      } else if (questionLower.includes("추천") || questionLower.includes("recommend")) {
        mockResponse = "I'll recommend music based on the memories nearby. Let me find songs that match your emotions! 🎶";
      } else if (questionLower.includes("뭐") || questionLower.includes("what") || questionLower.includes("어떤")) {
        mockResponse = "I'm looking at the music drops nearby. Let me find music that matches your emotions! 🎵";
      } else if (isMusicRelated) {
        mockResponse = "I'm searching for music memories nearby. Let me find songs that match your query! 🎶";
      } else {
        mockResponse = "Hello! I'm FlashBack, your emotional DJ. Ask me about music memories nearby, or what songs are around a specific location!";
      }
      
      responseText = mockResponse;
    }

    // Check if query is music-related before providing recommendations
    const questionLower = userQuery.toLowerCase();
    const isMusicRelated = 
      questionLower.includes("music") || 
      questionLower.includes("song") || 
      questionLower.includes("음악") || 
      questionLower.includes("노래") ||
      questionLower.includes("추천") || 
      questionLower.includes("recommend") ||
      questionLower.includes("슬프") || 
      questionLower.includes("우울") || 
      questionLower.includes("sad") ||
      questionLower.includes("기쁘") || 
      questionLower.includes("행복") || 
      questionLower.includes("happy") ||
      questionLower.includes("뭐") || 
      questionLower.includes("what") || 
      questionLower.includes("어떤") ||
      questionLower.includes("memory") ||
      questionLower.includes("memories") ||
      questionLower.includes("nearby") ||
      questionLower.includes("around") ||
      questionLower.includes("here");
    
    // Check if it's just a greeting
    const isGreeting = 
      (questionLower === "hello" || 
       questionLower === "hi" || 
       questionLower === "안녕" || 
       questionLower === "안녕하세요") &&
      !isMusicRelated;

    // Extract recommended tracks from nearby drops (only if music-related query)
    const recommendedTracks = (isMusicRelated && !isGreeting && nearbyDrops.length > 0)
      ? nearbyDrops.slice(0, 5).map((drop) => ({
      trackName: drop.trackName,
      artistName: drop.artistName,
      mood: drop.mood,
      coverUrl: drop.coverUrl,
      previewUrl: drop.previewUrl,
      userText: drop.userText,
      distance: drop.distance,
        }))
      : []; // Empty array for non-music queries

    // Generate TTS audio
    console.log("Generating TTS audio for response text...");
    const ttsAudioUrl = await generateTtsAudio(responseText);
    console.log("TTS audio generation result:", ttsAudioUrl ? "Success" : "Failed (null)");

    // Return response
    res.status(200).json({
      answerText: responseText,
      tracks: recommendedTracks,
      ttsAudioUrl: ttsAudioUrl || undefined,
    });
  } catch (error: any) {
    console.error("AI Ask error:", error);
    console.error("Error stack:", error?.stack);
    console.error("Error details:", JSON.stringify(error, null, 2));
    
    // Set CORS headers even when error occurs
    setCorsHeaders(res);
    
    // Return more detailed error information
    const errorMessage = error?.message || String(error);
    const errorCode = error?.code || "UNKNOWN";
    
    res.status(500).json({ 
      error: "Internal AI error", 
      details: errorMessage,
      code: errorCode,
      stack: process.env.NODE_ENV === "development" ? error?.stack : undefined
    });
  }
});