import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrackingMode, Pose6DOF } from '../../types/ar';
import type { TimeTravelCalloutData, TimeTravelSource } from '../../types';
import { TimeTravelCallout } from './TimeTravelCallout';
import { MoveHorizontal } from 'lucide-react';
import type { HistoricalOverlay } from '../../types';
import { HistoricalGhostOverlay } from './HistoricalGhostOverlay';
import { TimeTravelEraBadge } from './TimeTravelEraBadge';
import { TimeTravelSourceLabel } from './TimeTravelSourceLabel';
import { TimeTravelTimelineScrubber } from './TimeTravelTimelineScrubber';

export function TimeTravelCompareOverlay({
  overlay,
  eraLabel,
  source,
  callouts,
  compareReveal,
  onCompareRevealChange,
  mode,
  timelineSteps,
  timelineValue,
  timelineMax,
  onTimelineChange,
  trackingMode = '3dof',
  pose,
}: {
  overlay: HistoricalOverlay | null;
  eraLabel?: string | null;
  source: TimeTravelSource | null;
  callouts: TimeTravelCalloutData[];
  compareReveal: number;
  onCompareRevealChange: (val: number) => void;
  mode?: 'place-led' | 'scene-led' | null;
  timelineSteps: Array<{
    id: string;
    label: string;
    year: number;
    hasVisual?: boolean;
    statusLabel?: string;
  }>;
  timelineValue: number;
  timelineMax: number;
  onTimelineChange: (value: number) => void;
  trackingMode?: TrackingMode;
  pose?: Pose6DOF | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Handle drag mechanics
  const handlePointerMove = (e: React.PointerEvent | PointerEvent) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percentage = (x / rect.width) * 100;
    onCompareRevealChange(percentage);
  };

  const handlePointerUp = () => setIsDragging(false);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging]);

  if (!overlay?.imageUrl) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 1 }}
        className="absolute inset-0 z-20 overflow-hidden"
        ref={containerRef}
      >
        <HistoricalGhostOverlay
          overlay={overlay}
          revealPercent={compareReveal}
          archivalTreatment={overlay.style !== 'reconstruction'}
        />
        <TimeTravelEraBadge label={eraLabel} mode={mode} />
        <TimeTravelSourceLabel source={source} />

        {callouts.map((callout) => (
          <TimeTravelCallout key={callout.id} callout={callout} trackingMode={trackingMode} pose={pose} />
        ))}

        {/* Slider Handle */}
        <div 
          className="absolute top-0 bottom-0 w-1 bg-white/50 cursor-ew-resize hover:bg-white active:bg-amber-400 transition-colors pointer-events-auto shadow-[0_0_10px_rgba(0,0,0,0.5)]"
          style={{ left: `${compareReveal}%` }}
          onPointerDown={() => setIsDragging(true)}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-xl border border-zinc-200 cursor-ew-resize">
            <MoveHorizontal className="w-5 h-5 text-zinc-900" />
          </div>
        </div>
        <TimeTravelTimelineScrubber
          steps={timelineSteps}
          value={timelineValue}
          max={timelineMax}
          onChange={onTimelineChange}
        />
      </motion.div>
    </AnimatePresence>
  );
}
