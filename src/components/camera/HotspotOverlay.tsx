import React from 'react';
import { HotspotRegion, TrackingMode, Pose6DOF } from '../../types/ar';
import { InteractiveHotspot } from './InteractiveHotspot';

export function HotspotOverlay({ hotspots, onHotspotClick, trackingMode = '3dof', pose }: { hotspots: HotspotRegion[], onHotspotClick: (payload: any) => void, trackingMode?: TrackingMode, pose?: Pose6DOF | null }) {
  if (!hotspots || hotspots.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {hotspots.map(h => (
        <InteractiveHotspot 
          key={h.id} 
          hotspot={h} 
          onClick={() => onHotspotClick(h.actionPayload || h.id)}
          trackingMode={trackingMode}
          pose={pose}
        />
      ))}
    </div>
  );
}
