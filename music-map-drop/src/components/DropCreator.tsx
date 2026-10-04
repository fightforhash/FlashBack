import React, { useState } from 'react';
import { searchMusic } from '../api/itunes';
import { createDrop as createDropFunction } from '../firebase';
import type { ItunesSong } from '../types/music';
import type { Drop } from '../types/drop';

type DropCreatorProps = {
  onAddDrop: (drop: Drop) => void;
  mapLocation?: { lat: number; lng: number } | null;
  userLocation?: { latitude: number; longitude: number } | null;
};

export const DropCreator = ({ onAddDrop, mapLocation, userLocation }: DropCreatorProps) => {
  // 1. State Management (Search + Selected Song + Input Form)
  const [term, setTerm] = useState('');
  const [songs, setSongs] = useState<ItunesSong[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSong, setSelectedSong] = useState<ItunesSong | null>(null);
  
  // User Input State
  const [comment, setComment] = useState('');
  const [mood, setMood] = useState('happy');
  const [locationType, setLocationType] = useState<'current' | 'map'>('current');

  // 2. Music Search Handler
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!term.trim()) return;
    setIsLoading(true);
    const results = await searchMusic(term);
    setSongs(results);
    setIsLoading(false);
  };

  // Helper function to save drop with given coordinates
  const saveDropWithLocation = async (latitude: number, longitude: number) => {
    if (!selectedSong) return;
    
    console.log("🎵 Saving drop:", {
      trackName: selectedSong.trackName,
      artistName: selectedSong.artistName,
      location: { latitude, longitude },
      mood,
      comment: comment?.substring(0, 50) || ""
    });

    try {
          // Call backend API
      console.log("📞 Calling createDrop function...");
          const result = await createDropFunction({
            artistName: selectedSong.artistName,
            trackName: selectedSong.trackName,
            coverUrl: selectedSong.artworkUrl100,
            previewUrl: selectedSong.previewUrl || "",
            userText: comment,
            mood: mood,
            latitude: latitude,
            longitude: longitude,
          });

      console.log("📥 Response received:", result.data);
          const response = result.data as { success: boolean; id: string; message: string };

          if (response.success) {
        console.log("✅ Drop saved successfully! ID:", response.id);
            // Create local drop object for UI
            const newDrop: Drop = {
          id: response.id,
              title: selectedSong.trackName,
              artist: selectedSong.artistName,
              coverUrl: selectedSong.artworkUrl100,
              previewUrl: selectedSong.previewUrl,
              text: comment,
              mood: mood,
              lat: latitude,
              lng: longitude,
              createdAt: Date.now(),
            };

            onAddDrop(newDrop);
        alert("🎉 Memory saved successfully!");

        // Reset
            setSelectedSong(null);
            setTerm('');
            setSongs([]);
            setComment('');
          } else {
        throw new Error(response.message || "Save failed");
          }
        } catch (error: any) {
          console.error("Save Failed:", error);
      const errorMessage = error?.message || error?.code || "Unknown error";
      alert(`Save failed: ${errorMessage}`);
        } finally {
          setIsLoading(false);
        }
  };

  // 3. Drop Save Handler
  const handleSaveDrop = async () => {
    if (!selectedSong) return;
    setIsLoading(true);

    // Use map location if selected and available
    if (locationType === 'map') {
      if (mapLocation) {
        await saveDropWithLocation(mapLocation.lat, mapLocation.lng);
      } else {
        alert("No map location available. Please search a location on the map first.");
        setIsLoading(false);
      }
      return;
    }

    if (userLocation) {
      await saveDropWithLocation(userLocation.latitude, userLocation.longitude);
    } else if (mapLocation) {
      await saveDropWithLocation(mapLocation.lat, mapLocation.lng);
    } else {
      alert("Unable to get location. Please enable GPS in your device settings.");
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop overlay - prevents interaction with map when modal is open */}
      {selectedSong && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            zIndex: 998,
            backdropFilter: 'blur(2px)',
          }}
          onClick={(e) => {
            // Only close if clicking the backdrop itself, not the modal content
            if (e.target === e.currentTarget) {
              setSelectedSong(null);
            }
          }}
        />
      )}
      
    <div style={{
      position: 'absolute',
        top: '70px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '90%',
        maxWidth: '360px',
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        padding: '14px',
        borderRadius: '20px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        zIndex: 999,
        // Prevent clicks from propagating to map
        pointerEvents: 'auto',
      }}
      onClick={(e) => e.stopPropagation()}
      >
      
      {/* CASE 1: No song selected (Search Screen) */}
      {!selectedSong ? (
        <>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search for a song or artist 🎵"
              style={{
                flex: 1, padding: '12px', borderRadius: '8px', 
                border: '1px solid #ddd', fontSize: '16px',
                color: '#333', backgroundColor: 'white'
              }}
            />
            <button 
              type="submit" 
              disabled={isLoading}
              style={{
                padding: '0 20px', backgroundColor: '#FF2D55', color: 'white',
                border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer'
              }}
            >
              {isLoading ? '...' : 'Search'}
            </button>
          </form>

          {songs.length > 0 && (
            <div style={{ marginTop: '16px', maxHeight: '400px', overflowY: 'auto' }}>
              {songs.map((song) => (
                <div 
                  key={song.trackId} 
                  onClick={() => setSelectedSong(song)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '10px 0', borderBottom: '1px solid #eee', cursor: 'pointer'
                  }}
                >
                  <img src={song.artworkUrl100} alt={song.trackName} style={{ width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover' }} />
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.trackName}</div>
                    <div style={{ fontSize: '13px', color: '#666' }}>{song.artistName}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* CASE 2: Song selected (Creation Screen) */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Selected Song Display */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f5f5f5', padding: '10px', borderRadius: '8px' }}>
            <img src={selectedSong.artworkUrl100} alt="cover" style={{ width: '40px', height: '40px', borderRadius: '4px' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#333' }}>{selectedSong.trackName}</div>
              <div style={{ fontSize: '12px', color: '#666' }}>{selectedSong.artistName}</div>
            </div>
            <button onClick={() => setSelectedSong(null)} style={{ background: 'none', border: 'none', fontSize: '12px', color: '#999', cursor: 'pointer' }}>✕ Cancel</button>
          </div>

          {/* Comment Input */}
          <textarea
            placeholder="Share your story about this song..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            style={{
              width: '100%', height: '80px', padding: '10px',
              borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', resize: 'none',
              color: '#333', backgroundColor: 'white'
            }}
          />

          {/* Mood Selection */}
          <select 
            value={mood} 
            onChange={(e) => setMood(e.target.value)}
            style={{ padding: '8px', borderRadius: '8px', border: '1px solid #ddd', color: '#333', backgroundColor: 'white' }}
          >
            <option value="happy">😄 Happy</option>
            <option value="sad">😢 Sad</option>
            <option value="calm">☕️ Calm</option>
            <option value="excited">🔥 Excited</option>
            <option value="romantic">💕 Romantic</option>
            <option value="angry">😠 Angry</option>
            <option value="melancholy">🌧️ Melancholy</option>
            <option value="nostalgic">📷 Nostalgic</option>
            <option value="confident">💪 Confident</option>
            <option value="dreamy">✨ Dreamy</option>
            <option value="lonely">🌙 Lonely</option>
            <option value="energetic">⚡ Energetic</option>
            <option value="peaceful">🕊️ Peaceful</option>
            <option value="hopeful">🌈 Hopeful</option>
          </select>

          {/* Location Selection */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setLocationType('current')}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                border: locationType === 'current' ? '2px solid #007bff' : '1px solid #ddd',
                backgroundColor: locationType === 'current' ? '#e7f1ff' : 'white',
                color: '#333',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: locationType === 'current' ? 'bold' : 'normal',
              }}
            >
              📍 Current Location
            </button>
            <button
              type="button"
              onClick={() => setLocationType('map')}
              disabled={!mapLocation}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                border: locationType === 'map' ? '2px solid #007bff' : '1px solid #ddd',
                backgroundColor: locationType === 'map' ? '#e7f1ff' : 'white',
                color: mapLocation ? '#333' : '#999',
                cursor: mapLocation ? 'pointer' : 'not-allowed',
                fontSize: '13px',
                fontWeight: locationType === 'map' ? 'bold' : 'normal',
              }}
            >
              🗺️ Map Location
            </button>
          </div>
          {locationType === 'map' && mapLocation && (
            <div style={{ fontSize: '11px', color: '#666', textAlign: 'center' }}>
              📌 {mapLocation.lat.toFixed(4)}, {mapLocation.lng.toFixed(4)}
            </div>
          )}

          {/* Save Button */}
          <button 
            onClick={handleSaveDrop}
            disabled={isLoading}
            style={{
              width: '100%', padding: '12px',
              backgroundColor: isLoading ? '#ccc' : '#007bff',
              color: 'white', border: 'none', borderRadius: '8px',
              fontWeight: 'bold', cursor: 'pointer', fontSize: '16px'
            }}
          >
            {isLoading ? 'Saving...' : 'Drop Here ✨'}
          </button>
        </div>
      )}
    </div>
    </>
  );
};
