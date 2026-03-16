import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GroundingDto } from '../../types/grounding';
import { ShieldCheck, Crosshair, Database } from 'lucide-react';
import { Badge } from '../ui/Badge';

export function GroundingOverlayChips({ grounding, onOpenGrounding }: { grounding: GroundingDto | null, onOpenGrounding: () => void }) {
  if (!grounding || !grounding.signals) return null;

  const normalizeLabel = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('visual') || lower.includes('vision')) return 'Vision match';
    if (lower.includes('location') || lower.includes('geo')) return 'Location match';
    if (lower.includes('curated')) return 'Curated source';
    return name;
  };

  const getIconForSignal = (name: string) => {
    if (name.includes('Visual')) return <Crosshair className="w-3 h-3 mr-1" />;
    if (name.includes('Location')) return <ShieldCheck className="w-3 h-3 mr-1" />;
    return <Database className="w-3 h-3 mr-1" />;
  };

  const getConfidenceColor = (strength: string) => {
    if (strength === 'strong') return 'text-emerald-400 border-emerald-500/30 bg-emerald-900/20';
    if (strength === 'moderate') return 'text-amber-400 border-amber-500/30 bg-amber-900/20';
    return 'text-rose-400 border-rose-500/30 bg-rose-900/20';
  };

  return (
    <div className="absolute top-24 right-4 z-20 flex flex-col items-end space-y-2 pointer-events-auto">
      <AnimatePresence>
        {grounding.signals.slice(0, 3).map((sig, i) => (
          <motion.div
            key={sig.name}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ delay: i * 0.1 }}
            onClick={onOpenGrounding}
            className="cursor-pointer"
          >
            <Badge 
              variant="outline" 
              className={`backdrop-blur-md hover:bg-white/10 transition-colors ${getConfidenceColor(sig.strength)}`}
            >
              {getIconForSignal(sig.name)}
              <span className="text-[10px] tracking-wider font-mono">{normalizeLabel(sig.name)}</span>
            </Badge>
          </motion.div>
        ))}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ delay: 0.3 }}
          onClick={onOpenGrounding}
          className="cursor-pointer"
        >
          <Badge
            variant="outline"
            className="backdrop-blur-md border-white/10 bg-white/5 text-white"
          >
            <span className="text-[10px] tracking-wider font-mono">
              Confidence: {grounding.overallConfidence}
            </span>
          </Badge>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
