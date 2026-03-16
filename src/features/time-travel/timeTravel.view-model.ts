import type { TimeTravelViewModel } from '../../services/orchestrator/orchestrator.types';

export function findTimelineIndex(timeTravel: TimeTravelViewModel | null, eraId: string | null) {
  if (!timeTravel?.timeline.length || !eraId) return 0;
  return Math.max(
    0,
    timeTravel.timeline.findIndex((era) => era.id === eraId),
  );
}

export function buildTimeTravelOverlayViewModel(
  timeTravel: TimeTravelViewModel | null,
  compareReveal: number,
) {
  const activeEra =
    timeTravel?.timeline.find((era) => era.id === timeTravel.selectedEra) || null;

  return {
    isLoading: timeTravel?.status === 'loading',
    isReady: timeTravel?.status === 'ready',
    isError: timeTravel?.status === 'error',
    activeEra,
    overlay: activeEra?.overlay || null,
    sourceLabel: activeEra?.source || null,
    callouts: activeEra?.callouts || [],
    whatChanged: activeEra?.whatChanged || [],
    compareReveal,
    timeline: (timeTravel?.timeline || []).map((era, index) => ({
      id: era.id,
      label: era.label,
      year: era.year,
      index,
      hasVisual: Boolean(era.overlay?.imageUrl || era.asset?.imageUrl),
      isSelected: era.id === timeTravel?.selectedEra,
    })),
    showArchivalTreatment:
      activeEra?.overlay?.style === 'archival' || activeEra?.overlay?.style === 'ghost',
  };
}
