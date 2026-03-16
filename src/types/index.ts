export * from './place';
export * from './grounding';
export * from './live-session';
export * from './ar';
export * from './time-travel';

import { Citation, PlaceDetails, PlaceSummary } from './place';
import { TranscriptMessage } from './live-session';

export type ExploreMode = 'explain' | 'time-travel' | 'nearby' | 'chat' | 'lab';

export interface CapabilityState {
  database: boolean;
  gemini: boolean;
  places: boolean;
  routes: boolean;
  live: boolean;
  historical: boolean;
  media: boolean;
  auth: boolean;
  storage: boolean;
  limitations: string[];
}

export interface Session {
  id: string;
  createdAt?: string;
  date?: string;
  title?: string;
  thumbnailUrl?: string;
  placesExplored: PlaceSummary[];
  transcript: TranscriptMessage[];
  citations?: Citation[];
  generatedAssetUrls?: string[];
}

export interface SavedPlace extends PlaceSummary {
  savedAt: string;
  notes?: string;
  collection?: string;
  citations?: Citation[];
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export interface AuthSession {
  authenticated: boolean;
  user: UserProfile | null;
}

export interface SessionDetails extends Session {
  placeDetails: PlaceDetails[];
}

export type PlaceFeedbackIssueType =
  | 'wrong_place'
  | 'bad_fact'
  | 'bad_history'
  | 'bad_route'
  | 'other';

export interface PlaceFeedbackPayload {
  issueType: PlaceFeedbackIssueType;
  details: string;
  placeId?: string;
  sessionId?: string;
  context?: Record<string, unknown>;
}

export interface AppState {
  isCameraGranted: boolean;
  isMicGranted: boolean;
  isLocationGranted: boolean;
  hasCompletedOnboarding: boolean;
}
