import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { NearbyMarker } from '../../types/ar';
import { Navigation2 } from 'lucide-react';

export function NearbyDirectionMarker({ 
  marker, 
  onClick, 
  driftOffset = { x: 0, y: 0 },
  key 
}: { 
  marker: NearbyMarker, 
  onClick: () => void, 
  driftOffset?: { x: number, y: number },
  key?: React.Key 
}) {
  const style = {
    top: `calc(${marker.screenY ?? 42}% + ${driftOffset.y}%)`,
    left: `calc(${marker.screenX ?? 50}% + ${driftOffset.x}%)`,
    transform: 'translateX(-50%)',
  };

  const delay = marker.side === 'center' ? 0 : marker.side === 'left' ? 0.1 : 0.2;
  const arrowRotation =
    marker.side === 'left' ? -90 : marker.side === 'right' ? 90 : marker.relativeBearingDegrees || 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: -20 }}
        transition={{ duration: 0.5, delay, type: 'spring', bounce: 0.4 }}
        style={style}
        className="absolute z-20 cursor-pointer pointer-events-auto"
        onClick={onClick}
      >
        <div className="flex flex-col items-center group">
          <div className={`rounded-full px-3 py-1.5 border border-white/20 flex flex-col items-center shadow-lg transition-transform group-hover:scale-105 ${
            marker.isGuided ? 'bg-indigo-500/85 backdrop-blur-md' : 'bg-black/80 backdrop-blur-md'
          }`}>
            <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest">{marker.category}</span>
            <span className="text-white font-bold text-sm truncate max-w-[120px]">{marker.name}</span>
            <div className="flex items-center text-indigo-400 text-[10px] mt-0.5">
              <Navigation2 className="w-3 h-3 mr-1" style={{ transform: `rotate(${arrowRotation}deg)` }} />
              {marker.distanceText}
            </div>
          </div>
          
          <motion.div 
            animate={{ y: [0, 5, 0] }}
            transition={{ repeat: Infinity, duration: 2, delay }}
            className="w-1 h-8 bg-gradient-to-b from-white/40 to-transparent mt-1"
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
