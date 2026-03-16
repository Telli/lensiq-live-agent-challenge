import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrackingMode, Pose6DOF, ScreenProjection } from '../../types/ar';
import type { TimeTravelCalloutData } from '../../types';
import { projectToScreen } from '../../utils/projectionMath';
import { updateTransform } from '../../utils/overlayTransform';

const DEFAULT_FOV = { horizontal: 60, vertical: 45 };

export function TimeTravelCallout({
  callout,
  trackingMode = '3dof',
  pose,
  key,
}: {
  callout: TimeTravelCalloutData;
  trackingMode?: TrackingMode;
  pose?: Pose6DOF | null;
  key?: React.Key;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // 6DOF mode: project world position to screen and update via ref mutation
  useEffect(() => {
    if (trackingMode !== '6dof' || !pose || !callout.worldPosition) return;

    const anchor = {
      id: callout.id,
      worldPosition: callout.worldPosition,
    };

    const projection: ScreenProjection = projectToScreen(anchor, pose, DEFAULT_FOV);
    updateTransform(overlayRef, projection);
  }, [trackingMode, pose, callout]);

  const calloutContent = (
    <div className="relative">
      {/* Connecting Line Pin */}
      <div className="absolute -left-2 -top-2 w-4 h-4 rounded-full bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.8)] border-2 border-white/50" />
      
      <div className="ml-4 mt-4 bg-black/80 backdrop-blur-xl border border-amber-500/30 rounded-xl p-3 w-48 shadow-2xl">
        <h4 className="text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">{callout.title}</h4>
        <p className="text-zinc-300 text-[10px] leading-relaxed">{callout.body}</p>
        {callout.sourceLabel || callout.yearLabel ? (
          <p className="mt-2 text-[9px] uppercase tracking-[0.18em] text-zinc-500">
            {[callout.sourceLabel, callout.yearLabel].filter(Boolean).join(' • ')}
          </p>
        ) : null}
      </div>
    </div>
  );

  // 6DOF mode: render with ref-based positioning (no calc(), no setState)
  if (trackingMode === '6dof' && callout.worldPosition) {
    return (
      <div
        ref={overlayRef}
        className="absolute top-0 left-0 z-30 pointer-events-none"
        style={{ display: 'none' }}
        onClick={undefined}
      >
        {calloutContent}
      </div>
    );
  }

  // 3DOF mode: existing percentage-based positioning with AnimatePresence
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ delay: 0.5, type: 'spring' }}
        style={{ top: `${callout.y}%`, left: `${callout.x}%` }}
        className="absolute z-30 pointer-events-none"
      >
        {calloutContent}
      </motion.div>
    </AnimatePresence>
  );
}
