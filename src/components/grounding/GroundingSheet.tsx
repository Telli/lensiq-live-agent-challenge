import React from 'react';
import { BottomSheet } from '../ui/BottomSheet';
import { GroundingDto } from '../../types/grounding';
import { ShieldCheck } from 'lucide-react';
import { GroundingSummaryCard } from './GroundingSummaryCard';
import { WhyThisMatchCard } from './WhyThisMatchCard';
import { FactInferenceSplitCard } from './FactInferenceSplitCard';
import { GroundingSignalList } from './GroundingSignalList';
import { ConfidenceRecoveryCard } from './ConfidenceRecoveryCard';

export function GroundingSheet({ isOpen, onClose, grounding }: { isOpen: boolean, onClose: () => void, grounding: GroundingDto | null }) {
  if (!grounding) return null;

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col h-[75vh]">
        <div className="flex items-center space-x-2 mb-6 pb-4 border-b border-zinc-800">
          <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-700">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Grounding & Trust</h2>
            <p className="text-xs text-zinc-500">How LensIQ arrived at this result</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-6 pr-2 scrollbar-hide pb-8">
          <GroundingSummaryCard grounding={grounding} />
          
          <WhyThisMatchCard reason={grounding.whyThisMatch} />
          
          <GroundingSignalList signals={grounding.signals} />
          
          <FactInferenceSplitCard 
            verifiedFacts={grounding.verifiedFacts} 
            inferredClaims={grounding.inferredClaims} 
          />
          
          <ConfidenceRecoveryCard hints={grounding.recoveryHints} />
          
          <div className="pt-4 border-t border-zinc-900">
            <h4 className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Sources</h4>
            <div className="flex flex-wrap gap-2">
              {grounding?.sources?.map((s, i) => (
                 <span key={i} className="px-2 py-1 bg-zinc-900 text-zinc-400 rounded-md text-[10px] border border-zinc-800">
                   {s.name || s}
                 </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}
