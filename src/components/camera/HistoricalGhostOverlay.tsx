import React from 'react';
import type { HistoricalOverlay } from '../../types';

export function HistoricalGhostOverlay({
  overlay,
  revealPercent,
  archivalTreatment,
}: {
  overlay: HistoricalOverlay | null;
  revealPercent: number;
  archivalTreatment?: boolean;
}) {
  if (!overlay?.imageUrl) return null;

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ clipPath: `inset(0 ${100 - revealPercent}% 0 0)` }}
    >
      <img
        src={overlay.imageUrl}
        alt="Historical reconstruction"
        className="absolute inset-0 h-full w-full object-cover"
        referrerPolicy="no-referrer"
      />
      <div
        className={`absolute inset-0 ${
          archivalTreatment ? 'bg-amber-900/25 mix-blend-color' : 'bg-indigo-900/10 mix-blend-screen'
        }`}
      />
      {archivalTreatment ? (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,248,230,0.15),_transparent_55%)]" />
          <div className="absolute inset-0 opacity-20 mix-blend-soft-light [background-image:radial-gradient(circle,_rgba(255,255,255,0.75)_1px,_transparent_1px)] [background-size:7px_7px]" />
        </>
      ) : null}
    </div>
  );
}
