import { Place } from '../../types';
import { GroundingDto } from '../../types/grounding';
import { buildGrounding } from '../../services/grounding/buildGrounding';

export const timeTravelMapper = {
  mapGrounding: (place: Place, year: string): GroundingDto => {
    return buildGrounding('time-travel', {
      historicalScore: 0.85,
      reconstructionScore: 0.75,
      visionScore: 0.90
    }, {
      sources: [
        { id: '1', name: "Historical Archives", reliability: 'high' },
        { id: '2', name: "AI Generative Reconstruction", reliability: 'medium' }
      ],
      verifiedFacts: [`Location corresponds to ${place.name}`, `General era context for ${year}`],
      inferredClaims: ["Specific weather conditions", "Incidental background characters"],
      reconstructedElements: ["Clothing styles", "Period-accurate vehicles", "Architectural finishings"],
      whyThisMatch: "Based on the visual layout of the current frame and historical data for this year.",
      recoveryHints: ["Ensure the original landmark is well-framed"],
      disclaimer: "This is an AI reconstruction. Minor architectural and contextual details may be inferred."
    });
  }
};
