import React from 'react';
import { GroundingSignalDto } from '../../types/grounding';
import { GroundingSignalRow } from './GroundingSignalRow';

export function GroundingSignalList({ signals }: { signals: GroundingSignalDto[] }) {
  return (
    <div className="bg-zinc-900/50 rounded-xl border border-white/5 p-4">
      <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Confidence Signals</h4>
      <div className="space-y-1">
        {signals.map((sig, i) => (
          <GroundingSignalRow key={i} signal={sig} />
        ))}
      </div>
    </div>
  );
}
