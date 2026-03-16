import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DetectionFrame } from '../../types/ar';

export function LandmarkFocusFrame({ 
  frame, 
  driftOffset = { x: 0, y: 0 } 
}: { 
  frame: DetectionFrame, 
  driftOffset?: { x: number, y: number } 
}) {
  if (!frame.visible || frame.state === 'idle') return null;

  const isDetected = frame.state === 'detected';
  
  const getColorClasses = () => {
    if (!isDetected) return 'border-teal-400/70 shadow-[0_0_15px_rgba(45,212,191,0.5)]';
    if (frame.confidence === 'high') return 'border-emerald-400/90 shadow-[0_0_20px_rgba(52,211,153,0.6)]';
    if (frame.confidence === 'medium') return 'border-amber-400/90 shadow-[0_0_20px_rgba(251,191,36,0.6)]';
    return 'border-rose-400/90 shadow-[0_0_20px_rgba(244,63,94,0.6)]';
  };

  const bgClasses = () => {
    if (!isDetected) return 'bg-teal-900/10';
    if (frame.confidence === 'high') return 'bg-emerald-900/10';
    if (frame.confidence === 'medium') return 'bg-amber-900/10';
    return 'bg-rose-900/10';
  }

  const colorClass = getColorClasses();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ 
          opacity: 1, 
          scale: 1,
          left: `calc(${frame.x}% + ${driftOffset.x}%)`,
          top: `calc(${frame.y}% + ${driftOffset.y}%)`,
          width: `${frame.width}%`,
          height: `${frame.height}%`
        }}
        exit={{ opacity: 0, scale: 1.05 }}
        transition={{ type: 'spring', damping: 25, stiffness: 120 }}
        className={`absolute z-10 pointer-events-none ${bgClasses()}`}
      >
        {/* Animated Corner Brackets */}
        <div className={`absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 ${colorClass}`} />
        <div className={`absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 ${colorClass}`} />
        <div className={`absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 ${colorClass}`} />
        <div className={`absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 ${colorClass}`} />
        
        {/* Subtle pulsing inner border when analyzing */}
        {!isDetected && (
          <motion.div 
            animate={{ opacity: [0.2, 0.5, 0.2] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className={`absolute inset-0 border border-teal-400/30 m-2`}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
