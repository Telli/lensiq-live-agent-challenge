import React from 'react';
import { Badge } from '../ui/Badge';
import type { TimeTravelSource } from '../../types';

export function TimeTravelSourceLabel({ source }: { source: TimeTravelSource | null }) {
  if (!source) return null;

  return (
    <div className="pointer-events-none absolute right-6 top-12 z-30 max-w-[70vw]">
      <Badge className="flex flex-wrap justify-end gap-1 border-white/10 bg-black/70 px-3 py-1 text-right text-[11px] text-zinc-100 backdrop-blur-md">
        <span>{source.label}</span>
        {source.yearLabel ? <span className="text-zinc-400">• {source.yearLabel}</span> : null}
      </Badge>
    </div>
  );
}
