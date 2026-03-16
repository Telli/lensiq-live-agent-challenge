import React from 'react';
import { NearbyMarker } from '../../types/ar';
import { NearbyDirectionMarker } from './NearbyDirectionMarker';

export function NearbyDirectionOverlay({ 
  markers, 
  driftOffset = { x: 0, y: 0 },
  onMarkerClick 
}: { 
  markers: NearbyMarker[], 
  driftOffset?: { x: number, y: number },
  onMarkerClick: (id: string) => void 
}) {
  if (markers.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {markers.map(marker => (
        <NearbyDirectionMarker 
          key={marker.id} 
          marker={marker} 
          driftOffset={driftOffset}
          onClick={() => onMarkerClick(marker.id)} 
        />
      ))}
    </div>
  );
}
