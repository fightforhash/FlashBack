export type AiConversationStatus = 'idle' | 'recording' | 'thinking' | 'playing';

export interface AiAnswerTrack {
  trackName: string;
  artistName: string;
  mood?: string;
  coverUrl?: string;
  previewUrl?: string;
  userText?: string;
  distance?: number;
}

export interface AiAskRequest {
  text?: string;
  audioUrl?: string;
  location: {
    latitude: number;
    longitude: number;
  };
}

export interface AiAskResponse {
  answerText: string;
  tracks: AiAnswerTrack[];
  ttsAudioUrl?: string;
}

