import type {
  CapabilityState,
  Coordinates,
  PlaceDetails,
  PlaceSummary,
  SceneInferenceResult,
  TimeTravelEra,
  TimeTravelMode,
} from '../../types';
import { explainService } from '../explore/explain.service';
import { sceneInferenceService } from '../history/sceneInference.service';
import { sceneReconstructionService } from '../history/sceneReconstruction.service';
import { timeTravelService } from '../history/timeTravel.service';
import { buildTimeTravelGrounding } from '../history/timeTravel.mapper';
import { buildTimeTravelTimeline } from '../history/timeTravelTimeline.service';
import { nearbyService } from '../places/nearby.service';
import {
  selectGuideDestination,
  selectNarrationSummary,
  selectTimeTravelNarration,
} from './selectors';
import type {
  NearbyViewModel,
  OrchestratorEvent,
  OrchestratorState,
  TimeTravelViewModel,
} from './orchestrator.types';

export interface OrchestratorContext {
  capabilities: CapabilityState | null;
  live: {
    connect: () => Promise<void> | void;
    disconnect: () => void;
    sendTextCommand: (text: string) => void;
    interrupt: () => void;
    connectionState: string;
  };
}

interface EffectArgs {
  event: OrchestratorEvent;
  state: OrchestratorState;
  getState: () => OrchestratorState;
  dispatch: (event: OrchestratorEvent) => void;
  context: OrchestratorContext;
}

const SCENE_INFERENCE_TIMEOUT_MS = 12000;
const PLACE_RESOLVE_TIMEOUT_MS = 5000;
const HISTORY_TIMEOUT_MS = 8000;
const HYDRATION_TIMEOUT_MS = 18000;

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  errorMessage: string,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(errorMessage)), ms);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

function hasUserConversation(state: OrchestratorState) {
  return (
    state.transcript.some((message) => message.role === 'user') ||
    Boolean(state.partialUserTranscript)
  );
}

function buildGreetingPrompt() {
  return 'You are LensIQ. Greet the user in one short spoken sentence and invite them to ask about what they see around them.';
}

function buildNarrationPrompt(place: PlaceDetails) {
  const summary = place.audioSummary || place.summary || place.description || place.name;
  return `You are LensIQ. In two short spoken sentences, explain this landmark naturally for an on-camera demo. Place: ${place.name}. Category: ${place.category}. Summary: ${summary}`;
}

function buildGuidePrompt(place: PlaceSummary) {
  const eta = place.guide?.durationText || place.durationText || 'a short walk';
  const distance = place.guide?.distanceText || place.distance || 'nearby';
  const mapsHint = place.guide?.deepLinkUrl
    ? 'Mention that a route is ready in maps if the user wants to open it.'
    : '';
  return `You are LensIQ. Give a short spoken guidance update for ${place.name}. Category: ${place.category}. Distance: ${distance}. ETA: ${eta}. Summary: ${place.summary || 'No extra summary.'} ${mapsHint}`;
}

function shouldAttemptPlaceResolution(scene: SceneInferenceResult) {
  const environment = String(scene.environmentType || '').toLowerCase();
  const interiorLike =
    /(workstation|office|home desk|interior|studio|desk|room)/.test(environment);
  const hasStrongObjectLead =
    scene.objectCandidates.some((candidate) => candidate.confidence === 'high') ||
    scene.sceneSubjects.some((subject) =>
      /(workstation|monitor|desk|setup|studio|computer|terminal|display)/i.test(subject),
    );
  const hasStrongPlaceLead = scene.placeCandidates.some(
    (candidate) => candidate.confidence === 'high',
  );

  if (interiorLike || hasStrongObjectLead) {
    return false;
  }

  return hasStrongPlaceLead;
}

function buildTimeTravelFallbackSummary(
  model: TimeTravelViewModel,
  place: PlaceDetails | null,
) {
  const era =
    model.timeline.find((candidate) => candidate.id === model.selectedEra) || null;
  const subject =
    place?.name ||
    model.sceneInference?.sceneSubjects?.[0] ||
    model.sceneInference?.objectCandidates?.[0]?.name ||
    model.sceneInference?.title ||
    'this view';
  const change = model.whatChanged[0];

  return [
    `${subject} in ${era?.label || 'the past'}.`,
    change || model.sceneSummary,
    model.sourceLabel?.isReconstruction
      ? 'This view includes AI reconstruction based on historical context.'
      : '',
  ]
    .filter(Boolean)
    .join(' ');
}

function buildFallbackSceneInference(
  state: OrchestratorState,
  nearbyCandidates: PlaceSummary[] = [],
): SceneInferenceResult {
  const subject =
    state.activePlace?.name ||
    nearbyCandidates[0]?.name ||
    'Current scene';
  const environmentType = nearbyCandidates.some((candidate) =>
    /office|workspace|store|museum|gallery|cafe/i.test(candidate.category),
  )
    ? 'interior'
    : 'scene';

  return {
    title: subject,
    district: state.activePlace?.address,
    summary:
      state.activePlace?.summary ||
      state.activePlace?.description ||
      `LensIQ is using the live camera view${state.lastKnownLocation ? ' and location context' : ''} to reconstruct this scene through time.`,
    placeCandidates: nearbyCandidates.slice(0, 3).map((candidate) => ({
      name: candidate.name,
      reason: 'Nearby place candidate from the current location.',
      providerPlaceId: candidate.providerPlaceId,
      confidence: 'medium' as const,
    })),
    sceneSubjects: [subject],
    objectCandidates: [],
    environmentType,
    architecturalClues: state.activePlace?.architecture ? [state.activePlace.architecture] : [],
    streetscapeHints: state.activePlace?.category ? [state.activePlace.category] : [],
    materialClues: [],
    technologyEraHints: [],
    eraSuggestions: [],
    reconstructionHints: [
      'Keep the visible geometry and camera framing stable.',
      'Favor conservative historical substitutions over fully new viewpoints.',
    ],
    confidenceNote:
      'LensIQ fell back to a broad scene-level interpretation because a stronger historical match was not ready in time.',
    recoveredFrom: [
      'vision',
      ...(state.lastKnownLocation ? ['location'] : []),
      ...(nearbyCandidates.length ? ['nearby candidates'] : []),
    ],
  };
}

function buildTimeTravelEmptyModel(mode: TimeTravelMode): TimeTravelViewModel {
  return {
    status: 'loading',
    mode,
    title: 'Time travel this view',
    subtitle: mode === 'place-led' ? 'Historical reconstruction' : 'Scene-led reconstruction',
    sceneSummary:
      'Point the camera at a landmark, room, object, or setup. LensIQ will reconstruct how this scene looked in the past.',
    sceneInference: null,
    selectedEra: null,
    timeline: [],
    activeOverlay: null,
    sourceLabel: null,
    callouts: [],
    whatChanged: [],
    confidenceNote: null,
    grounding: null,
    citations: [],
    verifiedFacts: [],
    inferredClaims: [],
    reconstructedElements: [],
    reconstructionMode: null,
    historicalImage: null,
    assets: [],
    canNarrate: false,
    error: null,
  };
}

function buildTimeTravelModel(params: {
  mode: TimeTravelMode;
  title: string;
  subtitle?: string;
  sceneSummary: string;
  sceneInference: SceneInferenceResult | null;
  timeline: TimeTravelEra[];
  selectedEra: string;
  grounding?: TimeTravelViewModel['grounding'];
  status?: TimeTravelViewModel['status'];
}): TimeTravelViewModel {
  const selected =
    params.timeline.find((candidate) => candidate.id === params.selectedEra) ||
    params.timeline[0] ||
    null;

  return {
    status: params.status || 'ready',
    mode: params.mode,
    title: params.title,
    subtitle: params.subtitle,
    sceneSummary: params.sceneSummary,
    sceneInference: params.sceneInference,
    selectedEra: selected?.id || null,
    timeline: params.timeline,
    activeOverlay: selected?.overlay || null,
    sourceLabel: selected?.source || null,
    callouts: selected?.callouts || [],
    whatChanged: selected?.whatChanged || [],
    confidenceNote: selected?.confidenceNote || null,
    grounding: params.grounding || null,
    citations: selected?.citations || [],
    verifiedFacts: selected?.verifiedFacts || [],
    inferredClaims: selected?.inferredClaims || [],
    reconstructedElements: selected?.reconstructedElements || [],
    reconstructionMode: selected?.reconstructionMode || null,
    historicalImage: selected?.overlay?.imageUrl || null,
    assets: params.timeline
      .map((era) => era.asset)
      .filter((asset): asset is NonNullable<typeof asset> => Boolean(asset)),
    canNarrate: Boolean(selected && selected.year < new Date().getFullYear()),
    error: null,
  };
}

function finalizeTimeTravelModel(
  model: TimeTravelViewModel,
  state: OrchestratorState,
): TimeTravelViewModel {
  const era =
    model.timeline.find((candidate) => candidate.id === model.selectedEra) ||
    model.timeline[0] ||
    null;

  if (!era) {
    return {
      ...model,
      status: 'ready',
      error: null,
    };
  }

  const grounding = buildTimeTravelGrounding({
    mode: model.mode,
    place: state.activePlace,
    scene: model.sceneInference,
    citations: era.citations,
    verifiedFacts: era.verifiedFacts,
    inferredClaims: era.inferredClaims,
    reconstructedElements: era.reconstructedElements,
    source: era.source,
  });

  return buildTimeTravelModel({
    mode: model.mode,
    title: model.title,
    subtitle: model.subtitle,
    sceneSummary: model.sceneSummary,
    sceneInference: model.sceneInference,
    timeline: model.timeline,
    selectedEra: era.id,
    grounding,
    status: 'ready',
  });
}

function createCoordinates(
  state: OrchestratorState,
): Coordinates | undefined {
  return state.lastKnownLocation
    ? {
        lat: state.lastKnownLocation.latitude,
        lng: state.lastKnownLocation.longitude,
      }
    : undefined;
}

function buildSceneFromPlace(place: PlaceDetails): SceneInferenceResult {
  return {
    title: place.name,
    district: place.address,
    summary: place.summary || place.description || `Historical view of ${place.name}.`,
    placeCandidates: [
      {
        name: place.name,
        reason: 'Anchored to the currently active place.',
        providerPlaceId: place.providerPlaceId,
        confidence: 'high',
      },
    ],
    sceneSubjects: [place.name],
    objectCandidates: [],
    environmentType: place.category,
    architecturalClues: place.architecture ? [place.architecture] : [],
    streetscapeHints: [place.category],
    materialClues: [],
    technologyEraHints: [],
    eraSuggestions:
      place.historicalPeriods?.map((period) => period.yearStart).slice(0, 4) || [],
    reconstructionHints: [
      'Preserve the current facade alignment.',
      'Keep the street geometry consistent with the live camera view.',
    ],
    confidenceNote: 'Historical mode is anchored to the active landmark.',
    recoveredFrom: ['vision', 'historical dataset'],
  };
}

async function fetchNearby(
  state: OrchestratorState,
  dispatch: EffectArgs['dispatch'],
) {
  const location = state.lastKnownLocation;
  if (!location) {
    dispatch({ type: 'ERROR', message: 'Location is unavailable for nearby guidance.' });
    return;
  }

  dispatch({
    type: 'NEARBY_READY',
    payload: {
      places: state.nearby?.places || [],
      isLoading: true,
      error: null,
      selectedDestinationId: state.nearby?.selectedDestinationId || null,
    },
  });

  try {
    const places = await nearbyService.getNearbyAttractions(location.latitude, location.longitude);
    const payload: NearbyViewModel = {
      places,
      isLoading: false,
      error: null,
      selectedDestinationId: state.nearby?.selectedDestinationId || null,
    };
    dispatch({ type: 'NEARBY_READY', payload });
  } catch (error) {
    dispatch({
      type: 'ERROR',
      message: error instanceof Error ? error.message : 'Failed to load nearby places',
    });
  }
}

async function ensureNearbyCandidates(state: OrchestratorState) {
  if (state.nearby?.places.length) {
    return state.nearby.places;
  }
  if (!state.lastKnownLocation) {
    return [] as PlaceSummary[];
  }

  try {
    return await nearbyService.getNearbyAttractions(
      state.lastKnownLocation.latitude,
      state.lastKnownLocation.longitude,
    );
  } catch {
    return [] as PlaceSummary[];
  }
}

async function hydrateTimeTravelModel(
  model: TimeTravelViewModel,
  state: OrchestratorState,
  context: OrchestratorContext,
) {
  const era =
    model.timeline.find((candidate) => candidate.id === model.selectedEra) || null;

  if (!era) {
    return model;
  }

  if (era.year >= new Date().getFullYear()) {
    const grounding = buildTimeTravelGrounding({
      mode: model.mode,
      place: state.activePlace,
      scene: model.sceneInference,
      citations: era.citations,
      verifiedFacts: era.verifiedFacts,
      inferredClaims: era.inferredClaims,
      reconstructedElements: era.reconstructedElements,
      source: era.source,
    });

    return buildTimeTravelModel({
      mode: model.mode,
      title: model.title,
      subtitle: model.subtitle,
      sceneSummary: model.sceneSummary,
      sceneInference: model.sceneInference,
      timeline: model.timeline,
      selectedEra: era.id,
      grounding,
      status: 'ready',
    });
  }

  const hydratedEra = await sceneReconstructionService.hydrateEra({
    era,
    place: state.activePlace,
    scene: model.sceneInference,
    frame: state.latestFrame,
    capabilities: context.capabilities,
    citations: era.citations.length ? era.citations : model.citations,
  });

  const timeline = model.timeline.map((candidate) =>
    candidate.id === hydratedEra.id ? hydratedEra : candidate,
  );

  const grounding = buildTimeTravelGrounding({
    mode: model.mode,
    place: state.activePlace,
    scene: model.sceneInference,
    citations: hydratedEra.citations,
    verifiedFacts: hydratedEra.verifiedFacts,
    inferredClaims: hydratedEra.inferredClaims,
    reconstructedElements: hydratedEra.reconstructedElements,
    source: hydratedEra.source,
  });

  return buildTimeTravelModel({
    mode: model.mode,
    title: model.title,
    subtitle: model.subtitle,
    sceneSummary: model.sceneSummary,
    sceneInference: model.sceneInference,
    timeline,
    selectedEra: hydratedEra.id,
    grounding,
    status: 'ready',
  });
}

async function hydrateTimeTravelModelSafely(
  model: TimeTravelViewModel,
  state: OrchestratorState,
  context: OrchestratorContext,
) {
  try {
    const hydrated = await withTimeout(
      hydrateTimeTravelModel(model, state, context),
      HYDRATION_TIMEOUT_MS,
      'Historical reconstruction took too long.',
    );
    return hydrated;
  } catch {
    return {
      ...finalizeTimeTravelModel(model, state),
      confidenceNote:
        model.confidenceNote ||
        'LensIQ could not finish rendering the historical overlay in time, so this era is shown as a source-led summary.',
    };
  }
}

async function narrateTimeTravel(
  state: OrchestratorState,
  model: TimeTravelViewModel,
  dispatch: EffectArgs['dispatch'],
  context: OrchestratorContext,
) {
  if (!model.canNarrate) {
    return;
  }

  const narrationPrompt = selectTimeTravelNarration({
    ...state,
    timeTravel: model,
  });
  if (!narrationPrompt) {
    return;
  }

  if (context.capabilities?.live && context.live.connectionState !== 'idle') {
    context.live.sendTextCommand(narrationPrompt);
    return;
  }

  dispatch({
    type: 'LIVE_AI_FINAL',
    text: buildTimeTravelFallbackSummary(model, state.activePlace),
  });
}

function dispatchTimeTravelFailure(
  dispatch: EffectArgs['dispatch'],
  error: unknown,
  fallbackMessage: string,
) {
  dispatch({
    type: 'TIME_TRAVEL_ERROR',
    message: error instanceof Error ? error.message : fallbackMessage,
  });
}

function getNarrationPlace(
  mode: TimeTravelMode,
  currentPlace: PlaceDetails | null,
  resolvedPlace: PlaceDetails | null,
) {
  return mode === 'place-led' ? resolvedPlace || currentPlace : currentPlace;
}

async function requestTimeTravel(
  state: OrchestratorState,
  dispatch: EffectArgs['dispatch'],
  context: OrchestratorContext,
) {
  const mode: TimeTravelMode =
    state.activePlace && state.grounding?.placeConfidence !== 'low'
      ? 'place-led'
      : 'scene-led';

  dispatch({ type: 'TIME_TRAVEL_REQUESTED' });
  dispatch({ type: 'TIME_TRAVEL_SCENE_INFERENCE_STARTED', mode });

  if (!state.latestFrame?.data && !state.activePlace) {
    dispatch({
      type: 'TIME_TRAVEL_ERROR',
      message:
        'Point the camera at a landmark, room, object, or setup. LensIQ will reconstruct how this scene looked in the past.',
    });
    return;
  }

  let place: PlaceDetails | null = state.activePlace;
  let scene: SceneInferenceResult | null = null;
  let assets: TimeTravelViewModel['assets'] = [];
  let citations: TimeTravelViewModel['citations'] = [];
  const nearbyCandidates = await ensureNearbyCandidates(state);

  if (mode === 'place-led' && place) {
    scene = buildSceneFromPlace(place);
    try {
      const history = await withTimeout(
        timeTravelService.getHistoricalAssets(place.providerPlaceId || place.id),
        HISTORY_TIMEOUT_MS,
        'Historical place assets took too long to load.',
      );
      assets = history.assets || [];
      citations = history.citations || [];
    } catch {
      // If place-specific history fails, the rest of the flow still works with scene inference.
    }
  }

  if (!scene && state.latestFrame) {
    try {
      scene = await withTimeout(
        sceneInferenceService.inferScene({
          frame: state.latestFrame,
          location: state.lastKnownLocation,
          headingDegrees: state.tracking?.headingDegrees,
          nearbyCandidates,
          activePlace: state.activePlace,
        }),
        SCENE_INFERENCE_TIMEOUT_MS,
        'Scene inference took too long.',
      );
    } catch {
      scene = buildFallbackSceneInference(state, nearbyCandidates);
    }

    if (!place && shouldAttemptPlaceResolution(scene)) {
      const resolutionCandidates = [
        ...scene.placeCandidates,
        ...scene.objectCandidates,
      ].slice(0, 4);

      for (const candidate of resolutionCandidates) {
        try {
          place = await withTimeout(
            timeTravelService.resolvePlace(
              candidate.name,
              createCoordinates(state),
            ),
            PLACE_RESOLVE_TIMEOUT_MS,
            'Place resolution took too long.',
          );
          if (place) {
            break;
          }
        } catch {
          // Keep the scene-led flow alive even if place resolution fails.
        }
      }
    }

    if (place?.providerPlaceId) {
      try {
        const history = await withTimeout(
          timeTravelService.getHistoricalAssets(place.providerPlaceId || place.id),
          HISTORY_TIMEOUT_MS,
          'Historical assets took too long to load.',
        );
        assets = history.assets || [];
        citations = history.citations || [];
      } catch {
        // Scene-led flow can continue without landmark history.
      }
    }
  }

  scene = scene || buildFallbackSceneInference(state, nearbyCandidates);

  dispatch({
    type: 'TIME_TRAVEL_SCENE_INFERENCE_READY',
    payload: {
      mode,
      place: mode === 'place-led' ? place : null,
      scene,
    },
  });

  const timelineData = buildTimeTravelTimeline({
    mode,
    place,
    scene,
    assets,
    citations,
  });

  const baseModel = buildTimeTravelModel({
    mode,
    title: timelineData.title,
    subtitle: timelineData.subtitle,
    sceneSummary: timelineData.sceneSummary,
    sceneInference: scene,
    timeline: timelineData.timeline,
    selectedEra: timelineData.selectedEraId,
    grounding: null,
    status: 'loading',
  });

  dispatch({ type: 'TIME_TRAVEL_TIMELINE_READY', payload: baseModel });

  const hydratedModel = await hydrateTimeTravelModelSafely(
    baseModel,
    {
      ...state,
      activePlace: place,
    },
    context,
  );

  dispatch({ type: 'TIME_TRAVEL_OVERLAY_READY', payload: hydratedModel });
  await narrateTimeTravel(
    {
      ...state,
      activePlace: getNarrationPlace(mode, state.activePlace, place),
      timeTravel: hydratedModel,
    },
    hydratedModel,
    dispatch,
    context,
  );
}

async function updateTimeTravelEra(
  state: OrchestratorState,
  eraId: string,
  dispatch: EffectArgs['dispatch'],
  context: OrchestratorContext,
) {
  const timeTravel = state.timeTravel;
  if (!timeTravel) {
    return;
  }

  const era = timeTravel.timeline.find((candidate) => candidate.id === eraId);
  if (!era) {
    return;
  }

  if (era.overlay || era.year >= new Date().getFullYear()) {
    const synced = buildTimeTravelModel({
      mode: timeTravel.mode,
      title: timeTravel.title,
      subtitle: timeTravel.subtitle,
      sceneSummary: timeTravel.sceneSummary,
      sceneInference: timeTravel.sceneInference,
      timeline: timeTravel.timeline,
      selectedEra: eraId,
      grounding: timeTravel.grounding,
      status: 'ready',
    });
    dispatch({ type: 'TIME_TRAVEL_OVERLAY_READY', payload: synced });
    await narrateTimeTravel(
      {
        ...state,
        timeTravel: synced,
      },
      synced,
      dispatch,
      context,
    );
    return;
  }

  const loadingModel = buildTimeTravelModel({
    mode: timeTravel.mode,
    title: timeTravel.title,
    subtitle: timeTravel.subtitle,
    sceneSummary: timeTravel.sceneSummary,
    sceneInference: timeTravel.sceneInference,
    timeline: timeTravel.timeline,
    selectedEra: eraId,
    grounding: timeTravel.grounding,
    status: 'loading',
  });
  dispatch({ type: 'TIME_TRAVEL_TIMELINE_READY', payload: loadingModel });

  const hydratedModel = await hydrateTimeTravelModelSafely(
    loadingModel,
    state,
    context,
  );
  dispatch({ type: 'TIME_TRAVEL_OVERLAY_READY', payload: hydratedModel });
  await narrateTimeTravel(
    {
      ...state,
      timeTravel: hydratedModel,
    },
    hydratedModel,
    dispatch,
    context,
  );
}

export async function runOrchestratorEffects({
  event,
  state,
  getState,
  dispatch,
  context,
}: EffectArgs) {
  switch (event.type) {
    case 'LIVE_CONNECTED': {
      const current = getState();
      if (!current.transcript.length && !current.activePlace) {
        context.live.sendTextCommand(buildGreetingPrompt());
      }
      return;
    }
    case 'MODE_CHANGED': {
      if (
        event.mode === 'explain' &&
        context.capabilities?.live &&
        context.live.connectionState === 'idle'
      ) {
        await context.live.connect();
      }

      if (event.mode === 'nearby' && getState().lastKnownLocation) {
        await fetchNearby(getState(), dispatch);
      }

      if (event.mode === 'time-travel') {
        try {
          await requestTimeTravel(getState(), dispatch, context);
        } catch (error) {
          dispatchTimeTravelFailure(
            dispatch,
            error,
            'LensIQ could not reconstruct this scene yet.',
          );
        }
      }
      return;
    }
    case 'QUICK_ACTION': {
      if (event.action === 'explain') {
        dispatch({ type: 'MODE_CHANGED', mode: 'explain' });
        if (!getState().activePlace) {
          dispatch({ type: 'AUTO_EXPLAIN_TRIGGERED' });
        } else {
          const current = getState();
          const summary = selectNarrationSummary(current);
          if (summary && current.activePlace) {
            if (context.capabilities?.live && context.live.connectionState !== 'idle') {
              context.live.sendTextCommand(buildNarrationPrompt(current.activePlace));
            } else {
              dispatch({ type: 'LIVE_AI_FINAL', text: summary });
            }
          }
        }
        return;
      }

      if (event.action === 'time-travel') {
        dispatch({ type: 'MODE_CHANGED', mode: 'time-travel' });
        return;
      }

      if (event.action === 'nearby') {
        dispatch({ type: 'MODE_CHANGED', mode: 'nearby' });
        return;
      }

      dispatch({ type: 'MODE_CHANGED', mode: 'nearby' });
      const current = getState();
      if (!current.nearby?.places.length && current.lastKnownLocation) {
        await fetchNearby(current, dispatch);
      }
      dispatch({ type: 'GUIDE_DESTINATION_SET', place: selectGuideDestination(getState()) });
      return;
    }
    case 'AUTO_EXPLAIN_TRIGGERED': {
      const current = getState();
      if (!current.latestFrame?.data) {
        dispatch({ type: 'ERROR', message: 'No camera frame is available yet.' });
        return;
      }

      dispatch({ type: 'EXPLAIN_STARTED' });

      const coordinates = createCoordinates(current);

      try {
        const place = await explainService.explainScene(
          current.latestFrame.data,
          coordinates,
          'Identify this place and explain why it matters.',
        );
        dispatch({ type: 'PLACE_LOCKED', place, grounding: place.grounding || null });
      } catch (error) {
        dispatch({
          type: 'ERROR',
          message: error instanceof Error ? error.message : 'Explain failed',
        });
      }
      return;
    }
    case 'PLACE_LOCKED': {
      if (getState().mode !== 'explain') {
        return;
      }

      const current = getState();
      if (
        context.capabilities?.live &&
        context.live.connectionState !== 'idle' &&
        !hasUserConversation(current)
      ) {
        context.live.sendTextCommand(buildNarrationPrompt(event.place));
      } else if (context.live.connectionState === 'idle') {
        const summary =
          event.place.audioSummary ||
          event.place.description ||
          event.place.summary ||
          `You are looking at ${event.place.name}.`;
        dispatch({ type: 'LIVE_AI_FINAL', text: summary });
      }
      return;
    }
    case 'GUIDE_DESTINATION_SET': {
      if (!event.place) {
        return;
      }

      if (context.capabilities?.live) {
        if (context.live.connectionState === 'idle') {
          await context.live.connect();
        }
        context.live.sendTextCommand(buildGuidePrompt(event.place));
      } else {
        const eta = event.place.guide?.durationText || event.place.durationText || 'nearby';
        const distance = event.place.guide?.distanceText || event.place.distance || 'nearby';
        dispatch({
          type: 'LIVE_AI_FINAL',
          text: `${event.place.name} is ${distance} away, about ${eta}. ${event.place.summary || ''}`.trim(),
        });
      }
      return;
    }
    case 'TIME_TRAVEL_REQUESTED': {
      try {
        await requestTimeTravel(getState(), dispatch, context);
      } catch (error) {
        dispatchTimeTravelFailure(
          dispatch,
          error,
          'LensIQ could not reconstruct this scene yet.',
        );
      }
      return;
    }
    case 'TIME_TRAVEL_ERA_CHANGED': {
      try {
        await updateTimeTravelEra(getState(), event.eraId, dispatch, context);
      } catch (error) {
        dispatchTimeTravelFailure(
          dispatch,
          error,
          'LensIQ could not switch historical eras just now.',
        );
      }
      return;
    }
    default:
      return;
  }
}
