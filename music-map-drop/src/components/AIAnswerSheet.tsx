import React, { useEffect, useRef, useState } from 'react';
import type { AiAnswerTrack, AiConversationStatus } from '../types/ai';
import { AudioPlayer } from './AudioPlayer';

type AIAnswerSheetProps = {
  status: AiConversationStatus;
  answerText: string;
  tracks: AiAnswerTrack[];
  error: string | null;
  ttsAudioUrl?: string;
  onAudioEnded?: () => void; // Called when TTS audio finishes playing
  onDismiss?: () => void; // Called when the sheet should be dismissed
  onClearAnswer?: () => void; // Called when user taps delete (final answer only)
  autoDismissSeconds?: number; // Auto dismiss after this many seconds (default: 15)
};

export const AIAnswerSheet: React.FC<AIAnswerSheetProps> = ({
  status,
  answerText,
  tracks,
  error,
  ttsAudioUrl,
  onAudioEnded,
  onDismiss,
  onClearAnswer,
  autoDismissSeconds = 15,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [displayError, setDisplayError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Auto dismiss the answer sheet after a delay
  useEffect(() => {
    if (answerText && status === 'idle') {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        onDismiss?.();
      }, autoDismissSeconds * 1000);

      return () => clearTimeout(timer);
    }
  }, [answerText, status, autoDismissSeconds, onDismiss]);

  // Reset visibility when new answer comes in
  useEffect(() => {
    if (status === 'thinking') {
      setIsVisible(true);
    }
  }, [status]);

  // Show error and auto-dismiss after 10s
  useEffect(() => {
    if (error) {
      setDisplayError(error);
      // Remove fully after 5s (animation starts at 9.5s, 0.5s duration)
      const timer = setTimeout(() => {
        setDisplayError(null);
      }, 5000);

      return () => clearTimeout(timer);
    } else {
      // Clear immediately when no error
      setDisplayError(null);
    }
  }, [error]);

  // AudioPlayer handles autoPlay, no need to call onPlayAudio here

  const handlePlayPreview = (previewUrl?: string) => {
    if (!previewUrl) return;
    
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    const audio = new Audio(previewUrl);
    audioRef.current = audio;
    audio.play().catch((err) => {
      console.error('Failed to play audio:', err);
    });
  };

  // Hide if not visible or no content
  if (!isVisible && status === 'idle' && !displayError) {
    return null;
  }

  if (status === 'idle' && !answerText && !displayError) {
    return null;
  }

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '40vh',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '90%',
        maxWidth: '500px',
        maxHeight: '50vh',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '16px',
        padding: '20px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
        backdropFilter: 'blur(10px)',
        zIndex: 1000,
        overflowY: 'auto',
        animation: 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Loading skeleton */}
      {status === 'thinking' && (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🤔</div>
          <div style={{ color: '#666', fontSize: '14px' }}>AI is thinking...</div>
          <div
            style={{
              marginTop: '16px',
              display: 'flex',
              gap: '8px',
              justifyContent: 'center',
            }}
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#007bff',
                  animation: `bounce 1.4s infinite ease-in-out ${i * 0.16}s`,
                }}
              />
            ))}
          </div>
          <style>{`
            @keyframes bounce {
              0%, 80%, 100% { transform: scale(0); }
              40% { transform: scale(1); }
            }
          `}</style>
        </div>
      )}

      {/* Error message (auto-dismiss after 10s) */}
      {displayError && (
        <div
          style={{
            padding: '16px',
            backgroundColor: '#fee',
            borderRadius: '8px',
            border: '1px solid #fcc',
            color: '#c33',
            animation: 'fadeOut 0.5s ease-out 9.5s forwards',
            transition: 'opacity 0.5s ease-out, transform 0.5s ease-out',
          }}
          onAnimationEnd={() => {
            // Remove box after animation ends
            setDisplayError(null);
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>⚠️ Error</div>
          <div style={{ fontSize: '14px' }}>{displayError}</div>
          <style>{`
            @keyframes fadeOut {
              from {
                opacity: 1;
                transform: translateY(0);
              }
              to {
                opacity: 0;
                transform: translateY(-10px);
              }
            }
          `}</style>
        </div>
      )}

      {/* AI response text + clear button */}
      {answerText && status !== 'thinking' && (
        <div style={{ marginBottom: '20px', position: 'relative' }}>
          {/* Clear button: only for final answer */}
          {onClearAnswer && (
            <button
              type="button"
              onClick={onClearAnswer}
              aria-label="Clear answer"
              style={{
                position: 'absolute',
                top: '-4px',
                right: '0',
                padding: '6px 12px',
                border: 'none',
                borderRadius: '8px',
                background: '#f0f0f0',
                color: '#666',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#e0e0e0';
                e.currentTarget.style.color = '#333';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f0f0f0';
                e.currentTarget.style.color = '#666';
              }}
            >
              Go Back
            </button>
          )}
          <div
            style={{
              fontSize: '16px',
              lineHeight: '1.6',
              color: '#333',
              whiteSpace: 'pre-wrap',
              marginBottom: '16px',
              paddingRight: onClearAnswer ? '60px' : 0,
            }}
          >
            {answerText}
          </div>
          
          {/* TTS audio player */}
          {ttsAudioUrl && (
            <AudioPlayer
              audioUrl={ttsAudioUrl}
              autoPlay={status === 'playing'}
              onEnded={() => {
                onAudioEnded?.();
              }}
              onError={() => {
                console.error('TTS audio playback failed');
                onAudioEnded?.();
              }}
            />
          )}
        </div>
      )}

      {/* Recommended tracks list */}
      {tracks.length > 0 && status !== 'thinking' && (
        <div>
          <div
            style={{
              fontSize: '14px',
              fontWeight: 'bold',
              color: '#666',
              marginBottom: '12px',
              paddingBottom: '8px',
              borderBottom: '1px solid #eee',
            }}
          >
            Recommended Music ({tracks.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {tracks.map((track, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  gap: '12px',
                  padding: '12px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                  cursor: track.previewUrl ? 'pointer' : 'default',
                }}
                onClick={() => handlePlayPreview(track.previewUrl)}
              >
                {track.coverUrl && (
                  <img
                    src={track.coverUrl}
                    alt={track.trackName}
                    style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '8px',
                      objectFit: 'cover',
                    }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 'bold',
                      fontSize: '14px',
                      color: '#333',
                      marginBottom: '4px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {track.trackName}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#666',
                      marginBottom: '4px',
                    }}
                  >
                    {track.artistName}
                  </div>
                  {track.mood && (
                    <div
                      style={{
                        fontSize: '11px',
                        color: '#999',
                        display: 'inline-block',
                        padding: '2px 6px',
                        backgroundColor: '#e9ecef',
                        borderRadius: '4px',
                        marginTop: '4px',
                      }}
                    >
                      {track.mood}
                    </div>
                  )}
                  {track.distance !== undefined && (
                    <div
                      style={{
                        fontSize: '11px',
                        color: '#999',
                        marginTop: '4px',
                      }}
                    >
                      {track.distance.toFixed(1)}km away
                    </div>
                  )}
                </div>
                {track.previewUrl && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      fontSize: '20px',
                    }}
                  >
                    ▶️
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hidden audio element */}
      <audio ref={audioRef} />
    </div>
  );
};

