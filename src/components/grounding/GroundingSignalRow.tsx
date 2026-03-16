import React from 'react';
import { GroundingSignalDto } from '../../types/grounding';

export function GroundingSignalRow({ signal, key }: { signal: GroundingSignalDto, key?: React.Key }) {
  const getStrengthColor = (s: string) => {
    if (s === 'strong') return 'bg-emerald-500';
    if (s === 'moderate') return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex items-start justify-between py-2 border-b border-white/5 last:border-0">
      <div className="flex flex-col">
        <span className="text-sm font-medium text-zinc-200">{signal.name}</span>
        <span className="text-xs text-zinc-500">{signal.description}</span>
      </div>
      <div className="flex items-center space-x-2">
        <div className="flex space-x-0.5">
          <div className={`w-1.5 h-3 rounded-sm ${signal.strength === 'weak' ? getStrengthColor(signal.strength) : 'bg-zinc-700'}`} />
          <div className={`w-1.5 h-4 rounded-sm ${signal.strength === 'moderate' || signal.strength === 'strong' ? getStrengthColor(signal.strength) : 'bg-zinc-700'}`} />
          <div className={`w-1.5 h-5 rounded-sm ${signal.strength === 'strong' ? getStrengthColor(signal.strength) : 'bg-zinc-700'}`} />
        </div>
        <span className="text-xs font-mono text-zinc-400 w-8 text-right">
          {Math.round(signal.value * 100)}
        </span>
      </div>
    </div>
  );
}
