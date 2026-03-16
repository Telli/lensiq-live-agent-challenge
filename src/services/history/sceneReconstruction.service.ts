import type { CapabilityState, Citation, HistoricalAsset, PlaceDetails } from '../../types';
import type {
  SceneInferenceResult,
  TimeTravelEra,
  TimeTravelReconstructionMode,
} from '../../types/time-travel';
import type { CapturedFrame } from '../session/frameStore';
import { aiService } from '../aiService';
import { buildTimeTravelDiffPrompt } from '../ai/prompts/timeTravelDiff.prompt';
import { buildTimeTravelOverlayPrompt } from '../ai/prompts/timeTravelOverlay.prompt';
import { buildTimeTravelPrompt } from '../ai/prompts/timeTravel.prompt';
import { genMediaToolAdapter } from '../media/genMediaTool.adapter';
import { mcpToolRegistry } from '../tools/mcpToolRegistry';
import {
  buildHistoricalOverlay,
  buildTimeTravelCallouts,
  mapHistoricalAssetToSource,
} from './timeTravel.mapper';
import { timeTravelService } from './timeTravel.service';

interface HydrateEraInput {
  era: TimeTravelEra;
  place?: PlaceDetails | null;
  scene?: SceneInferenceResult | null;
  frame?: CapturedFrame | null;
  capabilities?: CapabilityState | null;
  citations: Citation[];
}

interface DiffResult {
  whatChanged?: string[];
  verifiedFacts?: string[];
  inferredClaims?: string[];
  reconstructedElements?: string[];
  confidenceNote?: string;
  callouts?: Array<{
    title: string;
    body: string;
    kind: 'verified' | 'context' | 'reconstructed';
  }>;
}

function mapDiffCallouts(params: {
  diff: DiffResult;
  asset: HistoricalAsset | null;
  sourceLabel?: string;
  yearLabel?: string;
}) {
  return (params.diff.callouts || []).map((callout, index) => ({
    id: `${params.asset?.id || params.yearLabel || 'scene'}-${index}`,
    title: callout.title,
    body: callout.body,
    x: index % 2 === 0 ? 24 : 68,
    y: index % 2 === 0 ? 38 : 58,
    kind: callout.kind,
    sourceLabel: params.sourceLabel,
    yearLabel: params.yearLabel,
  }));
}

async function buildGeneratedOverlay(params: {
  era: TimeTravelEra;
  place?: PlaceDetails | null;
  scene?: SceneInferenceResult | null;
}) {
  const prompt = buildTimeTravelPrompt({
    era: params.era,
    place: params.place,
    scene: params.scene,
    assets: params.era.asset ? [params.era.asset] : [],
  });
  const adapter = mcpToolRegistry.getGenMediaTool() || genMediaToolAdapter;
  const imageUrl = await adapter.generateHistoricalScene(prompt);
  return buildHistoricalOverlay(
    `${params.era.id}-generated`,
    imageUrl,
    params.era.summary,
    'reconstruction',
  );
}

function mergeConfidenceNotes(...notes: Array<string | null | undefined>) {
  return notes.filter(Boolean).join(' ');
}

export const sceneReconstructionService = {
  async hydrateEra(input: HydrateEraInput): Promise<TimeTravelEra> {
    let era = { ...input.era };

    if (
      !era.asset &&
      input.place?.providerPlaceId &&
      input.frame?.data &&
      timeTravelService.canAttemptHistoricalReconstruction()
    ) {
      try {
        const reconstruction = await timeTravelService.generateHistoricalImage(
          input.place.providerPlaceId,
          input.frame.data,
        );
        era.asset = reconstruction;
        era.source = mapHistoricalAssetToSource(reconstruction);
        era.reconstructionMode = 'overlay-reconstruction';
      } catch {
        const cooldownNote = timeTravelService.getHistoricalReconstructionStatusNote();
        if (cooldownNote) {
          era.confidenceNote = mergeConfidenceNotes(era.confidenceNote, cooldownNote);
        }
        // Fall through to generated overlay below.
      }
    } else if (!era.asset) {
      const cooldownNote = timeTravelService.getHistoricalReconstructionStatusNote();
      if (cooldownNote) {
        era.confidenceNote = mergeConfidenceNotes(era.confidenceNote, cooldownNote);
      }
    }

    if (!era.overlay) {
      if (era.asset?.imageUrl) {
        era.overlay = buildHistoricalOverlay(
          `${era.id}-asset`,
          era.asset.imageUrl,
          era.asset.description,
          era.asset.type === 'reconstruction' ? 'reconstruction' : 'archival',
        );
      } else if (input.capabilities?.media) {
        era.overlay = await buildGeneratedOverlay({
          era,
          place: input.place,
          scene: input.scene,
        });
        if (era.overlay?.imageUrl && !era.asset) {
          era.reconstructionMode = 'generated-reconstruction';
          era.source = {
            label: 'AI reconstruction based on historical context',
            isReconstruction: true,
            description: era.summary,
          };
        } else if (!era.overlay) {
          const cooldownNote =
            typeof genMediaToolAdapter.getStatusNote === 'function'
              ? genMediaToolAdapter.getStatusNote()
              : null;
          if (cooldownNote) {
            era.confidenceNote = mergeConfidenceNotes(era.confidenceNote, cooldownNote);
          }
        }
      }
    }

    const source = era.source || mapHistoricalAssetToSource(era.asset);

    let diff: DiffResult | null = null;
    try {
      diff = await aiService.completeJson<DiffResult>({
        prompt: buildTimeTravelDiffPrompt({
          era,
          place: input.place,
          scene: input.scene,
          asset: era.asset,
        }),
        useThinking: true,
      });
    } catch {
      diff = null;
    }

    era.whatChanged =
      diff?.whatChanged?.filter(Boolean) ||
      era.whatChanged ||
      (era.asset?.description ? [era.asset.description] : []);
    era.verifiedFacts =
      diff?.verifiedFacts?.filter(Boolean) ||
      era.verifiedFacts ||
      (era.asset?.description ? [era.asset.description] : []);
    era.inferredClaims = diff?.inferredClaims?.filter(Boolean) || era.inferredClaims || [];
    era.reconstructedElements =
      diff?.reconstructedElements?.filter(Boolean) || era.reconstructedElements || [];
    era.confidenceNote =
      diff?.confidenceNote ||
      era.confidenceNote ||
      input.scene?.confidenceNote ||
      'LensIQ blended source-backed history with scene inference.';

    const overlayHints = input.scene
      ? await aiService
          .completeJson<Array<{ label?: string; type?: string; description?: string }>>({
            prompt: buildTimeTravelOverlayPrompt({
              era,
              scene: input.scene,
            }),
            useThinking: true,
          })
          .catch(() => [])
      : [];

    if (era.overlay && overlayHints.length) {
      era.overlay = {
        ...era.overlay,
        layers: [
          ...era.overlay.layers,
          ...overlayHints.slice(0, 2).map((hint, index) => ({
            id: `${era.id}-hint-${index}`,
            label: hint.label || 'Overlay hint',
            type:
              hint.type === 'signage' ||
              hint.type === 'facade' ||
              hint.type === 'streetscape'
                ? hint.type
                : 'ghost',
            opacity: 0.18,
            blendMode: 'overlay' as const,
          })),
        ],
      };
    }

    const diffCallouts = diff
      ? mapDiffCallouts({
          diff,
          asset: era.asset,
          sourceLabel: source?.label,
          yearLabel: era.asset?.yearLabel || `${era.year}`,
        })
      : [];

    era.callouts =
      diffCallouts.length > 0
        ? diffCallouts
        : buildTimeTravelCallouts({
            asset: era.asset,
            verifiedFacts: era.verifiedFacts,
            reconstructedElements: era.reconstructedElements,
            sourceLabel: source?.label,
          });

    era.citations = era.asset?.citations?.length ? era.asset.citations : input.citations;
    era.source = source;

    return era;
  },
};
