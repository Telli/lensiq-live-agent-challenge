import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AnchoredLabel, TrackingMode, Pose6DOF, ScreenProjection } from '../../types/ar';
import { projectToScreen } from '../../utils/projectionMath';
import { updateTransform } from '../../utils/overlayTransform';
import { Badge } from '../ui/Badge';
import { CheckCircle2, ShieldAlert, Shield } from 'lucide-react';

const DEFAULT_FOV = { horizontal: 60, vertical: 45 };

export function AnchoredPlaceLabel({ 
  label, 
  driftOffset = { x: 0, y: 0 },
  trackingMode = '3dof',
  pose,
  onTap 
}: { 
  label: AnchoredLabel | null;
  driftOffset?: { x: number; y: number };
  trackingMode?: TrackingMode;
  pose?: Pose6DOF | null;
  onTap?: () => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // 6DOF mode: project world position to screen and update via ref mutation
  useEffect(() => {
    if (trackingMode !== '6dof' || !pose || !label?.worldPosition) return;

    const anchor = {
      id: label.title,
      worldPosition: label.worldPosition,
    };

    const projection: ScreenProjection = projectToScreen(anchor, pose, DEFAULT_FOV);
    updateTransform(overlayRef, projection);
  }, [trackingMode, pose, label]);

  if (!label) return null;

  const isHigh = label.confidence === 'high';
  const isMed = label.confidence === 'medium';
  
  const Icon = isHigh ? CheckCircle2 : isMed ? Shield : ShieldAlert;
  const confColor = isHigh ? 'text-emerald-400 border-emerald-500/30' 
                  : isMed ? 'text-amber-400 border-amber-500/30' 
                  : 'text-rose-400 border-rose-500/30';

  // 6DOF mode: render with ref-based positioning (no calc(), no setState)
  if (trackingMode === '6dof' && label.worldPosition) {
    return (
      <div
        ref={overlayRef}
        className="absolute top-0 left-0 z-20 cursor-pointer pointer-events-auto"
        style={{ display: 'none' }}
        onClick={onTap}
      >
        <div className="bg-black/70 backdrop-blur-xl border border-white/10 rounded-2xl p-3 shadow-2xl overflow-hidden min-w-[160px]">
           {/* Subtle glow border top corresponding to confidence */}
           <div className={`absolute top-0 left-0 right-0 h-1 ${isHigh ? 'bg-emerald-500' : isMed ? 'bg-amber-500' : 'bg-rose-500'}`} />
           
           <div className="flex items-center justify-between mb-1">
             <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">{label.subtitle}</span>
             <Badge variant="outline" className={`text-[10px] py-0 px-1.5 h-4 flex items-center bg-black/50 ${confColor}`}>
               <Icon className="w-2.5 h-2.5 mr-1" />
               {label.confidence}
             </Badge>
           </div>
           
           <h3 className="text-white font-bold text-base whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]">{label.title}</h3>
           
           {label.distanceText && (
             <div className="text-xs text-zinc-400 mt-1 flex items-center">
               <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 mr-1.5" />
               {label.distanceText}
             </div>
           )}
        </div>
        
        {/* Pointer Triangle */}
        <div className="absolute top-[-6px] left-6 w-0 h-0 border-l-[6px] border-r-[6px] border-b-[8px] border-l-transparent border-r-transparent border-b-emerald-500" style={{borderBottomColor: isHigh ? '#10b981' : isMed ? '#f59e0b' : '#f43f5e'}} />
      </div>
    );
  }

  // 3DOF mode: existing calc()-based positioning with AnimatePresence
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.9 }}
        animate={{ 
          opacity: 1, 
          y: 0, 
          scale: 1,
          left: `calc(${label.x}% + ${driftOffset.x}%)`,
          top: `calc(${label.y}% + ${driftOffset.y}%)` 
        }}
        exit={{ opacity: 0, y: -10, scale: 0.9 }}
        className="absolute z-20 cursor-pointer pointer-events-auto"
        onClick={onTap}
      >
        <div className="bg-black/70 backdrop-blur-xl border border-white/10 rounded-2xl p-3 shadow-2xl overflow-hidden min-w-[160px]">
           {/* Subtle glow border top corresponding to confidence */}
           <div className={`absolute top-0 left-0 right-0 h-1 ${isHigh ? 'bg-emerald-500' : isMed ? 'bg-amber-500' : 'bg-rose-500'}`} />
           
           <div className="flex items-center justify-between mb-1">
             <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">{label.subtitle}</span>
             <Badge variant="outline" className={`text-[10px] py-0 px-1.5 h-4 flex items-center bg-black/50 ${confColor}`}>
               <Icon className="w-2.5 h-2.5 mr-1" />
               {label.confidence}
             </Badge>
           </div>
           
           <h3 className="text-white font-bold text-base whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]">{label.title}</h3>
           
           {label.distanceText && (
             <div className="text-xs text-zinc-400 mt-1 flex items-center">
               <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 mr-1.5" />
               {label.distanceText}
             </div>
           )}
        </div>
        
        {/* Pointer Triangle */}
        <div className="absolute top-[-6px] left-6 w-0 h-0 border-l-[6px] border-r-[6px] border-b-[8px] border-l-transparent border-r-transparent border-b-emerald-500" style={{borderBottomColor: isHigh ? '#10b981' : isMed ? '#f59e0b' : '#f43f5e'}} />
      </motion.div>
    </AnimatePresence>
  );
}
