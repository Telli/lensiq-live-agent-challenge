import type {
  Citation,
  GroundingDto,
  HistoricalAsset,
  PlaceDetails,
} from '../../types';
import type {
  HistoricalOverlay,
  HistoricalOverlayLayer,
  SceneInferenceResult,
  TimeTravelCalloutData,
  TimeTravelMode,
  TimeTravelSource,
} from '../../types/time-travel';
import { buildGrounding } from '../grounding/buildGrounding';

function parseYearLabel(value?: string) {
  if (!value) return null;
  const match = value.match(/\d{4}/);
  return match ? Number(match[0]) : null;
}

export function mapHistoricalAssetToSource(asset: HistoricalAsset | null): TimeTravelSource | null {
  if (!asset) return null;
  return {
    label:
      asset.type === 'reconstruction'
        ? 'AI reconstruction based on historical context'
        : asset.sourceName,
    yearLabel: asset.yearLabel,
    provenance: asset.sourceName,
    url: asset.sourceUrl,
    isReconstruction: asset.type === 'reconstruction',
    description: asset.description,
  };
}

export function buildHistoricalOverlay(
  id: string,
  imageUrl: string | null,
  description: string | undefined,
  style: HistoricalOverlay['style'],
): HistoricalOverlay | null {
  if (!imageUrl) return null;

  const layers: HistoricalOverlayLayer[] = [
    {
      id: `${id}-base`,
      label: 'Historical scene layer',
      type: 'image',
      imageUrl,
      opacity: 0.82,
      blendMode: style === 'archival' ? 'normal' : 'screen',
    },
    {
      id: `${id}-ghost`,
      label: 'Historical ghost alignment',
      type: 'ghost',
      imageUrl,
      opacity: style === 'archival' ? 0.24 : 0.36,
      blendMode: 'overlay',
    },
  ];

  return {
    id,
    imageUrl,
    layers,
    style,
    description,
  };
}

export function buildTimeTravelCallouts(params: {
  asset?: HistoricalAsset | null;
  verifiedFacts?: string[];
  reconstructedElements?: string[];
  sourceLabel?: string;
}): TimeTravelCalloutData[] {
  const callouts: TimeTravelCalloutData[] = [];

  const description = params.asset?.description?.trim();
  if (description) {
    callouts.push({
      id: `${params.asset?.id || 'asset'}-description`,
      title: params.asset?.title || 'Historical source',
      body: description,
      x: 22,
      y: 34,
      kind: params.asset?.type === 'reconstruction' ? 'reconstructed' : 'verified',
      sourceLabel: params.sourceLabel,
      yearLabel: params.asset?.yearLabel,
    });
  }

  const fact = params.verifiedFacts?.find(Boolean);
  if (fact) {
    callouts.push({
      id: `${params.asset?.id || 'asset'}-fact`,
      title: 'What changed',
      body: fact,
      x: 67,
      y: 58,
      kind: 'verified',
      sourceLabel: params.sourceLabel,
      yearLabel: params.asset?.yearLabel,
    });
  }

  const reconstructed = params.reconstructedElements?.find(Boolean);
  if (reconstructed && params.asset?.type === 'reconstruction') {
    callouts.push({
      id: `${params.asset.id}-reconstructed`,
      title: 'Reconstructed element',
      body: reconstructed,
      x: 50,
      y: 26,
      kind: 'reconstructed',
      sourceLabel: params.sourceLabel,
      yearLabel: params.asset.yearLabel,
    });
  }

  return callouts.slice(0, 3);
}

export function buildTimeTravelGrounding(params: {
  mode: TimeTravelMode;
  place?: PlaceDetails | null;
  scene: SceneInferenceResult | null;
  citations: Citation[];
  verifiedFacts: string[];
  inferredClaims: string[];
  reconstructedElements: string[];
  source: TimeTravelSource | null;
}): GroundingDto {
  const hasPlace = Boolean(params.place);
  const hasHistoricalSource = params.citations.length > 0;
  const hasReconstruction = params.reconstructedElements.length > 0 || params.source?.isReconstruction;

  return buildGrounding(
    'time-travel',
    {
      visionScore: hasPlace ? 0.86 : 0.68,
      geoScore: params.scene?.recoveredFrom.includes('location') ? 0.74 : 0.44,
      curatedScore: hasPlace ? 0.82 : 0.58,
      historicalScore: hasHistoricalSource ? 0.84 : 0.42,
      reconstructionScore: hasReconstruction ? 0.72 : 0.18,
    },
    {
      sources: [
        ...(params.source
          ? [
              {
                id: params.source.label,
                name: params.source.label,
                url: params.source.url,
                reliability: params.source.isReconstruction
                  ? ('medium' as const)
                  : ('high' as const),
              },
            ]
          : []),
        ...params.citations.slice(0, 3).map((citation) => ({
          id: citation.id,
          name: citation.provider,
          url: citation.url,
          reliability: citation.confidence as 'high' | 'medium' | 'low',
        })),
      ],
      verifiedFacts: params.verifiedFacts,
      inferredClaims: params.inferredClaims,
      reconstructedElements: params.reconstructedElements,
      whyThisMatch: params.place
        ? `Time travel is anchored to ${params.place.name} and enriched with historical assets for this place.`
        : `Time travel is scene-led from the live camera view${params.scene?.district ? ` in ${params.scene.district}` : ''}.`,
      recoveryHints: [
        'Keep the camera steady for a few seconds',
        'Frame storefronts, facades, or street signs',
        'Enable location for stronger historical matching',
      ],
      disclaimer: params.source?.isReconstruction
        ? 'This historical view includes AI reconstruction based on historical context and may infer missing visual details.'
        : 'This historical view is based on archival sources and may still omit changes not visible in the current camera angle.',
    },
  );
}

export function chooseAssetForYear(
  assets: HistoricalAsset[],
  year: number,
): HistoricalAsset | null {
  if (!assets.length) return null;
  const scored = assets
    .map((asset) => ({
      asset,
      year: parseYearLabel(asset.yearLabel) ?? year,
    }))
    .sort((a, b) => Math.abs(a.year - year) - Math.abs(b.year - year));
  return scored[0]?.asset || null;
}
