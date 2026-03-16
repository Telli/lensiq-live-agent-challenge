import React from 'react';
import { AlertCircle } from 'lucide-react';

export function ConfidenceRecoveryCard({ hints }: { hints: string[] }) {
  if (!hints || hints.length === 0) return null;
  
  return (
    <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-xl p-4">
      <h4 className="flex items-center text-sm font-semibold text-indigo-400 mb-2">
        <AlertCircle className="w-4 h-4 mr-2" />
        To improve results:
      </h4>
      <ul className="space-y-1 mt-2">
        {hints.map((hint, i) => (
           <li key={i} className="text-xs text-indigo-200/70 flex items-center">
             <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/50 mr-2" />
             {hint}
           </li>
        ))}
      </ul>
    </div>
  );
}
