import { GroundingDto, GroundingScores, GroundingSignalDto } from '../../types/grounding';
import { 
  getConfidenceLevel, 
  getSignalStrength, 
  calculatePlaceConfidence, 
  calculateExplainConfidence, 
  calculateTimeTravelConfidence, 
  calculateNearbyConfidence 
} from './confidenceScoring';

export const buildGrounding = (
  mode: GroundingDto['mode'],
  scores: Partial<GroundingScores>,
  details: Omit<GroundingDto, 'overallConfidence' | 'overallScore' | 'placeConfidence' | 'placeConfidenceScore' | 'mode' | 'signals'>
): GroundingDto => {
  
  const placeConfidenceScore = calculatePlaceConfidence(scores);
  let overallScore = 0;

  if (mode === 'explain') {
    overallScore = calculateExplainConfidence(placeConfidenceScore, scores);
  } else if (mode === 'time-travel') {
    overallScore = calculateTimeTravelConfidence(placeConfidenceScore, scores);
  } else if (mode === 'nearby') {
    overallScore = calculateNearbyConfidence(scores);
  }

  const signals: GroundingSignalDto[] = [];
  if (scores.visionScore !== undefined) {
    signals.push({ name: 'Visual Match', strength: getSignalStrength(scores.visionScore), value: scores.visionScore, description: 'Similarity of captured frame to known landmark' });
  }
  if (scores.geoScore !== undefined) {
    signals.push({ name: 'Location Match', strength: getSignalStrength(scores.geoScore), value: scores.geoScore, description: 'GPS proximity to known location' });
  }
  if (scores.curatedScore !== undefined) {
    signals.push({ name: 'Curated Data', strength: getSignalStrength(scores.curatedScore), value: scores.curatedScore, description: 'Quality of curated knowledge for this landmark' });
  }
  if (scores.historicalScore !== undefined) {
    signals.push({ name: 'Historical Coverage', strength: getSignalStrength(scores.historicalScore), value: scores.historicalScore, description: 'Depth of historical records available' });
  }

  return {
    ...details,
    mode,
    overallScore,
    overallConfidence: getConfidenceLevel(overallScore),
    placeConfidenceScore,
    placeConfidence: getConfidenceLevel(placeConfidenceScore),
    signals
  };
};
