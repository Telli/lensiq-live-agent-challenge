import React from 'react';
import { GroundingDto } from '../../types/grounding';
import { GroundingConfidenceBadge } from './GroundingConfidenceBadge';
import { ChevronRight } from 'lucide-react';

export function GroundingBadgeRow({ grounding, onClick }: { grounding: GroundingDto, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="flex items-center justify-between w-full bg-black/40 border border-white/10 rounded-xl p-3 hover:bg-black/60 transition-colors"
    >
      <div className="flex items-center space-x-3">
        <GroundingConfidenceBadge level={grounding.placeConfidence} score={grounding.placeConfidenceScore} />
        <span className="text-xs text-zinc-400">AI Confidence Metrics</span>
      </div>
      <ChevronRight className="w-4 h-4 text-zinc-500" />
    </button>
  );
}
