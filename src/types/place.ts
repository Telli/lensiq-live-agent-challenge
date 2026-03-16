import { GroundingDto } from './grounding';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Citation {
  id: string;
  provider: string;
  title: string;
  url: string;
  snippet?: string;
  kind: 'fact' | 'image' | 'summary' | 'route' | 'reconstruction';
  confidence: 'high' | 'medium' | 'low';
  accessedAt: string;
}

export interface HistoricalAsset {
  id: string;
  title: string;
  imageUrl: string;
  sourceName: string;
  sourceUrl: string;
  type: 'archival' | 'reconstruction';
  yearLabel?: string;
  description?: string;
  citations: Citation[];
}

export interface GuideInfo {
  distanceMeters?: number;
  distanceText?: string;
  durationText?: string;
  deepLinkUrl?: string;
}

export interface PlaceSummary {
  id: string;
  providerPlaceId?: string;
  name: string;
  category: string;
  summary?: string;
  shortSummary?: string;
  longSummary?: string;
  address?: string;
  imageUrl?: string;
  coordinates: Coordinates;
  distance?: string;
  distanceMeters?: number;
  durationText?: string;
  mapsUrl?: string;
  guide?: GuideInfo;
  aliases?: string[];
  architecture?: string;
  nearbyIds?: string[];
  heroImage?: string;
}

export interface PlaceDetails extends PlaceSummary {
  grounding?: GroundingDto;
  description?: string;
  audioSummary?: string;
  facts: string[];
  didYouKnow?: string;
  verifiedFacts?: string[];
  inferredClaims?: string[];
  reconstructedClaims?: string[];
  citations?: Citation[];
  followUpSuggestions?: string[];
  historicalAssets?: HistoricalAsset[];
  historicalPeriods?: Array<{
    id: string;
    name: string;
    yearStart: number;
    yearEnd: number;
    description: string;
    imageUrl?: string;
  }>;
  historicalEra?: string;
  historicalImageUrl?: string;
  fallbackHistoricalImage?: string;
}

export interface DetectedPlace {
  place: PlaceDetails;
  transcriptExcerpt?: string;
}

// Legacy aliases kept so the current AR/UI layer can migrate incrementally.
export type Place = PlaceDetails;
export type NearbyAttraction = PlaceSummary;
