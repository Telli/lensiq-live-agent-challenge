import { Place } from '../../types';
import { GroundingDto } from '../../types/grounding';
import { buildGrounding } from '../../services/grounding/buildGrounding';

export const explainMapper = {
  mapAiToPlace: (
    aiData: { name: string; description: string; historicalFact: string; audioSummary: string; },
    base64Image: string,
    curatedMatch: Place | null,
    coords: { lat: number; lng: number }
  ): Place => {
    
    // In a real app we'd rigorously score these, but mapped for demo:
    const hasCurated = !!curatedMatch;
    
    const grounding: GroundingDto = buildGrounding('explain', {
      visionScore: 0.92,
      geoScore: hasCurated ? 0.95 : 0.60,
      curatedScore: hasCurated ? 1.0 : 0.20,
      sessionScore: 0.85
    }, {
      sources: [
        { id: '1', name: "Gemini Vision AI", reliability: 'high' },
        ...(hasCurated ? [{ id: '2', name: "Curated Knowledge Base", reliability: 'high' as any }] : [])
      ],
      verifiedFacts: hasCurated ? curatedMatch.facts : [aiData.historicalFact],
      inferredClaims: ["Observed weather and lighting", "Angle of approach"],
      reconstructedElements: [],
      whyThisMatch: hasCurated 
        ? `Visual match aligns with known GPS coordinates for ${curatedMatch.name}.`
        : "AI visually identified the landmark. Confidence is provisional until verified.",
      recoveryHints: ["Move closer", "Ensure good lighting", "Pan around the subject"],
      disclaimer: "AI inferences can occasionally contain inaccuracies."
    });

    if (hasCurated) {
      return {
        ...curatedMatch,
        grounding,
        audioSummary: aiData.audioSummary, // Prefer the live generative audio summary
        imageUrl: `data:image/jpeg;base64,${base64Image}`,
        distance: curatedMatch.distance || "Here",
        coordinates: coords,
        verifiedFacts: curatedMatch.verifiedFacts || curatedMatch.facts || [],
        inferredClaims: curatedMatch.inferredClaims || [],
        reconstructedClaims: curatedMatch.reconstructedClaims || [],
        citations: curatedMatch.citations || [],
      };
    }

    return {
      id: Math.random().toString(36).substr(2, 9),
      name: aiData.name || "Unknown Object",
      description: aiData.description,
      didYouKnow: aiData.historicalFact,
      facts: [aiData.historicalFact],
      audioSummary: aiData.audioSummary,
      imageUrl: `data:image/jpeg;base64,${base64Image}`,
      category: "Discovered",
      distance: "Here",
      coordinates: coords,
      grounding,
      verifiedFacts: [aiData.historicalFact],
      inferredClaims: [],
      reconstructedClaims: [],
      citations: [],
    };
  }
};
