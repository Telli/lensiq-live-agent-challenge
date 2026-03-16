import type { OrchestratorState } from './orchestrator.types';
import type { PlaceSummary } from '../../types';

export function selectAnchorSecondaryFact(state: OrchestratorState) {
  const place = state.activePlace;
  if (!place) return undefined;
  const selectedEra =
    state.timeTravel?.timeline.find((era) => era.id === state.timeTravel?.selectedEra)?.label;
  const historicalYear =
    selectedEra ||
    place.historicalAssets?.find((asset) => asset.yearLabel)?.yearLabel;
  return historicalYear || place.address || place.distance;
}

export function selectGuideDestination(state: OrchestratorState): PlaceSummary | null {
  if (state.guideDestination) return state.guideDestination;
  if (!state.nearby?.places.length) return null;

  const ranked = [...state.nearby.places].sort((a, b) => {
    const aScore = a.guide?.distanceMeters ?? a.distanceMeters ?? Number.MAX_SAFE_INTEGER;
    const bScore = b.guide?.distanceMeters ?? b.distanceMeters ?? Number.MAX_SAFE_INTEGER;
    return aScore - bScore;
  });

  return ranked[0] || null;
}

export function selectNarrationSummary(state: OrchestratorState) {
  const place = state.activePlace;
  if (!place) return null;
  return (
    place.audioSummary ||
    place.description ||
    place.summary ||
    `You are looking at ${place.name}.`
  );
}

export function selectActiveTimeTravelEra(state: OrchestratorState) {
  if (!state.timeTravel) return null;
  return (
    state.timeTravel.timeline.find((era) => era.id === state.timeTravel?.selectedEra) ||
    null
  );
}

export function selectTimeTravelNarration(state: OrchestratorState) {
  const era = selectActiveTimeTravelEra(state);
  if (!state.timeTravel || !era) return null;

  const subject =
    state.timeTravel.mode === 'scene-led'
      ? state.timeTravel.sceneInference?.sceneSubjects?.[0] ||
        state.timeTravel.sceneInference?.objectCandidates?.[0]?.name ||
        state.timeTravel.sceneInference?.title ||
        state.timeTravel.title ||
        'this view'
      : state.activePlace?.name || state.timeTravel.title || 'this view';
  const change = state.timeTravel.whatChanged[0];
  return [
    `Narrate how ${subject} changed over time.`,
    `Focus on ${era.label}${change ? ` and mention that ${change}` : ''}.`,
    state.timeTravel.sourceLabel?.isReconstruction
      ? 'Be explicit that this view includes AI reconstruction based on historical context.'
      : 'Be explicit about any archival sources when relevant.',
  ].join(' ');
}
