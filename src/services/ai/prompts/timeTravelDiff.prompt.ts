import type { HistoricalAsset, PlaceDetails } from '../../../types';
import type { SceneInferenceResult, TimeTravelEra } from '../../../types/time-travel';

export function buildTimeTravelDiffPrompt(params: {
  era: TimeTravelEra;
  place?: PlaceDetails | null;
  scene?: SceneInferenceResult | null;
  asset?: HistoricalAsset | null;
}) {
  return `
You are LensIQ's historical comparison engine.
Compare the present-day camera scene with the requested historical era.

Return JSON only in this shape:
{
  "whatChanged": ["short bullet"],
  "verifiedFacts": ["fact backed by provided context or source metadata"],
  "inferredClaims": ["careful inference"],
  "reconstructedElements": ["element that would be reconstructed rather than verified"],
  "confidenceNote": "short note about confidence and uncertainty",
  "callouts": [
    {
      "title": "short label",
      "body": "source-backed or metadata-backed text only",
      "kind": "verified | context | reconstructed"
    }
  ]
}

Era: ${params.era.label} (${params.era.year})
Place: ${params.place?.name || params.scene?.title || 'scene-led view'}
Present summary: ${params.place?.summary || params.place?.description || params.scene?.summary || 'unknown'}
Historical asset: ${params.asset ? `${params.asset.sourceName} ${params.asset.yearLabel || ''} ${params.asset.description || ''}` : 'none'}
Scene inference clues: ${(params.scene?.reconstructionHints || []).join(', ') || 'none'}
Object candidates: ${(params.scene?.objectCandidates || []).map((candidate) => candidate.name).join(', ') || 'none'}
Technology era hints: ${(params.scene?.technologyEraHints || []).join(', ') || 'none'}

Rules:
- Put only source-backed facts in verifiedFacts.
- Put uncertain but plausible changes in inferredClaims.
- Put generated-only details in reconstructedElements.
- If no source-backed callouts exist, return an empty callouts array.
- Return JSON only.
`;
}
