import type { CapturedFrame } from '../session/frameStore';
import type {
  Citation,
  ExploreMode,
  GroundingDto,
  HistoricalAsset,
  PlaceDetails,
  PlaceSummary,
  TrackingState,
  TranscriptMessage,
  SceneInferenceResult,
  TimeTravelEra,
  TimeTravelMode,
  TimeTravelReconstructionMode,
  TimeTravelSource,
  HistoricalOverlay,
  TimeTravelCalloutData,
} from '../../types';

export type QuickAction = 'explain' | 'time-travel' | 'guide' | 'nearby';
export type VoiceState =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'interrupted'
  | 'error';

export interface NearbyViewModel {
  places: PlaceSummary[];
  isLoading: boolean;
  error?: string | null;
  selectedDestinationId?: string | null;
}

export interface TimeTravelViewModel {
  status: 'idle' | 'loading' | 'ready' | 'error';
  mode: TimeTravelMode;
  title: string;
  subtitle?: string;
  sceneSummary: string;
  sceneInference: SceneInferenceResult | null;
  selectedEra: string | null;
  timeline: TimeTravelEra[];
  activeOverlay: HistoricalOverlay | null;
  sourceLabel: TimeTravelSource | null;
  callouts: TimeTravelCalloutData[];
  whatChanged: string[];
  confidenceNote: string | null;
  grounding: GroundingDto | null;
  citations: Citation[];
  verifiedFacts: string[];
  inferredClaims: string[];
  reconstructedElements: string[];
  reconstructionMode: TimeTravelReconstructionMode | null;
  historicalImage: string | null;
  assets: HistoricalAsset[];
  canNarrate: boolean;
  error?: string | null;
}

export interface OrchestratorState {
  mode: ExploreMode;
  activePlace: PlaceDetails | null;
  latestFrame: CapturedFrame | null;
  lastKnownLocation: { latitude: number; longitude: number } | null;
  tracking: TrackingState | null;
  transcript: TranscriptMessage[];
  partialUserTranscript: string | null;
  partialAiTranscript: string | null;
  voiceState: VoiceState;
  autoExplain: {
    lastPlaceId?: string;
    lastTriggeredAt?: number;
    lastAttemptAt?: number;
    lastErrorAt?: number;
    inFlight: boolean;
  };
  grounding: GroundingDto | null;
  nearby: NearbyViewModel | null;
  timeTravel: TimeTravelViewModel | null;
  guideDestination: PlaceSummary | null;
  uiStatusBanner?: string | null;
  error?: string | null;
}

export type OrchestratorEvent =
  | { type: 'FRAME_UPDATED'; frame: CapturedFrame; capturedAt: number }
  | { type: 'LOCATION_UPDATED'; latitude: number; longitude: number }
  | { type: 'TRACKING_UPDATED'; tracking: TrackingState }
  | { type: 'MODE_CHANGED'; mode: ExploreMode }
  | { type: 'LIVE_CONNECTED' }
  | { type: 'LIVE_DISCONNECTED' }
  | { type: 'LIVE_PARTIAL_TRANSCRIPT'; text: string }
  | { type: 'LIVE_FINAL_TRANSCRIPT'; text: string }
  | { type: 'LIVE_AI_PARTIAL'; text: string }
  | { type: 'LIVE_AI_FINAL'; text: string }
  | { type: 'LIVE_INTERRUPTED' }
  | { type: 'QUICK_ACTION'; action: QuickAction }
  | { type: 'AUTO_EXPLAIN_TRIGGERED' }
  | { type: 'EXPLAIN_STARTED' }
  | { type: 'PLACE_LOCKED'; place: PlaceDetails; grounding: GroundingDto | null }
  | { type: 'NEARBY_READY'; payload: NearbyViewModel }
  | { type: 'TIME_TRAVEL_REQUESTED' }
  | { type: 'TIME_TRAVEL_SCENE_INFERENCE_STARTED'; mode: TimeTravelMode }
  | {
      type: 'TIME_TRAVEL_SCENE_INFERENCE_READY';
      payload: {
        mode: TimeTravelMode;
        place: PlaceDetails | null;
        scene: SceneInferenceResult | null;
      };
    }
  | { type: 'TIME_TRAVEL_TIMELINE_READY'; payload: TimeTravelViewModel }
  | { type: 'TIME_TRAVEL_ERA_CHANGED'; eraId: string }
  | { type: 'TIME_TRAVEL_OVERLAY_READY'; payload: TimeTravelViewModel }
  | { type: 'TIME_TRAVEL_READY'; payload: TimeTravelViewModel }
  | { type: 'TIME_TRAVEL_ERROR'; message: string }
  | { type: 'GUIDE_DESTINATION_SET'; place: PlaceSummary | null }
  | { type: 'ERROR'; message: string }
  | { type: 'CLEAR_ERROR' };

export type GuideSubstate = 'idle' | 'browse' | 'guiding';
