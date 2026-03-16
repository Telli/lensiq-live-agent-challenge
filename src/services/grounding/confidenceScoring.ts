import { ConfidenceLevel, SignalStrength, GroundingScores } from '../../types/grounding';

export const getConfidenceLevel = (score: number): ConfidenceLevel => {
  if (score >= 0.80) return 'high';
  if (score >= 0.55) return 'medium';
  return 'low';
};

export const getSignalStrength = (score: number): SignalStrength => {
  if (score >= 0.80) return 'strong';
  if (score >= 0.50) return 'moderate';
  return 'weak';
};

export const calculatePlaceConfidence = (scores: Partial<GroundingScores>): number => {
  const { visionScore = 0, geoScore = 0, curatedScore = 0, sessionScore = 0 } = scores;
  return (visionScore * 0.45) + (geoScore * 0.30) + (curatedScore * 0.20) + (sessionScore * 0.05);
};

export const calculateExplainConfidence = (placeScore: number, scores: Partial<GroundingScores>): number => {
  const { curatedScore = 0, sessionScore = 0 } = scores;
  return (placeScore * 0.70) + (curatedScore * 0.20) + (sessionScore * 0.10);
};

export const calculateTimeTravelConfidence = (placeScore: number, scores: Partial<GroundingScores>): number => {
  const { historicalScore = 0, reconstructionScore = 0 } = scores;
  return (placeScore * 0.40) + (historicalScore * 0.35) + (reconstructionScore * 0.25);
};

export const calculateNearbyConfidence = (scores: Partial<GroundingScores>): number => {
  const { geoScore = 0, curatedScore = 0, sessionScore = 0 } = scores;
  return (geoScore * 0.60) + (curatedScore * 0.30) + (sessionScore * 0.10);
};
