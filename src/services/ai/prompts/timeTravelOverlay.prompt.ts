import type { SceneInferenceResult, TimeTravelEra } from '../../../types/time-travel';

export function buildTimeTravelOverlayPrompt(params: {
  era: TimeTravelEra;
  scene?: SceneInferenceResult | null;
}) {
  return `
You are designing a structure-aware historical overlay for LensIQ.
Return a short JSON array of overlay hints only:
[
  {
    "label": "overlay label",
    "type": "ghost | signage | facade | streetscape",
    "description": "how this historical layer should align with the current camera geometry"
  }
]

Era: ${params.era.label} (${params.era.year})
Scene summary: ${params.scene?.summary || 'unknown'}
Reconstruction hints: ${(params.scene?.reconstructionHints || []).join(', ') || 'none'}
Scene subjects: ${(params.scene?.sceneSubjects || []).join(', ') || 'none'}
Object candidates: ${(params.scene?.objectCandidates || []).map((candidate) => candidate.name).join(', ') || 'none'}
Environment type: ${params.scene?.environmentType || 'unknown'}
Technology era hints: ${(params.scene?.technologyEraHints || []).join(', ') || 'none'}

Rules:
- Focus on geometry-preserving overlay hints.
- When the scene is object-led, suggest overlays for device silhouettes, screens, signage, desk hardware, or materials instead of only buildings.
- Do not invent sources.
- Keep it concise and return JSON only.
`;
}
