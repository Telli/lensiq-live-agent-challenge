export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type GroundingMode = 'explain' | 'time-travel' | 'nearby';
export type SignalStrength = 'strong' | 'moderate' | 'weak';
export type GroundingSignalType = 'vision' | 'geo' | 'curated' | 'session' | 'history' | 'reconstruction';

export interface GroundingScores {
  visionScore: number;
  geoScore: number;
  curatedScore: number;
  sessionScore: number;
  historicalScore: number;
  reconstructionScore: number;
}

export interface GroundingSignalDto {
  name: string;
  type?: GroundingSignalType;
  strength: SignalStrength;
  value: number;
  description: string;
}

export interface GroundingSourceDto {
  id: string;
  name: string;
  url?: string;
  reliability: ConfidenceLevel;
}

export interface GroundingDto {
  overallConfidence: ConfidenceLevel;
  overallScore: number;
  placeConfidence: ConfidenceLevel;
  placeConfidenceScore: number;
  mode: GroundingMode;
  signals: GroundingSignalDto[];
  sources: GroundingSourceDto[];
  verifiedFacts: string[];
  inferredClaims: string[];
  reconstructedElements: string[];
  whyThisMatch: string;
  recoveryHints: string[];
  disclaimer: string;
}
