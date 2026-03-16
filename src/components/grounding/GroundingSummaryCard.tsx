import React from 'react';
import { GroundingDto } from '../../types/grounding';

export function GroundingSummaryCard({ grounding }: { grounding: GroundingDto }) {
  return (
    <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800">
      <div className="flex justify-between items-start mb-2">
         <span className="text-xs text-zinc-500 font-mono tracking-wider">OVERALL CONFIDENCE</span>
         <span className="text-lg font-bold text-white">{Math.round(grounding.overallScore * 100)}%</span>
      </div>
      <p className="text-xs text-zinc-600 italic">
        {grounding.disclaimer}
      </p>
    </div>
  );
}
