import React, { useState, useRef, useCallback } from 'react';
import type { AiConversationStatus } from '../types/ai';

type MicButtonProps = {
  status: AiConversationStatus;
  onStatusChange: (status: AiConversationStatus) => void;
  onRecordingComplete: (audioBlob: Blob) => void;
  onError?: (error: Error) => void;
  disabled?: boolean;
};

export const MicButton: React.FC<MicButtonProps> = ({
  status,
  onStatusChange,
  onRecordingComplete,
  onError,
  disabled = false,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        onRecordingComplete(audioBlob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      onStatusChange('recording');
    } catch (error: any) {
      console.error('Failed to start recording:', error);
      onStatusChange('idle');
      
      // Call error callback when mic permission denied
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        onError?.(new Error('Microphone permission is required. Please allow microphone access in your browser settings.'));
      } else {
        onError?.(error);
      }
    }
  }, [onStatusChange, onRecordingComplete]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      onStatusChange('thinking');
    }
  }, [isRecording, onStatusChange]);

  const handleClick = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const showPulse = isRecording;

  return (
    <button
      onClick={handleClick}
      disabled={disabled || status === 'thinking' || status === 'playing'}
      style={{
        width: '64px',
        height: '64px',
        borderRadius: '50%',
        border: 'none',
        backgroundColor: isRecording ? '#FF2D55' : '#007bff',
        color: 'white',
        cursor: disabled || status === 'thinking' || status === 'playing' ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '24px',
        boxShadow: showPulse
          ? '0 0 0 0 rgba(255, 45, 85, 0.7), 0 0 0 0 rgba(255, 45, 85, 0.7)'
          : '0 4px 12px rgba(0,0,0,0.15)',
        animation: showPulse ? 'pulse 1.5s infinite' : 'none',
        transition: 'all 0.3s ease',
        opacity: disabled || status === 'thinking' || status === 'playing' ? 0.6 : 1,
      }}
      onMouseDown={(e) => {
        if (!isRecording && !disabled) {
          e.preventDefault();
          startRecording();
        }
      }}
      onMouseUp={(e) => {
        if (isRecording) {
          e.preventDefault();
          stopRecording();
        }
      }}
    >
      {status === 'thinking' ? '🤔' : isRecording ? '🎤' : '🎙️'}
      <style>{`
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(255, 45, 85, 0.7), 0 0 0 0 rgba(255, 45, 85, 0.7);
          }
          50% {
            box-shadow: 0 0 0 10px rgba(255, 45, 85, 0), 0 0 0 20px rgba(255, 45, 85, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(255, 45, 85, 0), 0 0 0 0 rgba(255, 45, 85, 0);
          }
        }
      `}</style>
    </button>
  );
};

