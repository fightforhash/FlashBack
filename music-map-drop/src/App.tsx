import './index.css';
import { useMemo, useState, useEffect, useRef } from 'react';
import { MapComponent } from './components/Map';
import { DropCreator } from './components/DropCreator';
import { MicButton } from './components/MicButton';
import { AIAnswerSheet } from './components/AIAnswerSheet';
import { DropDetailModal } from './components/DropDetailModal';
import { ToastContainer } from './components/Toast';
import { ARView } from './components/ARView';
import { useAiConversation } from './hooks/useAiConversation';
import { db } from './firebase';
import { collection, query, onSnapshot, limit } from 'firebase/firestore';
import type { Drop } from './types/drop';

// Google Maps types - extend Window with google namespace
/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    google: any;
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// seedDrops removed - only use Firestore data

const MyDropsList = ({ drops, onSelect, onMapCenterChange }: { drops: Drop[]; onSelect: (drop: Drop) => void; onMapCenterChange: (drop: Drop) => void; }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div style={{
      width: '100%',
    }}>
      {/* Header tab — always visible */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(8px)',
          color: 'white',
          border: 'none',
          borderRadius: isExpanded ? '16px 16px 0 0' : '16px 16px 0 0',
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        <span>🎵 My Drops ({drops.length})</span>
        <span style={{ fontSize: 16, transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }}>▲</span>
      </button>

      {/* List body — visible when expanded */}
      {isExpanded && (
        <div style={{
          maxHeight: '28vh',
          overflowY: 'auto',
          background: 'rgba(0,0,0,0.75)',
          color: 'white',
          padding: '4px 16px 12px',
          backdropFilter: 'blur(6px)',
        }}>
          {drops.length === 0 && <div style={{ color: '#bbb', padding: '8px 0', fontSize: 13 }}>No drops yet. Add one!</div>}
          {drops.map((drop) => (
            <div
              key={drop.id}
              onClick={() => onMapCenterChange(drop)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 0',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                cursor: 'pointer',
              }}
            >
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: drop.coverUrl ? `url(${drop.coverUrl}) center/cover` : '#222',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                color: '#ffde59',
                flexShrink: 0,
                overflow: 'hidden',
              }}>
                {!drop.coverUrl && '🎵'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {drop.title}
                </div>
                <div style={{ fontSize: 11, color: '#aaa', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {drop.artist || 'Unknown'} · {drop.mood || ''}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(drop);
                }}
                style={{
                  padding: '6px 12px',
                  backgroundColor: 'rgba(255, 255, 255, 0.12)',
                  color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '16px',
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                Detail
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

function App() {
  const [myDrops, setMyDrops] = useState<Drop[]>([]);
  const initialCenter = useMemo(
    () => ({ lat: 37.5665, lng: 126.9780 }), // Default: Seoul
    []
  );
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(initialCenter);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedDrop, setSelectedDrop] = useState<Drop | null>(null);
  const [searchedPlace, setSearchedPlace] = useState<{ lat: number; lng: number; name: string } | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const autocompleteRef = useRef<any>(null);
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type?: 'error' | 'success' | 'info' }>>([]);
  const [showAR, setShowAR] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<'pending' | 'granted' | 'denied'>('pending');
  const lastQuestionRef = useRef<string>('');
  const isInitialLoadRef = useRef<boolean>(true);

  // AI conversation hook
  const aiConversation = useAiConversation();

  // Toast add
  const addToast = (message: string, type: 'error' | 'success' | 'info' = 'info') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  // Toast remove
  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  // Firestore real-time listener (onSnapshot) — only Firestore data, no mock
  useEffect(() => {
    const dropsRef = collection(db, 'drops');
    
    // Helper function to parse location
    const parseLocation = (location: any): { lat: number; lng: number } => {
      if (!location) {
        return { lat: 0, lng: 0 };
      }
      
      if (typeof location === 'string') {
        // String format: "[47.83° N, 122.27° W]"
        const match = location.match(/\[([\d.]+)°\s*([NS]),\s*([\d.]+)°\s*([EW])\]/);
        if (match) {
          let lat = parseFloat(match[1]);
          if (match[2] === 'S') lat = -lat;
          let lng = parseFloat(match[3]);
          if (match[4] === 'W') lng = -lng;
          return { lat, lng };
        } else {
          // Fallback: extract numbers only
          const numbers = location.match(/[\d.]+/g);
          if (numbers && numbers.length >= 2) {
            return { lat: parseFloat(numbers[0]), lng: parseFloat(numbers[1]) };
          }
        }
        return { lat: 0, lng: 0 };
      } else if (typeof location === 'object') {
        // GeoPoint or plain object
        return {
          lat: location.latitude ?? location._latitude ?? 0,
          lng: location.longitude ?? location._longitude ?? 0,
        };
      }
      return { lat: 0, lng: 0 };
    };
    
    // Helper function to process snapshot
    const processSnapshot = (querySnapshot: any) => {
      const loadedDrops: Drop[] = [];
      let totalDocs = 0;
      let skippedDocs = 0;
      
      querySnapshot.forEach((doc: any) => {
        totalDocs++;
        try {
          const data = doc.data();
          const { lat, lng } = parseLocation(data.location);
          // Only add if valid location (exclude 0,0)
          if (lat !== 0 && lng !== 0 && !isNaN(lat) && !isNaN(lng)) {
            loadedDrops.push({
              id: doc.id,
              title: data.trackName || 'Unknown Track',
              artist: data.artistName || 'Unknown Artist',
              coverUrl: data.coverUrl || '',
              previewUrl: data.previewUrl || '',
              text: data.userText || '',
              mood: data.mood || 'neutral',
              lat: lat,
              lng: lng,
              createdAt: data.timestamp?.toMillis?.() || data.timestamp?.seconds * 1000 || Date.now(),
            });
          } else {
            skippedDocs++;
            console.warn(`⚠️ Skipped doc ${doc.id} - invalid location:`, { lat, lng, location: data.location });
          }
        } catch (docError: any) {
          skippedDocs++;
          console.error(`❌ Failed to process drop ${doc.id}:`, docError);
          console.error('Doc data:', doc.data());
        }
      });
      
      // Sort by timestamp (client-side)
      loadedDrops.sort((a, b) => b.createdAt - a.createdAt);
      
      // Use only Firestore data (no mock)
      setMyDrops(loadedDrops);
      
      // Set map center to first drop on initial load only
      if (loadedDrops.length > 0 && isInitialLoadRef.current) {
        setMapCenter({ lat: loadedDrops[0].lat, lng: loadedDrops[0].lng });
        isInitialLoadRef.current = false;
      }
    };
    
    // Real-time listener — no composite index required
    let unsubscribe: (() => void) | undefined;
    
    try {
      // No composite index required
      const q = query(dropsRef, limit(100));
      unsubscribe = onSnapshot(
        q,
        (querySnapshot) => processSnapshot(querySnapshot),
        (error: any) => {
          console.error('❌ Failed to set up Firestore listener:', error);
          console.error('Error details:', {
            message: error?.message,
            code: error?.code,
          });
          // No fallback - keep empty array if Firestore fails
          setMyDrops([]);
        }
      );
      
      console.log('✅ Firestore real-time listener set up successfully');
    } catch (error: any) {
      console.error('❌ Failed to set up Firestore listener:', error);
      console.error('Error details:', {
        message: error?.message,
        code: error?.code,
        stack: error?.stack,
      });
      // No fallback - keep empty array if Firestore fails
      setMyDrops([]);
    }
    
    // Cleanup: unsubscribe on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
        console.log('Firestore listener unsubscribed');
      }
    };
  }, []); // Run once on mount

  // Request location (on button tap or auto)
  const watchIdRef = useRef<number | undefined>(undefined);
  const requestLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus('denied');
      setCurrentLocation({ latitude: 37.5665, longitude: 126.9780 });
      return;
    }
    setGpsStatus('pending');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        setCurrentLocation(loc);
        setMapCenter({ lat: loc.latitude, lng: loc.longitude });
        setGpsStatus('granted');
        // Start watchPosition after success
        if (watchIdRef.current === undefined) {
          watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => setCurrentLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
            () => {},
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
          );
        }
      },
      (error) => {
        console.warn('GPS failed:', error.message);
        setGpsStatus('denied');
        setCurrentLocation({ latitude: 37.5665, longitude: 126.9780 });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  useEffect(() => {
    requestLocation();
    return () => {
      if (watchIdRef.current !== undefined) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  // Initialize Google Places Autocomplete
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 20;

    const initAutocomplete = () => {
      const input = document.getElementById('place-search-input') as HTMLInputElement;
      
      console.log('Trying to init Places...', {
        input: !!input,
        google: !!window.google,
        maps: !!window.google?.maps,
        places: !!window.google?.maps?.places,
        retryCount
      });

      if (!input || !window.google?.maps?.places) {
        retryCount++;
        if (retryCount < maxRetries) {
          setTimeout(initAutocomplete, 500);
        } else {
          console.error('Failed to initialize Places Autocomplete after max retries');
        }
        return;
      }

      if (autocompleteRef.current) {
        console.log('Autocomplete already initialized');
        return;
      }

      try {
        autocompleteRef.current = new window.google.maps.places.Autocomplete(input, {
          fields: ['geometry', 'name', 'formatted_address'],
        });

        autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current?.getPlace();
          console.log('Place selected:', place);
          
          if (place?.geometry?.location) {
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            const name = place.name || place.formatted_address || 'Selected Location';
            
            setSearchedPlace({ lat, lng, name });
            setMapCenter({ lat, lng });
            setCurrentLocation({ latitude: lat, longitude: lng });
            
            input.value = '';
            addToast(`📍 Moved to ${name}`, 'success');
          }
        });

        console.log('Places Autocomplete initialized successfully!');
      } catch (error) {
        console.error('Error initializing Places Autocomplete:', error);
      }
    };

    // Start initialization after a delay to ensure Google Maps is loaded
    const timer = setTimeout(initAutocomplete, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleAddDrop = (drop: Drop) => {
    // Firestore onSnapshot updates myDrops; no local append to avoid duplicates
    console.log('Drop added to Firestore:', drop.id, drop.title);
    setMapCenter({ lat: drop.lat, lng: drop.lng });
  };

  const handleSelectDrop = (drop: Drop) => {
    setSelectedDrop(drop); // Show detail modal
  };

  const handleMapCenterChange = (drop: Drop) => {
    setMapCenter({ lat: drop.lat, lng: drop.lng });
  };

  // Mic recording complete — use map center as AI location
  const handleRecordingComplete = async (audioBlob: Blob) => {
    const aiLocation = {
      latitude: mapCenter.lat,
      longitude: mapCenter.lng,
    };
    
    console.log('AI query location (from map center):', aiLocation);

    try {
      // Convert Blob to URL
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Send to backend and get response — use map center as location
      const response = await aiConversation.askWithAudio(audioUrl, aiLocation);
      
      // If TTS audio present, set playing (AudioPlayer auto-plays)
      if (response?.ttsAudioUrl) {
        aiConversation.setStatus('playing');
        // Auto-played by AudioPlayer
      } else {
        aiConversation.setStatus('idle');
      }
      
      // Revoke temp URL
      URL.revokeObjectURL(audioUrl);
    } catch (error: any) {
      console.error('AI question failed:', error);
      aiConversation.setStatus('idle');
      
      // Network error
        if (error?.message?.includes('Failed to fetch') || error?.message?.includes('cannot connect')) {
        addToast('Network connection failed. Please try again.', 'error');
      } else {
        addToast(error?.message || 'An error occurred while processing AI question.', 'error');
      }
    }
  };


  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {/* 1. map (background) */}
      <MapComponent drops={myDrops} center={mapCenter} searchedLocation={searchedPlace} />

      {/* GPS Permission Banner */}
      {gpsStatus === 'denied' && (
        <div style={{
          position: 'absolute',
          top: '70px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1002,
          backgroundColor: 'rgba(0,0,0,0.85)',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          maxWidth: '90%',
        }}>
          <span style={{ fontSize: '20px' }}>📍</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: 'bold' }}>Location not available</div>
            <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '2px' }}>
              Tap to enable, or check Settings &gt; Safari &gt; Location
            </div>
          </div>
          <button
            onClick={requestLocation}
            style={{
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 'bold',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Enable
          </button>
        </div>
      )}

      {/* 2. Top Bar - Location Search only */}
      <div style={{
        position: 'absolute',
        top: '16px',
        left: '16px',
        right: '16px',
        zIndex: 1001,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.98)',
          borderRadius: '28px',
          padding: '4px 16px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        }}>
          <span style={{ marginRight: '8px', fontSize: '16px' }}>📍</span>
          <input
            type="text"
            placeholder="Search location..."
            id="place-search-input"
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: '14px',
              padding: '10px 0',
              backgroundColor: 'transparent',
              color: '#333',
            }}
          />
        </div>
      </div>

      {/* Bottom Fixed Area: My Drops + Chat Bar */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1001,
        display: 'flex',
        flexDirection: 'column',
      }}>
      {/* My Drops — above chat bar */}
      <MyDropsList drops={myDrops} onSelect={handleSelectDrop} onMapCenterChange={handleMapCenterChange} />

      {/* Chat Bar */}
      <div style={{
        padding: '10px 16px 20px 16px',
        background: 'rgba(0,0,0,0.9)',
        backdropFilter: 'blur(8px)',
      }}>
        <div style={{
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
        }}>
          {aiConversation.status === 'idle' && (
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '28px',
              padding: '4px 16px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
            }}>
              <span style={{ marginRight: '8px', fontSize: '16px' }}>🤖</span>
              <input
                type="text"
                placeholder="Ask AI about music nearby..."
                onKeyDown={async (e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    const text = e.currentTarget.value.trim();
                    if (lastQuestionRef.current === text && aiConversation.status !== 'idle') {
                      aiConversation.reset();
                      lastQuestionRef.current = '';
                      e.currentTarget.value = '';
                      return;
                    }
                    lastQuestionRef.current = text;
                    e.currentTarget.value = '';
                    
                    const aiLocation = {
                      latitude: mapCenter.lat,
                      longitude: mapCenter.lng,
                    };
                    console.log('AI query location (from map center):', aiLocation);
                    
                    try {
                      const response = await aiConversation.askWithText(text, aiLocation);
                      if (response?.ttsAudioUrl) {
                        aiConversation.setStatus('playing');
                      } else {
                        aiConversation.setStatus('idle');
                      }
                    } catch (error: any) {
                      console.error('Failed to process AI question:', error);
                      aiConversation.setStatus('idle');
                      addToast(error?.message || 'AI error', 'error');
                    }
                  }
                }}
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  fontSize: '14px',
                  padding: '10px 0',
                  backgroundColor: 'transparent',
                  color: '#333',
                }}
              />
            </div>
          )}
          <MicButton
            status={aiConversation.status}
            onStatusChange={(status) => {
              if (status === 'recording' && aiConversation.status === 'recording') {
                aiConversation.reset();
                lastQuestionRef.current = '';
                return;
              }
              aiConversation.setStatus(status);
            }}
            onRecordingComplete={handleRecordingComplete}
            onError={(error) => addToast(error.message, 'error')}
          />
        </div>
      </div>
      </div>{/* End Bottom Fixed Area */}

      {/* 3. Music Drop Creator (Bottom left) */}
      <DropCreator 
        onAddDrop={handleAddDrop} 
        userLocation={currentLocation}
        mapLocation={searchedPlace 
          ? { lat: searchedPlace.lat, lng: searchedPlace.lng } 
          : mapCenter 
            ? { lat: mapCenter.lat, lng: mapCenter.lng }
            : null
        }
      />

      {/* 4. AI Answer Sheet */}
      <AIAnswerSheet
        status={aiConversation.status}
        answerText={aiConversation.lastAnswer}
        tracks={aiConversation.answerTracks}
        error={aiConversation.error}
        ttsAudioUrl={aiConversation.ttsAudioUrl}
        onAudioEnded={() => aiConversation.setStatus('idle')}
        onDismiss={aiConversation.reset}
        onClearAnswer={aiConversation.reset}
        autoDismissSeconds={15}
      />

      {/* 5. Drop Detail Modal */}
      <DropDetailModal drop={selectedDrop} onClose={() => setSelectedDrop(null)} />

      {/* AR Toggle — left center */}
      <button
        type="button"
        onClick={() => setShowAR(true)}
        style={{
          position: 'absolute',
          top: '50%',
          left: 16,
          transform: 'translateY(-50%)',
          width: 56,
          height: 56,
          borderRadius: 16,
          border: '2px solid rgba(255,255,255,0.9)',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          fontSize: 14,
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(102,126,234,0.5)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
          zIndex: 1001,
          transition: 'transform 0.2s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(-50%) scale(1)'; }}
        title="AR View"
      >
        <span style={{ fontSize: 22, lineHeight: 1 }}>📷</span>
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1 }}>AR</span>
      </button>

      {/* 8. AR View Overlay */}
      {showAR && (
        <ARView
          drops={myDrops}
          userLocation={currentLocation || { latitude: mapCenter.lat, longitude: mapCenter.lng }}
          onClose={() => setShowAR(false)}
          onSelectDrop={(drop) => {
            setShowAR(false);
            setSelectedDrop(drop);
          }}
        />
      )}

      {/* 9. Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Credits — corner */}
      <div
        style={{
          position: 'fixed',
          bottom: '12px',
          left: '12px',
          zIndex: 500,
          fontSize: '10px',
          color: 'rgba(255,255,255,0.6)',
          pointerEvents: 'none',
          textShadow: '0 1px 2px rgba(0,0,0,0.5)',
        }}
      >
        Thomas (Yoonsoo) Ha · Nate (Seungwon) Seon
      </div>
    </div>
  );
}

export default App;