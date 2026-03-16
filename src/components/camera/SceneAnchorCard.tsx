import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Shield, ShieldAlert } from 'lucide-react';
import { projectToScreen } from '../../utils/projectionMath';
import { updateTransform } from '../../utils/overlayTransform';
import type { AnchoredLabel, Pose6DOF, TrackingMode, ScreenProjection } from '../../types/ar';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

const DEFAULT_FOV = { horizontal: 60, vertical: 45 };

export function SceneAnchorCard({
  anchor,
  driftOffset = { x: 0, y: 0 },
  trackingMode = '3dof',
  pose,
  onExplain,
  onTimeTravel,
  onGuide,
}: {
  anchor: AnchoredLabel | null;
  driftOffset?: { x: number; y: number };
  trackingMode?: TrackingMode;
  pose?: Pose6DOF | null;
  onExplain: () => void;
  onTimeTravel: () => void;
  onGuide: () => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (trackingMode !== '6dof' || !pose || !anchor?.worldPosition) return;
    const projection: ScreenProjection = projectToScreen(
      { id: anchor.title, worldPosition: anchor.worldPosition },
      pose,
      DEFAULT_FOV,
    );
    updateTransform(overlayRef, projection);
  }, [anchor, pose, trackingMode]);

  if (!anchor) return null;

  const isHigh = anchor.confidence === 'high';
  const isMedium = anchor.confidence === 'medium';
  const Icon = isHigh ? CheckCircle2 : isMedium ? Shield : ShieldAlert;
  const confidenceClass = isHigh
    ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
    : isMedium
      ? 'text-amber-400 border-amber-500/30 bg-amber-500/10'
      : 'text-rose-400 border-rose-500/30 bg-rose-500/10';

  const content = (
    <div className="relative min-w-[220px] max-w-[260px] overflow-hidden rounded-[28px] border border-white/10 bg-black/75 p-4 shadow-2xl backdrop-blur-xl">
      <div
        className={`absolute inset-x-0 top-0 h-1 ${
          isHigh ? 'bg-emerald-500' : isMedium ? 'bg-amber-500' : 'bg-rose-500'
        }`}
      />
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-400">
            {anchor.subtitle}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-white">{anchor.title}</h3>
        </div>
        <Badge variant="outline" className={confidenceClass}>
          <Icon className="mr-1 h-3 w-3" />
          {anchor.confidence}
        </Badge>
      </div>

      {anchor.secondaryFact ? (
        <p className="mb-3 text-sm text-zinc-300">{anchor.secondaryFact}</p>
      ) : null}

      {anchor.distanceText ? (
        <p className="mb-3 text-xs uppercase tracking-[0.2em] text-zinc-500">
          {anchor.distanceText}
        </p>
      ) : null}

      <div className="grid grid-cols-3 gap-2">
        <Button size="sm" className="rounded-full" onClick={onExplain}>
          Explain
        </Button>
        <Button size="sm" variant="secondary" className="rounded-full" onClick={onTimeTravel}>
          Time Travel
        </Button>
        <Button size="sm" variant="secondary" className="rounded-full" onClick={onGuide}>
          Guide
        </Button>
      </div>
    </div>
  );

  if (trackingMode === '6dof' && anchor.worldPosition) {
    return (
      <div ref={overlayRef} className="absolute left-0 top-0 z-20 pointer-events-auto" style={{ display: 'none' }}>
        {content}
      </div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.95 }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
          left: `calc(${anchor.x}% + ${driftOffset.x}%)`,
          top: `calc(${anchor.y}% + ${driftOffset.y}%)`,
        }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        className="absolute z-20 -translate-x-1/2 pointer-events-auto"
      >
        {content}
      </motion.div>
    </AnimatePresence>
  );
}
