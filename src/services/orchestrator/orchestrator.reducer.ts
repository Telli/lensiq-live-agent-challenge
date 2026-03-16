import type { OrchestratorEvent, OrchestratorState } from './orchestrator.types';
import type { TranscriptMessage } from '../../types';
import type { TimeTravelViewModel } from './orchestrator.types';

function appendTranscript(
  transcript: TranscriptMessage[],
  role: 'user' | 'ai',
  text: string,
) {
  const trimmed = text.trim();
  if (!trimmed) return transcript;
  return [
    ...transcript,
    {
      id: crypto.randomUUID(),
      role,
      text: trimmed,
      timestamp: new Date().toISOString(),
    },
  ];
}

function createEmptyTimeTravel(mode: 'place-led' | 'scene-led' = 'scene-led'): TimeTravelViewModel {
  return {
    status: 'idle',
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

function syncSelectedEra(timeTravel: TimeTravelViewModel, eraId: string) {
  const era =
    timeTravel.timeline.find((candidate) => candidate.id === eraId) ||
    timeTravel.timeline[0] ||
    null;

  return {
    ...timeTravel,
    selectedEra: era?.id || null,
    activeOverlay: era?.overlay || null,
    sourceLabel: era?.source || null,
    callouts: era?.callouts || [],
    whatChanged: era?.whatChanged || [],
    confidenceNote: era?.confidenceNote || null,
    citations: era?.citations || [],
    verifiedFacts: era?.verifiedFacts || [],
    inferredClaims: era?.inferredClaims || [],
    reconstructedElements: era?.reconstructedElements || [],
    reconstructionMode: era?.reconstructionMode || null,
    historicalImage: era?.overlay?.imageUrl || null,
  };
}

export const initialOrchestratorState: OrchestratorState = {
  mode: 'explain',
  activePlace: null,
  latestFrame: null,
  lastKnownLocation: null,
  tracking: null,
  transcript: [],
  partialUserTranscript: null,
  partialAiTranscript: null,
  voiceState: 'idle',
  autoExplain: {
    inFlight: false,
  },
  grounding: null,
  nearby: null,
  timeTravel: null,
  guideDestination: null,
  uiStatusBanner: null,
  error: null,
};

export function orchestratorReducer(
  state: OrchestratorState,
  event: OrchestratorEvent,
): OrchestratorState {
  switch (event.type) {
    case 'FRAME_UPDATED':
      return {
        ...state,
        latestFrame: event.frame,
      };
    case 'LOCATION_UPDATED':
      return {
        ...state,
        lastKnownLocation: {
          latitude: event.latitude,
          longitude: event.longitude,
        },
      };
    case 'TRACKING_UPDATED':
      return {
        ...state,
        tracking: event.tracking,
      };
    case 'MODE_CHANGED':
      return {
        ...state,
        mode: event.mode,
        error: null,
        uiStatusBanner:
          event.mode === 'time-travel'
            ? 'LensIQ is preparing a time-travel view…'
            : event.mode === 'nearby'
              ? 'LensIQ is mapping what is around you…'
              : null,
      };
    case 'LIVE_CONNECTED':
      return {
        ...state,
        voiceState: 'listening',
        uiStatusBanner: null,
      };
    case 'LIVE_DISCONNECTED':
      return {
        ...state,
        voiceState: 'idle',
      };
    case 'LIVE_PARTIAL_TRANSCRIPT':
      return {
        ...state,
        partialUserTranscript: event.text,
        voiceState: 'listening',
        uiStatusBanner: null,
      };
    case 'LIVE_FINAL_TRANSCRIPT':
      return {
        ...state,
        partialUserTranscript: null,
        transcript: appendTranscript(state.transcript, 'user', event.text),
        voiceState: 'thinking',
      };
    case 'LIVE_AI_PARTIAL':
      return {
        ...state,
        partialAiTranscript: event.text,
        voiceState: 'speaking',
        uiStatusBanner: 'LensIQ is speaking…',
      };
    case 'LIVE_AI_FINAL':
      return {
        ...state,
        partialAiTranscript: null,
        transcript: appendTranscript(state.transcript, 'ai', event.text),
        voiceState: 'listening',
        uiStatusBanner: null,
      };
    case 'LIVE_INTERRUPTED':
      return {
        ...state,
        voiceState: 'interrupted',
        uiStatusBanner: 'Interrupted — listening again',
      };
    case 'AUTO_EXPLAIN_TRIGGERED':
      return {
        ...state,
        autoExplain: {
          ...state.autoExplain,
          lastAttemptAt: Date.now(),
          inFlight: true,
        },
        uiStatusBanner: 'LensIQ is analyzing this landmark…',
        error: null,
      };
    case 'EXPLAIN_STARTED':
      return {
        ...state,
        autoExplain: {
          ...state.autoExplain,
          lastAttemptAt: Date.now(),
          inFlight: true,
        },
        voiceState: state.voiceState === 'idle' ? 'thinking' : state.voiceState,
        uiStatusBanner: 'LensIQ is analyzing this landmark…',
      };
    case 'PLACE_LOCKED':
      return {
        ...state,
        activePlace: event.place,
        grounding: event.grounding,
        autoExplain: {
          inFlight: false,
          lastPlaceId: event.place.providerPlaceId || event.place.id,
          lastTriggeredAt: Date.now(),
          lastAttemptAt: state.autoExplain.lastAttemptAt,
          lastErrorAt: undefined,
        },
        uiStatusBanner: null,
        error: null,
      };
    case 'NEARBY_READY':
      return {
        ...state,
        nearby: event.payload,
        uiStatusBanner: null,
      };
    case 'TIME_TRAVEL_READY':
      return {
        ...state,
        timeTravel: event.payload,
        grounding: event.payload.grounding || state.grounding,
        uiStatusBanner: null,
      };
    case 'TIME_TRAVEL_REQUESTED':
      return {
        ...state,
        timeTravel: {
          ...(state.timeTravel || createEmptyTimeTravel(state.activePlace ? 'place-led' : 'scene-led')),
          status: 'loading',
          error: null,
        },
        uiStatusBanner: 'LensIQ is preparing a time-travel view…',
        error: null,
      };
    case 'TIME_TRAVEL_SCENE_INFERENCE_STARTED':
      return {
        ...state,
        timeTravel: {
          ...(state.timeTravel || createEmptyTimeTravel(event.mode)),
          status: 'loading',
          mode: event.mode,
          error: null,
          sceneSummary:
            'Point the camera at a landmark, room, object, or setup. LensIQ will reconstruct how this scene looked in the past.',
        },
        uiStatusBanner: 'LensIQ is analyzing the current scene through time…',
      };
    case 'TIME_TRAVEL_SCENE_INFERENCE_READY':
      return {
        ...state,
        timeTravel: state.timeTravel
          ? {
              ...state.timeTravel,
              mode: event.payload.mode,
              sceneInference: event.payload.scene,
              title:
                event.payload.place?.name ||
                event.payload.scene?.title ||
                state.timeTravel.title,
              subtitle:
                event.payload.place?.category ||
                event.payload.scene?.district ||
                state.timeTravel.subtitle,
              sceneSummary:
                event.payload.place?.summary ||
                event.payload.place?.description ||
                event.payload.scene?.summary ||
                state.timeTravel.sceneSummary,
            }
          : state.timeTravel,
      };
    case 'TIME_TRAVEL_TIMELINE_READY':
      return {
        ...state,
        timeTravel: event.payload,
        grounding: event.payload.grounding || state.grounding,
        uiStatusBanner:
          event.payload.status === 'loading'
            ? 'LensIQ is preparing the selected era…'
            : null,
      };
    case 'TIME_TRAVEL_ERA_CHANGED':
      return {
        ...state,
        timeTravel: state.timeTravel
          ? syncSelectedEra(state.timeTravel, event.eraId)
          : state.timeTravel,
        uiStatusBanner: state.timeTravel?.timeline.find((era) => era.id === event.eraId)
          ? `LensIQ is stepping back to ${state.timeTravel.timeline.find((era) => era.id === event.eraId)?.label}…`
          : state.uiStatusBanner,
      };
    case 'TIME_TRAVEL_OVERLAY_READY':
      return {
        ...state,
        timeTravel: event.payload,
        grounding: event.payload.grounding || state.grounding,
        uiStatusBanner: null,
        error: null,
      };
    case 'TIME_TRAVEL_ERROR':
      return {
        ...state,
        timeTravel: {
          ...(state.timeTravel || createEmptyTimeTravel()),
          status: 'error',
          error: event.message,
        },
        error: event.message,
        uiStatusBanner: event.message,
      };
    case 'GUIDE_DESTINATION_SET':
      return {
        ...state,
        guideDestination: event.place,
        nearby: state.nearby
          ? {
              ...state.nearby,
              selectedDestinationId: event.place?.id || null,
            }
          : state.nearby,
        uiStatusBanner: event.place
          ? `LensIQ is guiding you to ${event.place.name}…`
          : null,
      };
    case 'ERROR':
      return {
        ...state,
        autoExplain: {
          ...state.autoExplain,
          inFlight: false,
          lastErrorAt: Date.now(),
        },
        voiceState: 'error',
        error: event.message,
        uiStatusBanner: event.message,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
        timeTravel: state.timeTravel
          ? {
              ...state.timeTravel,
              error: null,
            }
          : state.timeTravel,
      };
    default:
      return state;
  }
}
