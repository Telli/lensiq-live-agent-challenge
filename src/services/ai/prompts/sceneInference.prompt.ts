import type { PlaceSummary } from '../../../types';

export function buildSceneInferencePrompt(params: {
  headingDegrees?: number | null;
  locationLabel?: string;
  nearbyCandidates?: PlaceSummary[];
}) {
  const nearbyText = (params.nearbyCandidates || [])
    .slice(0, 5)
    .map(
      (candidate) =>
        `- ${candidate.name} (${candidate.category})${candidate.distance ? `, ${candidate.distance}` : ''}`,
    )
    .join('\n');

  return `
You are LensIQ's scene inference engine.
Analyze the current camera scene and return JSON only.

Return this exact shape:
{
  "title": "short scene title",
  "district": "optional district or neighborhood",
  "summary": "1-2 sentence summary of what the camera is looking at",
  "sceneSubjects": ["main thing or setup in view"],
  "placeCandidates": [
    {
      "name": "candidate place name",
      "reason": "why it might match",
      "confidence": "high | medium | low"
    }
  ],
  "objectCandidates": [
    {
      "name": "candidate object, setup, or product family in view",
      "reason": "why it matters for reconstruction",
      "confidence": "high | medium | low"
    }
  ],
  "environmentType": "street | storefront | workstation | office | home desk | interior | industrial | campus | transit | other",
  "architecturalClues": ["short clue"],
  "streetscapeHints": ["short hint"],
  "materialClues": ["wood, brushed aluminum, CRT glass, beige plastic, etc"],
  "technologyEraHints": ["design cues that suggest a period for devices or interiors"],
  "eraSuggestions": [2026, 1970, 1940, 1910],
  "reconstructionHints": ["overlay-oriented hint that preserves the camera geometry"],
  "confidenceNote": "short explanation of confidence and uncertainty",
  "recoveredFrom": ["vision", "location", "nearby candidates", "heading"]
}

Camera heading: ${params.headingDegrees ?? 'unknown'} degrees
Location context: ${params.locationLabel || 'unknown'}
Nearby candidates:
${nearbyText || '- none available'}

Important rules:
- This is scene-level contextual inference, not guaranteed place detection.
- This is not only for landmarks. It must also work for interiors, workstations, desks, devices, furniture, storefronts, and everyday objects.
- If the place is uncertain, keep placeCandidates speculative and say so.
- If the scene is object-led, populate sceneSubjects and objectCandidates even if placeCandidates are weak.
- Look for product-design clues such as monitor form factor, bezels, keyboards, desk phones, cabling, lighting, and materials.
- Favor neighborhoods, streetscapes, building types, visible anchors, and object-level historical clues.
- Do not fabricate source labels.
- Return JSON only.
`;
}
