import React from 'react';
import { Badge } from '../ui/Badge';

export function TimeTravelEraBadge({
  label,
  mode,
}: {
  label?: string | null;
  mode?: 'place-led' | 'scene-led' | null;
}) {
  if (!label) return null;

  return (
    <div className="pointer-events-none absolute left-6 top-12 z-30 flex items-center gap-2">
      <Badge className="border-amber-400 bg-amber-400 text-black shadow-[0_0_30px_rgba(251,191,36,0.45)]">
        {label}
      </Badge>
      {mode ? (
        <Badge className="border-white/10 bg-black/65 text-zinc-100 backdrop-blur-md">
          {mode === 'place-led' ? 'Place-led' : 'Scene-led'}
        </Badge>
      ) : null}
    </div>
  );
}
