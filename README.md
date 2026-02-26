# FlashBack

**Lost & Found Platform for Music Memories | Location-Based Drops | AI Curator | AR Discovery**

[Live Demo](https://music-map-drop-gsfdp63on-fightforhashs-projects.vercel.app)

> *"Music triggers memories. Locations hold them."*

FlashBack is an AR-powered PWA where users drop songs and stories at GPS locations. Discover nearby music memories on the map or through the camera view—a time capsule for places.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19 • TypeScript • Vite 7 • Google Maps (Places) • Web Audio API • DeviceOrientation API |
| **Backend** | Firebase Cloud Functions (Node 20) • Firestore |
| **AI / Voice** | Vertex AI (Gemini 1.5 Flash) • Google Cloud Speech-to-Text • ElevenLabs TTS |
| **Deploy** | Vercel (PWA) • Firebase (Functions + Firestore) |

---

## Features

| Feature | Description |
|---------|-------------|
| **Location-Based Drops** | Create music drops at current or map-selected location; real-time sync via Firestore |
| **AI Curator** | Voice or text questions → Gemini recommends nearby drops with emotional DJ persona |
| **Voice-First UX** | Speak to the AI; hear responses with ElevenLabs TTS and waveform visualizer |
| **AR View** | Camera overlay with compass; nearby drops (within 10 km) shown as bubbles by bearing/distance |
| **My Drops** | Collapsible list of all drops; tap to center map or open detail |
| **PWA** | Installable on iOS/Android; works offline for static shell |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  CLIENT (Vercel)                                                 │
│  React PWA → Firestore (onSnapshot) + Cloud Functions (callable) │
│  Map • DropCreator • AIAnswerSheet • ARView • MicButton           │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│  FIREBASE / GCP                                                 │
│  Firestore (drops) ← createDrop                                 │
│  aiAsk → Vertex AI + STT + ElevenLabs TTS                      │
│  tts, storytelling → ElevenLabs                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Screenshots

| Map + Drops | AR View | AI Chat |
|-------------|---------|---------|
| Google Maps with music markers; search location; create drop | Camera + compass; nearby drops as bubbles | Voice/text to AI; TTS + track list |

---

## What I Learned

- **Lazy init for Cloud Functions**: Heavy SDKs (Vertex AI, Speech) moved to lazy `require()` to avoid 10s load timeout during `firebase deploy`.
- **Firestore rules**: Default deny blocked client reads; added `firestore.rules` with `allow read, create` for `drops` so the PWA could load markers and AR counts.
- **GPS on mobile**: Permission prompt often doesn’t appear on auto-invoke; added an explicit “Enable” button and reuse App-level `watchPosition` result in DropCreator instead of calling `getCurrentPosition` again.
- **Node runtime**: GCF Gen1 does not support Node 24; set `engines.node` to `20` in `functions/package.json` for deploy.

---

## Running Locally

### Prerequisites

- Node.js 20+
- Firebase CLI: `npm i -g firebase-tools`
- Google Cloud project with Firebase, Vertex AI, Speech-to-Text, and Cloud Functions enabled

### Option 1: Frontend only (uses production backend)

```bash
cd music-map-drop
npm install
cp .env.example .env   # set VITE_GOOGLE_MAPS_API_KEY
npm run dev
# → http://localhost:5173
```

### Option 2: Full local (emulator + seed)

```bash
# Terminal 1 — Functions + Firestore emulator
cd functions && npm install && npm run serve:full
# → Functions: 5001, Firestore: 8080, UI: 4000

# Terminal 2 — Seed emulator (so map/AR show data)
cd functions && npm run seed:emulator

# Terminal 3 — Frontend (points to emulator in DEV)
cd music-map-drop && npm install && npm run dev
```

---

## Environment Variables

### Frontend (`music-map-drop/.env`)

```env
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

### Backend (`functions/.env` for local / set in Firebase Console for production)

```env
ELEVENLABS_API_KEY=your_elevenlabs_key
ELEVENLABS_DEFAULT_VOICE=your_voice_id
```

GCP project is used for Vertex AI, Speech-to-Text, and Firestore (ADC or service account).

---

## Deployment

### Frontend (Vercel)

```bash
cd music-map-drop
npm run build
vercel --prod
```

Set `VITE_GOOGLE_MAPS_API_KEY` in Vercel project environment.

### Backend (Firebase)

```bash
cd functions
npm run build
firebase deploy --only functions
```

### Firestore rules

```bash
firebase deploy --only firestore:rules
```

### Seed production (optional)

```bash
cd functions && npm run seed
```

---

## Project Structure

```
FlashBack/
├── music-map-drop/          # PWA frontend
│   ├── src/
│   │   ├── components/      # Map, ARView, DropCreator, AIAnswerSheet, etc.
│   │   ├── hooks/          # useAiConversation
│   │   ├── api/            # iTunes search, AI request helpers
│   │   ├── types/
│   │   ├── App.tsx
│   │   └── firebase.ts
│   ├── public/manifest.webmanifest
│   └── vercel.json
├── functions/              # Cloud Functions
│   ├── src/
│   │   ├── index.ts        # createDrop, aiAsk, tts, storytelling
│   │   └── seedDrops.ts    # Demo seed (Seoul + Seattle)
│   └── package.json
├── firestore.rules
├── firebase.json
└── README.md
```

---

## API Summary

| Endpoint | Type | Description |
|----------|------|-------------|
| `createDrop` | Callable | Create a music drop at lat/lng; returns `{ success, id }`. |
| `aiAsk` | HTTPS | Text or audio + location → Gemini + nearby drops → answer + optional TTS URL. |
| `tts` | HTTPS | Text → ElevenLabs MP3. |
| `storytelling` | HTTPS | Drop context + AI narrative → TTS for detail modal. |

---

## License

**Thomas (Yoonsoo) Ha · Nate (Seungwon) Seon** · MIT © 2025
