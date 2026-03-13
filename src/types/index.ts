export interface Place {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  category: string;
  distance: string;
  historicalEra?: string;
  historicalImageUrl?: string;
  audioSummary?: string;
  facts: string[];
  didYouKnow: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

export interface Session {
  id: string;
  date: string;
  placesExplored: Place[];
  transcript: TranscriptMessage[];
}

export interface TranscriptMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export interface SavedPlace extends Place {
  savedAt: string;
  notes?: string;
}

export type ExploreMode = 'explain' | 'time-travel' | 'nearby';

export interface AppState {
  isCameraGranted: boolean;
  isMicGranted: boolean;
  isLocationGranted: boolean;
  hasCompletedOnboarding: boolean;
}
