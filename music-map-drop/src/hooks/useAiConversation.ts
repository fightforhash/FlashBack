import { useState, useCallback } from 'react';
import type { AiConversationStatus, AiAnswerTrack, AiAskRequest, AiAskResponse } from '../types/ai';
import { askAi } from '../api/ai';

export const useAiConversation = () => {
  const [status, setStatus] = useState<AiConversationStatus>('idle');
  const [lastQuestion, setLastQuestion] = useState<string>('');
  const [lastAnswer, setLastAnswer] = useState<string>('');
  const [answerTracks, setAnswerTracks] = useState<AiAnswerTrack[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ttsAudioUrl, setTtsAudioUrl] = useState<string | undefined>(undefined);

  const askQuestion = useCallback(async (request: AiAskRequest) => {
    try {
      setStatus('thinking');
      setError(null);
      
      const response: AiAskResponse = await askAi(request);
      
      console.log("AI Response received:", {
        hasAnswerText: !!response.answerText,
        tracksCount: response.tracks?.length || 0,
        hasTtsAudioUrl: !!response.ttsAudioUrl,
        ttsAudioUrlLength: response.ttsAudioUrl?.length || 0
      });
      
      setLastAnswer(response.answerText);
      setAnswerTracks(response.tracks || []);
      setTtsAudioUrl(response.ttsAudioUrl);
      setStatus('idle');
      
      return response;
    } catch (err: any) {
      const errorMessage = err?.message || 'An error occurred while fetching AI response.';
      setError(errorMessage);
      setStatus('idle');
      throw err;
    }
  }, []);

  const askWithText = useCallback(async (text: string, location: { latitude: number; longitude: number }) => {
    setLastQuestion(text);
    return askQuestion({ text, location });
  }, [askQuestion]);

  const askWithAudio = useCallback(async (audioUrl: string, location: { latitude: number; longitude: number }) => {
    return askQuestion({ audioUrl, location });
  }, [askQuestion]);

  const reset = useCallback(() => {
    setStatus('idle');
    setLastQuestion('');
    setLastAnswer('');
    setAnswerTracks([]);
    setError(null);
    setTtsAudioUrl(undefined);
  }, []);

  return {
    status,
    setStatus,
    lastQuestion,
    lastAnswer,
    answerTracks,
    error,
    ttsAudioUrl,
    askQuestion,
    askWithText,
    askWithAudio,
    reset,
  };
};

