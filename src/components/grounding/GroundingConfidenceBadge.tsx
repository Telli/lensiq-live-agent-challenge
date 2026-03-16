import React from 'react';
import { ShieldCheck, ShieldAlert, Shield } from 'lucide-react';
import { ConfidenceLevel } from '../../types/grounding';
import { Badge } from '../ui/Badge';

export function GroundingConfidenceBadge({ level, score }: { level: ConfidenceLevel, score: number }) {
  const isHigh = level === 'high';
  const isMed = level === 'medium';
  
  const Icon = isHigh ? ShieldCheck : isMed ? Shield : ShieldAlert;
  const colorClass = isHigh ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                   : isMed ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' 
                   : 'bg-red-500/20 text-red-400 border-red-500/30';
                   
  return (
    <Badge className={`flex items-center space-x-1 backdrop-blur-md ${colorClass}`}>
      <Icon className="w-3 h-3" />
      <span>{Math.round(score * 100)}% Match</span>
    </Badge>
  );
}
