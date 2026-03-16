import type { CompareCallout } from './ar';
import type { Citation, HistoricalAsset } from './place';

export type TimeTravelMode = 'place-led' | 'scene-led';
export type TimeTravelStatus = 'idle' | 'loading' | 'ready' | 'error';
export type TimeTravelReconstructionMode =
  | 'archival'
  | 'overlay-reconstruction'
  | 'generated-reconstruction';

export interface TimeTravelSource {
  label: string;
  yearLabel?: string;
  provenance?: string;
  url?: string;
  isReconstruction: boolean;
  description?: string;
}

export interface HistoricalOverlayLayer {
  id: string;
  label: string;
  type: 'image' | 'ghost' | 'signage' | 'facade' | 'streetscape';
  imageUrl?: string;
  opacity: number;
  blendMode?: 'normal' | 'screen' | 'multiply' | 'overlay';
}

export interface HistoricalOverlay {
  id: string;
  imageUrl: string | null;
  layers: HistoricalOverlayLayer[];
  style: 'archival' | 'ghost' | 'reconstruction';
  description?: string;
}

export interface TimeTravelCalloutData extends CompareCallout {
  kind: 'verified' | 'context' | 'reconstructed';
  sourceLabel?: string;
  yearLabel?: string;
}

export interface SceneInferenceCandidate {
  name: string;
  reason: string;
  providerPlaceId?: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface SceneInferenceResult {
  title: string;
  district?: string;
  summary: string;
  placeCandidates: SceneInferenceCandidate[];
  sceneSubjects: string[];
  objectCandidates: SceneInferenceCandidate[];
  environmentType?: string;
  architecturalClues: string[];
  streetscapeHints: string[];
  materialClues: string[];
  technologyEraHints: string[];
  eraSuggestions: number[];
  reconstructionHints: string[];
  confidenceNote: string;
  recoveredFrom: string[];
}

export interface TimeTravelEra {
  id: string;
  label: string;
  year: number;
  summary: string;
  asset: HistoricalAsset | null;
  overlay: HistoricalOverlay | null;
  source: TimeTravelSource | null;
  callouts: TimeTravelCalloutData[];
  whatChanged: string[];
  verifiedFacts: string[];
  inferredClaims: string[];
  reconstructedElements: string[];
  citations: Citation[];
  confidenceNote?: string | null;
  reconstructionMode: TimeTravelReconstructionMode | null;
}
