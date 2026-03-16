import React from 'react';
import { BrainCircuit } from 'lucide-react';

export function WhyThisMatchCard({ reason }: { reason: string }) {
  return (
    <div className="bg-zinc-900/50 rounded-xl border border-white/5 p-4">
      <h4 className="flex items-center text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
        <BrainCircuit className="w-3.5 h-3.5 mr-2" />
        Why This Match?
      </h4>
      <p className="text-sm text-zinc-300 leading-relaxed">
        {reason}
      </p>
    </div>
  );
}
