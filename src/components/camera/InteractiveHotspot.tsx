import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HotspotRegion, TrackingMode, Pose6DOF, ScreenProjection } from '../../types/ar';
import { projectToScreen } from '../../utils/projectionMath';
import { updateTransform } from '../../utils/overlayTransform';
import { BookOpen, History, Info } from 'lucide-react';

const DEFAULT_FOV = { horizontal: 60, vertical: 45 };

export function InteractiveHotspot({
  hotspot,
  onClick,
  trackingMode = '3dof',
  pose,
  key,
}: {
  hotspot: HotspotRegion;
  onClick: () => void;
  trackingMode?: TrackingMode;
  pose?: Pose6DOF | null;
  key?: React.Key;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // 6DOF mode: project world position to screen and update via ref mutation
  useEffect(() => {
    if (trackingMode !== '6dof' || !pose || !hotspot.worldPosition) return;

    const anchor = {
      id: hotspot.id,
      worldPosition: hotspot.worldPosition,
    };

    const projection: ScreenProjection = projectToScreen(anchor, pose, DEFAULT_FOV);
    updateTransform(overlayRef, projection);
  }, [trackingMode, pose, hotspot]);

  const getIcon = () => {
    switch (hotspot.kind) {
      case 'history': return <History className="w-3 h-3 text-amber-400" />;
      case 'explain': return <BookOpen className="w-3 h-3 text-indigo-400" />;
      default: return <Info className="w-3 h-3 text-teal-400" />;
    }
  };

  const hotspotContent = (
    <div className="relative group">
      {/* Pulsing ring */}
      <div className="absolute inset-0 rounded-full animate-ping bg-white/30" />
      
      {/* Core button */}
      <div className="relative w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg group-hover:bg-black/80 transition-colors">
        {getIcon()}
      </div>
      
      {/* Reveal label on hover/active */}
      <div className="absolute left-1/2 -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 backdrop-blur-md px-2 py-1 rounded text-[10px] whitespace-nowrap text-white font-medium border border-white/10 pointer-events-none">
        {hotspot.label}
      </div>
    </div>
  );

  // 6DOF mode: render with ref-based positioning (no calc(), no setState)
  if (trackingMode === '6dof' && hotspot.worldPosition) {
    return (
      <div
        ref={overlayRef}
        className="absolute top-0 left-0 z-20 cursor-pointer pointer-events-auto"
        style={{ display: 'none' }}
        onClick={onClick}
      >
        {hotspotContent}
      </div>
    );
  }

  // 3DOF mode: existing percentage-based positioning with AnimatePresence
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }}
        className="absolute z-20 cursor-pointer pointer-events-auto"
        onClick={onClick}
      >
        {hotspotContent}
      </motion.div>
    </AnimatePresence>
  );
}
