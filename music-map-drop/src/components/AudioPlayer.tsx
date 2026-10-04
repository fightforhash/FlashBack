import React, { useState, useRef, useEffect, useCallback } from 'react';

type AudioPlayerProps = {
  audioUrl: string;
  autoPlay?: boolean;
  onEnded?: () => void;
  onError?: () => void;
  style?: React.CSSProperties;
};

// Waveform visualizer bar count
const BAR_COUNT = 32;

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioUrl,
  autoPlay = false,
  onEnded,
  onError,
  style,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [bars, setBars] = useState<number[]>(new Array(BAR_COUNT).fill(4));
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>(0);

  // Set up Web Audio API analyser
  const connectAnalyser = useCallback((audio: HTMLAudioElement) => {
    // Avoid reconnecting
    if (sourceRef.current) return;

    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaElementSource(audio);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      sourceRef.current = source;
      analyserRef.current = analyser;
    } catch (err) {
      console.warn('AudioContext unavailable:', err);
    }
  }, []);

  // Animation loop for visualizer
  const animate = useCallback(() => {
    if (!analyserRef.current) {
      // Fake idle animation
      setBars((prev) =>
        prev.map((_, i) => 4 + Math.sin(Date.now() / 600 + i * 0.5) * 2)
      );
    } else {
      const data = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(data);

      const step = Math.floor(data.length / BAR_COUNT);
      const newBars: number[] = [];
      for (let i = 0; i < BAR_COUNT; i++) {
        const val = data[i * step] || 0;
        newBars.push(Math.max(4, (val / 255) * 40));
      }
      setBars(newBars);
    }

    rafRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    if (!audioUrl) return;

    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.src = audioUrl;
    audioRef.current = audio;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      cancelAnimationFrame(rafRef.current);
      onEnded?.();
    };
    const handleError = () => {
      setIsPlaying(false);
      setIsLoading(false);
      cancelAnimationFrame(rafRef.current);
      onError?.();
    };
    const handleLoadStart = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);

    if (autoPlay) {
      connectAnalyser(audio);
      audio.play().catch((err) => {
        console.error('Auto-play failed:', err);
        setIsLoading(false);
      });
      setIsPlaying(true);
      rafRef.current = requestAnimationFrame(animate);
    }

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.pause();
      audio.src = '';
      cancelAnimationFrame(rafRef.current);
    };
  }, [audioUrl, autoPlay, onEnded, onError, connectAnalyser, animate]);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      cancelAnimationFrame(rafRef.current);
    } else {
      connectAnalyser(audioRef.current);
      audioRef.current.play().catch((err) => {
        console.error('Playback failed:', err);
        setIsPlaying(false);
      });
      setIsPlaying(true);
      rafRef.current = requestAnimationFrame(animate);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;

    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '12px',
        backgroundColor: '#f8f9fa',
        borderRadius: '12px',
        ...style,
      }}
    >
      {/* Waveform visualizer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          height: 44,
          padding: '0 4px',
        }}
      >
        {bars.map((h, i) => (
          <div
            key={i}
            style={{
              width: `${100 / BAR_COUNT - 1}%`,
              height: `${h}px`,
              minHeight: 3,
              borderRadius: 2,
              background: isPlaying
                ? `linear-gradient(180deg, #667eea ${100 - h * 2}%, #764ba2)`
                : '#c5c5c5',
              transition: isPlaying ? 'height 0.08s ease' : 'height 0.4s ease, background 0.3s',
            }}
          />
        ))}
      </div>

      {/* Play/pause + progress bar + time */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={togglePlay}
          disabled={isLoading}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            border: 'none',
            background: isPlaying
              ? 'linear-gradient(135deg, #667eea, #764ba2)'
              : '#007bff',
            color: 'white',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            opacity: isLoading ? 0.6 : 1,
            flexShrink: 0,
            transition: 'background 0.3s',
          }}
        >
          {isLoading ? '⏳' : isPlaying ? '⏸️' : '▶️'}
        </button>

        {/* Progress bar */}
        <div style={{ flex: 1, position: 'relative' }}>
          <div
            onClick={handleProgressClick}
            style={{
              width: '100%',
              height: '6px',
              backgroundColor: '#e0e0e0',
              borderRadius: '3px',
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            <div
              style={{
                width: `${progressPercentage}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #667eea, #764ba2)',
                borderRadius: '3px',
                transition: 'width 0.1s linear',
              }}
            />
          </div>
        </div>

        {/* Time */}
        <div
          style={{
            fontSize: '12px',
            color: '#666',
            minWidth: '80px',
            textAlign: 'right',
            flexShrink: 0,
          }}
        >
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>
    </div>
  );
};
