import React, { useState, useEffect } from 'react';
import type { Drop } from '../types/drop';
import { AudioPlayer } from './AudioPlayer';

type DropDetailModalProps = {
  drop: Drop | null;
  onClose: () => void;
};

// Storytelling API (AI context + TTS)
const generateStorytellingAudio = async (drop: Drop): Promise<string | null> => {
  try {
    const apiUrl = import.meta.env.DEV
      ? `http://localhost:5001/flashback-25e2f/us-central1/storytelling`
      : `https://us-central1-flashback-25e2f.cloudfunctions.net/storytelling`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: drop.title,
        artist: drop.artist,
        mood: drop.mood,
        text: drop.text,
        lat: drop.lat,
        lng: drop.lng,
        createdAt: drop.createdAt,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, // Send client timezone
      }),
    });

    if (!response.ok) {
      console.error('Failed to generate storytelling:', response.status);
      return null;
    }

    const audioBlob = await response.blob();
    return URL.createObjectURL(audioBlob);
  } catch (error) {
    console.error('Error generating storytelling audio:', error);
    return null;
  }
};

export const DropDetailModal: React.FC<DropDetailModalProps> = ({ drop, onClose }) => {
  const [storytellingAudioUrl, setStorytellingAudioUrl] = useState<string | null>(null);
  const [isGeneratingStorytelling, setIsGeneratingStorytelling] = useState(false);

  // Reset state when drop changes
  useEffect(() => {
    if (drop) {
      // Reset state (URL cleaned in next useEffect)
      setIsGeneratingStorytelling(false);
    }
  }, [drop?.id]);

  // Clean up audio URL when storytellingAudioUrl changes or on unmount
  useEffect(() => {
    return () => {
      if (storytellingAudioUrl) {
        URL.revokeObjectURL(storytellingAudioUrl);
      }
    };
  }, [storytellingAudioUrl]);

  if (!drop) return null;

  // Close handler (clean up audio then close)
  const handleClose = () => {
    // Clean up audio
    if (storytellingAudioUrl) {
      URL.revokeObjectURL(storytellingAudioUrl);
    }
    // Reset state
    setStorytellingAudioUrl(null);
    setIsGeneratingStorytelling(false);
    // Close modal
    onClose();
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handlePlayPreview = () => {
    if (drop.previewUrl) {
      const audio = new Audio(drop.previewUrl);
      audio.play().catch((err) => {
        console.error('Failed to play audio:', err);
        alert('Unable to play preview.');
      });
    }
  };

  const handleGenerateStorytelling = async () => {
    if (!drop.text) {
      alert('No story text available.');
      return;
    }

    setIsGeneratingStorytelling(true);
    try {
      const audioUrl = await generateStorytellingAudio(drop);
      if (audioUrl) {
        setStorytellingAudioUrl(audioUrl);
      } else {
        alert('Failed to generate storytelling audio.');
      }
    } catch (error) {
      console.error('Storytelling generation error:', error);
      alert('An error occurred while generating storytelling audio.');
    } finally {
      setIsGeneratingStorytelling(false);
    }
  };


  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '20px',
        animation: 'fadeIn 0.25s ease-out',
      }}
      onClick={handleClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '20px',
          maxWidth: '500px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          position: 'relative',
          animation: 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: 'rgba(0,0,0,0.1)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            zIndex: 1,
          }}
        >
          ✕
        </button>

        {/* Cover image */}
        <div
          style={{
            width: '100%',
            height: '280px',
            backgroundImage: drop.coverUrl ? `url(${drop.coverUrl})` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            borderRadius: '20px 20px 0 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {!drop.coverUrl && (
            <div style={{
              fontSize: '64px',
              opacity: 0.3,
            }}>
              🎵
            </div>
          )}
          {/* Gradient overlay */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '100px',
            background: 'linear-gradient(to top, rgba(0,0,0,0.3), transparent)',
          }} />
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {/* Title and artist */}
          <div style={{ marginBottom: '20px' }}>
            <h2
              style={{
                margin: 0,
                marginBottom: '8px',
                fontSize: '28px',
                fontWeight: '800',
                color: '#1a1a1a',
                lineHeight: '1.2',
              }}
            >
              {drop.title}
            </h2>
            <div
              style={{
                fontSize: '18px',
                color: '#666',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>🎤</span>
              <span>{drop.artist || 'Unknown Artist'}</span>
            </div>
          </div>

          {/* Mood tag */}
          {drop.mood && (
            <div style={{ marginBottom: '20px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '24px',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: 'white',
                  boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
                }}
              >
                <span>✨</span>
                <span>{drop.mood}</span>
              </span>
            </div>
          )}

          {/* User text */}
          {drop.text && (
            <div
              style={{
                marginBottom: '24px',
                padding: '20px',
                backgroundColor: '#f8f9fa',
                borderRadius: '16px',
                fontSize: '15px',
                lineHeight: '1.8',
                color: '#2c3e50',
                whiteSpace: 'pre-wrap',
                borderLeft: '4px solid #667eea',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              }}
            >
              <div style={{
                fontSize: '12px',
                color: '#999',
                marginBottom: '8px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                💭 Memory
              </div>
              {drop.text}
            </div>
          )}

          {/* Location and date */}
          <div
            style={{
              marginBottom: '24px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
            }}
          >
            <div
              style={{
                padding: '14px',
                backgroundColor: '#f0f7ff',
                borderRadius: '12px',
                border: '1px solid #e0f2fe',
              }}
            >
              <div style={{
                fontSize: '11px',
                color: '#64748b',
                marginBottom: '6px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                📍 Location
              </div>
              <div style={{
                fontSize: '13px',
                color: '#1e293b',
                fontWeight: '500',
              }}>
                {drop.lat.toFixed(4)}, {drop.lng.toFixed(4)}
              </div>
            </div>
            <div
              style={{
                padding: '14px',
                backgroundColor: '#fef3f2',
                borderRadius: '12px',
                border: '1px solid #fee2e2',
              }}
            >
              <div style={{
                fontSize: '11px',
                color: '#64748b',
                marginBottom: '6px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                📅 Created
              </div>
              <div style={{
                fontSize: '13px',
                color: '#1e293b',
                fontWeight: '500',
              }}>
                {formatDate(drop.createdAt)}
              </div>
            </div>
          </div>

          {/* Preview play button */}
          {drop.previewUrl && (
            <button
              onClick={handlePlayPreview}
              style={{
                width: '100%',
                padding: '16px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '14px',
                fontSize: '16px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                marginBottom: '16px',
                boxShadow: '0 4px 12px rgba(0, 123, 255, 0.3)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 123, 255, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 123, 255, 0.3)';
              }}
            >
              <span style={{ fontSize: '20px' }}>▶️</span>
              <span>Play Preview</span>
            </button>
          )}

          {/* Storytelling audio player */}
          {drop.text && (
            <div>
              {!storytellingAudioUrl ? (
                <button
                  onClick={handleGenerateStorytelling}
                  disabled={isGeneratingStorytelling}
                  style={{
                    width: '100%',
                    padding: '16px',
                    backgroundColor: isGeneratingStorytelling ? '#ccc' : '#FF6B35',
                    color: 'white',
                    border: 'none',
                    borderRadius: '14px',
                    fontSize: '16px',
                    fontWeight: '700',
                    cursor: isGeneratingStorytelling ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    marginBottom: '16px',
                    boxShadow: isGeneratingStorytelling ? 'none' : '0 4px 12px rgba(255, 107, 53, 0.3)',
                    transition: 'all 0.2s',
                    opacity: isGeneratingStorytelling ? 0.7 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!isGeneratingStorytelling) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(255, 107, 53, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isGeneratingStorytelling) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 107, 53, 0.3)';
                    }
                  }}
                >
                  <span style={{ fontSize: '20px' }}>{isGeneratingStorytelling ? '⏳' : '🎙️'}</span>
                  <span>{isGeneratingStorytelling ? 'Generating...' : 'ElevenLabs Storytelling'}</span>
                </button>
              ) : (
                <AudioPlayer
                  audioUrl={storytellingAudioUrl}
                  autoPlay={true}
                  onEnded={() => {}}
                  onError={() => {
                    alert('Failed to play audio');
                  }}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

