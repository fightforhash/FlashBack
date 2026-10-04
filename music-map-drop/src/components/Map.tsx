import { APIProvider, Map, Marker, useMap } from '@vis.gl/react-google-maps';
import { useState, useEffect, useRef } from 'react';
import type { Drop } from '../types/drop';

// Google Maps types are loaded via @vis.gl/react-google-maps

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;



// Map Controls Component - handles panning to new locations
const MapControls = ({ targetCenter }: { targetCenter?: { lat: number; lng: number } }) => {
  const map = useMap();
  const prevCenter = useRef<{ lat: number; lng: number } | null>(null);

  // Pan to target center when it changes
  useEffect(() => {
    if (!map || !targetCenter) return;
    
    // Check if center actually changed
    if (prevCenter.current && 
        prevCenter.current.lat === targetCenter.lat && 
        prevCenter.current.lng === targetCenter.lng) {
      return;
    }
    
    console.log('Panning map to:', targetCenter);
    map.panTo(targetCenter);
    map.setZoom(15);
    prevCenter.current = targetCenter;
  }, [map, targetCenter]);

  return null;
};

interface MapComponentProps {
  drops: Drop[];
  center: { lat: number; lng: number };
  searchedLocation?: { lat: number; lng: number; name?: string } | null;
}

export const MapComponent = ({ drops, center, searchedLocation }: MapComponentProps) => {
  const [mapCenter, setMapCenter] = useState(center);
  
  // Update map center when prop changes (e.g., when searching a location)
  useEffect(() => {
    setMapCenter(center);
  }, [center]);
  
  // Show error message if API key is missing
  if (!API_KEY || API_KEY === 'your_api_key_here' || API_KEY === 'VITE_GOOGLE_MAPS_API_KEY') {
    return (
      <div style={{ 
        width: '100vw', 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flexDirection: 'column',
        padding: '20px',
        textAlign: 'center'
      }}>
        <h2>⚠️ Google Maps API Key Missing</h2>
        <p>Please set VITE_GOOGLE_MAPS_API_KEY in your .env file</p>
      </div>
    );
  } 

  return (
    <APIProvider apiKey={API_KEY} libraries={['places']}>
      <div style={{ width: '100vw', height: '100vh' }}>
        <Map
          defaultCenter={center}
          defaultZoom={13}
          gestureHandling={'greedy'}
          disableDefaultUI={true}
          zoomControl={false}
          streetViewControl={false}
          mapTypeControl={false}
          fullscreenControl={false}
        >
          <MapControls targetCenter={mapCenter} />
          
          {drops.map((drop) => (
            <Marker
              key={drop.id}
              position={{ lat: drop.lat, lng: drop.lng }}
              title={drop.title}
            />
          ))}
          
          {/* Red marker for searched location */}
          {searchedLocation && (
            <Marker
              position={{ lat: searchedLocation.lat, lng: searchedLocation.lng }}
              title={searchedLocation.name || 'Searched Location'}
            />
          )}
        </Map>
      </div>
    </APIProvider>
  );
};