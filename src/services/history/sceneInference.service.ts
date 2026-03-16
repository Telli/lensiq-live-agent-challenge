import type { PlaceDetails, PlaceSummary } from '../../types';
import type { CapturedFrame } from '../session/frameStore';
import type { SceneInferenceResult } from '../../types/time-travel';
import { aiService } from '../aiService';
import { buildSceneInferencePrompt } from '../ai/prompts/sceneInference.prompt';

interface SceneInferenceInput {
  frame: CapturedFrame;
  location?: { latitude: number; longitude: number } | null;
  headingDegrees?: number | null;
  nearbyCandidates?: PlaceSummary[];
  activePlace?: PlaceDetails | null;
}

function normalizeConfidence(value: unknown): 'high' | 'medium' | 'low' {
  const text = String(value || '').toLowerCase();
  if (text === 'high' || text === 'medium' || text === 'low') return text;
  return 'medium';
}

function normalizeCandidate(
  candidate: Partial<SceneInferenceResult['placeCandidates'][number]> | undefined,
  fallbackName: string,
  fallbackReason: string,
  nearbyCandidates?: PlaceSummary[],
) {
  const matchedNearby = nearbyCandidates?.find(
    (nearby) => nearby.name.toLowerCase() === candidate?.name?.toLowerCase(),
  );

  return {
    name: candidate?.name || matchedNearby?.name || fallbackName,
    reason: candidate?.reason || fallbackReason,
    providerPlaceId:
      matchedNearby?.providerPlaceId ||
      (matchedNearby as PlaceDetails | undefined)?.providerPlaceId,
    confidence: normalizeConfidence(candidate?.confidence),
  };
}

export const sceneInferenceService = {
  async inferScene(input: SceneInferenceInput): Promise<SceneInferenceResult> {
    const locationLabel = input.location
      ? `${input.location.latitude.toFixed(5)}, ${input.location.longitude.toFixed(5)}`
      : undefined;

    const nearbyCandidates = input.activePlace
      ? [input.activePlace, ...(input.nearbyCandidates || [])]
      : input.nearbyCandidates;

    const response = await aiService.completeJson<SceneInferenceResult>({
      prompt: buildSceneInferencePrompt({
        headingDegrees: input.headingDegrees,
        locationLabel,
        nearbyCandidates,
      }),
      imageBase64: input.frame.data,
      useThinking: true,
    });
    const sceneSubjects = (response.sceneSubjects || []).filter(Boolean).slice(0, 4);

    return {
      title:
        response.title ||
        response.sceneSubjects?.[0] ||
        response.objectCandidates?.[0]?.name ||
        input.activePlace?.name ||
        'Current scene',
      district: response.district || undefined,
      summary: response.summary || input.activePlace?.summary || 'LensIQ inferred the broader scene from the live camera view.',
      placeCandidates: (response.placeCandidates || [])
        .slice(0, 4)
        .map((candidate) =>
          normalizeCandidate(
            candidate,
            'Unknown place',
            'Inferred from the live scene.',
            nearbyCandidates,
          ),
        ),
      sceneSubjects:
        sceneSubjects.length > 0
          ? sceneSubjects
          : [response.title || input.activePlace?.name || 'Current scene'],
      objectCandidates: (response.objectCandidates || [])
        .slice(0, 4)
        .map((candidate) =>
          normalizeCandidate(
            candidate,
            'Scene subject',
            'Inferred object or setup from the live scene.',
          ),
        ),
      environmentType: response.environmentType || undefined,
      architecturalClues: response.architecturalClues || [],
      streetscapeHints: response.streetscapeHints || [],
      materialClues: response.materialClues || [],
      technologyEraHints: response.technologyEraHints || [],
      eraSuggestions: (response.eraSuggestions || []).filter((value) => Number.isFinite(Number(value))).map(Number),
      reconstructionHints: response.reconstructionHints || [],
      confidenceNote: response.confidenceNote || 'Scene inference is a best-effort interpretation of the current camera view.',
      recoveredFrom: response.recoveredFrom || [
        'vision',
        ...(input.location ? ['location'] : []),
        ...(nearbyCandidates?.length ? ['nearby candidates'] : []),
        ...(typeof input.headingDegrees === 'number' ? ['heading'] : []),
      ],
    };
  },
};
