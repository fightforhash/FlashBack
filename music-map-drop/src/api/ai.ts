import type { AiAskRequest, AiAskResponse } from '../types/ai';

// Backend API URL (emulator in dev, production URL in prod)
const getApiUrl = () => {
  if (import.meta.env.DEV) {
    // Firebase Functions Emulator
    const projectId = 'flashback-25e2f';
    return `http://localhost:5001/${projectId}/us-central1/aiAsk`;
  }
  // Production
  return `https://us-central1-flashback-25e2f.cloudfunctions.net/aiAsk`;
};

export const askAi = async (request: AiAskRequest): Promise<AiAskResponse> => {
  const url = getApiUrl();
  
  try {
    // If audioUrl present send as FormData, else JSON
    if (request.audioUrl) {
      let blob: Blob;
      
      // Resolve blob from blob URL
      if (request.audioUrl.startsWith('blob:')) {
        const blobResponse = await fetch(request.audioUrl);
        if (!blobResponse.ok) {
          throw new Error(`Blob fetch failed: ${blobResponse.status}`);
        }
        blob = await blobResponse.blob();
      } else if (request.audioUrl.startsWith('data:')) {
        // Convert from data URL to Blob
        const response = await fetch(request.audioUrl);
        blob = await response.blob();
      } else {
        throw new Error('Unsupported audio URL format');
      }
      
      // Check blob size (10MB limit)
      if (blob.size > 10 * 1024 * 1024) {
        throw new Error('Audio file is too large (max 10MB)');
      }
      
      // Send as FormData
      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');
      formData.append('location', JSON.stringify(request.location));
      if (request.text) {
        formData.append('text', request.text);
      }
      
      console.log('AI API call (FormData):', url, {
        hasText: !!request.text,
        hasAudio: true,
        audioSize: blob.size,
      });
      
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || `HTTP ${response.status}` };
        }
        throw new Error(errorData.error || errorData.details || `API request failed: ${response.status}`);
      }
      
      const data: AiAskResponse = await response.json();
      return data;
    } else {
      // Text only — send JSON
      console.log('AI API call (JSON):', url, {
        hasText: !!request.text,
        hasAudio: false,
      });
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || `HTTP ${response.status}` };
        }
        throw new Error(errorData.error || errorData.details || `API request failed: ${response.status}`);
      }

      const data: AiAskResponse = await response.json();
      return data;
    }
  } catch (error: any) {
    console.error('AI API call error:', error);
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    });
    
    // Friendlier message on network error
    if (error?.message?.includes('Failed to fetch') || error?.name === 'TypeError') {
      throw new Error('Cannot connect to backend server. Please check if the backend is running.');
    }
    
    throw error;
  }
};

