import type { HistoricalAsset, PlaceDetails } from '../../../types';
import type { SceneInferenceResult, TimeTravelEra } from '../../../types/time-travel';

export function buildTimeTravelPrompt(params: {
  era: TimeTravelEra;
  place?: PlaceDetails | null;
  scene?: SceneInferenceResult | null;
  assets?: HistoricalAsset[];
}) {
  const assetText = (params.assets || [])
    .slice(0, 3)
    .map(
      (asset) =>
        `${asset.sourceName}${asset.yearLabel ? ` (${asset.yearLabel})` : ''}: ${asset.title}${
          asset.description ? ` — ${asset.description}` : ''
        }`,
    )
    .join('; ');

  return `
Generate a photoreal but scene-aligned historical reconstruction prompt for LensIQ.

Era: ${params.era.label} (${params.era.year})
Place context: ${params.place?.name || params.scene?.title || 'current camera view'}
Scene summary: ${params.place?.summary || params.place?.description || params.scene?.summary || 'unknown'}
Scene subjects: ${(params.scene?.sceneSubjects || []).join(', ') || 'unknown'}
Object candidates: ${(params.scene?.objectCandidates || []).map((candidate) => candidate.name).join(', ') || 'unknown'}
Environment type: ${params.scene?.environmentType || 'unknown'}
Architectural clues: ${(params.scene?.architecturalClues || []).join(', ') || 'unknown'}
Streetscape hints: ${(params.scene?.streetscapeHints || []).join(', ') || 'unknown'}
Material clues: ${(params.scene?.materialClues || []).join(', ') || 'unknown'}
Technology era hints: ${(params.scene?.technologyEraHints || []).join(', ') || 'unknown'}
Historical assets: ${assetText || 'none'}

Requirements:
- Preserve the current live camera geometry as much as possible.
- If the scene is an interior or workstation, favor era-appropriate monitors, keyboards, cables, peripherals, desk phones, furniture, lighting, and visible materials.
- If the scene is a streetscape, favor facade changes, signage, transit lines, market stalls, awnings, and street furniture over invented viewpoints.
- Prefer overlays and substitutions that could plausibly sit on top of the current camera framing.
- If sources are sparse, keep the result conservative and historically plausible.
- Return only the prompt text.
`;
}
