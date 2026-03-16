import React from 'react';
import { CheckCircle2, Sparkles } from 'lucide-react';

export function FactInferenceSplitCard({ verifiedFacts, inferredClaims }: { verifiedFacts: string[], inferredClaims: string[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-xl p-4">
        <h4 className="flex items-center text-sm font-semibold text-emerald-400 mb-3">
          <CheckCircle2 className="w-4 h-4 mr-2" />
          Verified Facts
        </h4>
        <ul className="space-y-2">
          {verifiedFacts?.map((fact, i) => (
             <li key={i} className="text-xs text-emerald-100/70 flex items-start">
               <span className="mr-2 opacity-50">•</span>
               {fact}
             </li>
          ))}
        </ul>
      </div>

      <div className="bg-amber-950/20 border border-amber-900/30 rounded-xl p-4">
        <h4 className="flex items-center text-sm font-semibold text-amber-400 mb-3">
          <Sparkles className="w-4 h-4 mr-2" />
          AI Inferences
        </h4>
        <ul className="space-y-2">
          {inferredClaims?.map((claim, i) => (
             <li key={i} className="text-xs text-amber-100/70 flex items-start">
               <span className="mr-2 opacity-50">•</span>
               {claim}
             </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
