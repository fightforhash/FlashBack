import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { Drop } from '../types/drop';

type ARViewProps = {
  drops: Drop[];
  userLocation: { latitude: number; longitude: number };
  onClose: () => void;
  onSelectDrop: (drop: Drop) => void;
};

// Calculate bearing between two GPS coordinates (degrees)
function calculateBearing(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

// Calculate distance between two GPS coordinates (km)
function calculateDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Mood → color mapping
const moodColors: Record<string, string> = {
  happy: '#FFD93D',
  sad: '#6C9BCF',
  chill: '#A8D8B9',
  energetic: '#FF6B6B',
  romantic: '#F8A5C2',
  nostalgic: '#C4A7E7',
  angry: '#E63946',
  neutral: '#ADB5BD',
};

const getMoodColor = (mood?: string) =>
  moodColors[(mood || '').toLowerCase()] || moodColors.neutral;

export const ARView: React.FC<ARViewProps> = ({
  drops,
  userLocation,
  onClose,
  onSelectDrop,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [compassHeading, setCompassHeading] = useState<number>(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [orientationGranted, setOrientationGranted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Start camera
  useEffect(() => {
    let mounted = true;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraReady(true);
        }
      } catch (err: any) {
        if (mounted) setError('Camera access required for AR view.');
        console.error('Camera error:', err);
      }
    };

    startCamera();

    return () => {
      mounted = false;
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  // Device orientation
  const handleOrientation = useCallback((e: DeviceOrientationEvent) => {
    // webkitCompassHeading (iOS) or alpha (Android/other)
    const heading =
      (e as any).webkitCompassHeading ??
      (e.alpha != null ? (360 - e.alpha) % 360 : 0);
    setCompassHeading(heading);
  }, []);

  // Request permission & listen
  useEffect(() => {
    const requestPermission = async () => {
      // iOS 13+ requires explicit permission request
      if (
        typeof (DeviceOrientationEvent as any).requestPermission === 'function'
      ) {
        try {
          const perm = await (DeviceOrientationEvent as any).requestPermission();
          if (perm === 'granted') {
            setOrientationGranted(true);
            window.addEventListener('deviceorientation', handleOrientation, true);
          } else {
            setOrientationGranted(true); // still allow AR, just no compass
          }
        } catch {
          setOrientationGranted(true);
        }
      } else {
        // Android / desktop – just listen
        setOrientationGranted(true);
        window.addEventListener('deviceorientation', handleOrientation, true);
      }
    };

    requestPermission();

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, [handleOrientation]);

  // Prepare drop markers with bearing + distance relative to user
  const markers = drops
        .map((drop) => {
          const bearing = calculateBearing(
            userLocation.latitude,
            userLocation.longitude,
            drop.lat,
            drop.lng
          );
          const distance = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            drop.lat,
            drop.lng
          );
          return { drop, bearing, distance };
        })
        .filter((m) => m.distance <= 10) // within 10km
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 20); // max 20 markers

  // Map bearing to screen X position
  const FOV = 70; // degrees (approx phone camera FOV)

  const getScreenX = (bearing: number) => {
    let diff = bearing - compassHeading;
    // Normalize to -180 .. 180
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    // Map to 0..100%
    const pct = 50 + (diff / FOV) * 100;
    return pct;
  };

  // Map distance to vertical position & size
  const getMarkerStyle = (distance: number): { top: string; scale: number; opacity: number } => {
    // Closer drops → lower on screen and larger
    const maxDist = 10;
    const ratio = Math.min(distance / maxDist, 1);
    const top = `${30 + ratio * 30}%`; // 30-60% from top
    const scale = 1.2 - ratio * 0.7; // 1.2 → 0.5
    const opacity = 1 - ratio * 0.4; // 1 → 0.6
    return { top, scale, opacity };
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: '#000',
      }}
    >
      {/* Camera feed */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />

      {/* Error overlay */}
      {error && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: 24,
            textAlign: 'center',
            fontSize: 16,
          }}
        >
          {error}
        </div>
      )}

      {/* AR overlay – drop markers */}
      {cameraReady && orientationGranted && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            overflow: 'hidden',
          }}
        >
          {markers.map(({ drop, bearing, distance }) => {
            const x = getScreenX(bearing);
            // Skip if outside visible range
            if (x < -15 || x > 115) return null;
            const { top, scale, opacity } = getMarkerStyle(distance);
            const color = getMoodColor(drop.mood);

            return (
              <div
                key={drop.id}
                style={{
                  position: 'absolute',
                  left: `${x}%`,
                  top,
                  transform: `translate(-50%, -50%) scale(${scale})`,
                  opacity,
                  pointerEvents: 'auto',
                  cursor: 'pointer',
                  transition: 'left 0.15s ease-out, top 0.3s ease-out',
                }}
                onClick={() => onSelectDrop(drop)}
              >
                {/* Pulsing ring */}
                <div
                  style={{
                    position: 'absolute',
                    inset: -8,
                    borderRadius: '50%',
                    border: `2px solid ${color}`,
                    animation: 'arPulse 2s infinite',
                    opacity: 0.5,
                  }}
                />
                {/* Main bubble */}
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: `radial-gradient(circle at 30% 30%, ${color}ee, ${color}aa)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: `0 0 20px ${color}66, 0 4px 12px rgba(0,0,0,0.3)`,
                    border: '2px solid rgba(255,255,255,0.8)',
                    overflow: 'hidden',
                  }}
                >
                  {drop.coverUrl ? (
                    <img
                      src={drop.coverUrl}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                    />
                  ) : (
                    <span style={{ fontSize: 22 }}>🎵</span>
                  )}
                </div>
                {/* Speech bubble label */}
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    marginTop: 10,
                    textAlign: 'center',
                  }}
                >
                  {/* Bubble arrow */}
                  <div style={{
                    width: 0,
                    height: 0,
                    borderLeft: '6px solid transparent',
                    borderRight: '6px solid transparent',
                    borderBottom: '6px solid rgba(0,0,0,0.85)',
                    margin: '0 auto',
                  }} />
                  {/* Bubble body */}
                  <div
                    style={{
                      background: 'rgba(0,0,0,0.85)',
                      backdropFilter: 'blur(6px)',
                      borderRadius: 10,
                      padding: '8px 12px',
                      minWidth: 100,
                      maxWidth: 160,
                      boxShadow: `0 2px 12px ${color}44, 0 4px 8px rgba(0,0,0,0.3)`,
                      border: `1px solid ${color}66`,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#fff',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginBottom: 2,
                      }}
                    >
                      {drop.title}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: '#ccc',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginBottom: 3,
                      }}
                    >
                      {drop.artist || 'Unknown'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                      <span
                        style={{
                          fontSize: 9,
                          color: '#fff',
                          background: `${color}88`,
                          padding: '1px 6px',
                          borderRadius: 8,
                          fontWeight: 600,
                        }}
                      >
                        {drop.mood || 'vibe'}
                      </span>
                      <span style={{ fontSize: 10, color: color, fontWeight: 700 }}>
                        {distance < 1
                          ? `${Math.round(distance * 1000)}m`
                          : `${distance.toFixed(1)}km`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Compass indicator */}
      <div
        style={{
          position: 'absolute',
          top: 70,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <div
          style={{
            fontSize: 12,
            color: 'white',
            textShadow: '0 1px 4px rgba(0,0,0,0.6)',
            fontWeight: 600,
            letterSpacing: 1,
          }}
        >
          {Math.round(compassHeading)}°{' '}
          {['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][
            Math.round(compassHeading / 45) % 8
          ]}
        </div>
        <div
          style={{
            width: 200,
            height: 2,
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
          }}
        />
      </div>

      {/* Drop count badge */}
      <div
        style={{
          position: 'absolute',
          top: 70,
          right: 16,
          backgroundColor: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(8px)',
          borderRadius: 20,
          padding: '6px 14px',
          color: 'white',
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        {markers.length} drops nearby
      </div>

      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          width: 44,
          height: 44,
          borderRadius: '50%',
          border: 'none',
          backgroundColor: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(8px)',
          color: 'white',
          fontSize: 20,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
        }}
      >
        ✕
      </button>

      {/* Scan line animation */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: 2,
            background:
              'linear-gradient(90deg, transparent, rgba(0,200,255,0.5), transparent)',
            animation: 'scanLine 3s ease-in-out infinite',
          }}
        />
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes arPulse {
          0% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.4); opacity: 0; }
          100% { transform: scale(1); opacity: 0; }
        }
        @keyframes scanLine {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
      `}</style>
    </div>
  );
};
