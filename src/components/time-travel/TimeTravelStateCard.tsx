import React from 'react';
import { Badge } from '../ui/Badge';
import type { TimeTravelViewModel } from '../../services/orchestrator/orchestrator.types';

export function TimeTravelStateCard({
  timeTravel,
}: {
  timeTravel: TimeTravelViewModel;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/65 p-5 backdrop-blur-xl">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="border-white/10 text-zinc-100">
          {timeTravel.mode === 'place-led' ? 'Place-led history' : 'Scene-led history'}
        </Badge>
        {timeTravel.sourceLabel ? (
          <Badge variant="secondary" className="bg-white/10 text-zinc-100">
            {timeTravel.sourceLabel.label}
          </Badge>
        ) : null}
      </div>
      <h3 className="text-lg font-semibold text-white">{timeTravel.title}</h3>
      {timeTravel.subtitle ? (
        <p className="mt-1 text-sm text-zinc-400">{timeTravel.subtitle}</p>
      ) : null}
      <p className="mt-3 text-sm text-zinc-200">{timeTravel.sceneSummary}</p>
      {!timeTravel.historicalImage ? (
        <p className="mt-3 text-xs text-amber-200/90">
          Visual overlay is not ready for this era yet. LensIQ is showing a source-led summary instead.
        </p>
      ) : null}
      {timeTravel.whatChanged.length ? (
        <div className="mt-4 space-y-2">
          <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">What changed</p>
          {timeTravel.whatChanged.slice(0, 3).map((item) => (
            <p key={item} className="text-sm text-zinc-300">
              {item}
            </p>
          ))}
        </div>
      ) : null}
      {timeTravel.confidenceNote ? (
        <p className="mt-4 text-xs text-zinc-500">{timeTravel.confidenceNote}</p>
      ) : null}
    </div>
  );
}
