import type {
  Citation,
  HistoricalAsset,
  PlaceDetails,
} from '../../types';
import type {
  SceneInferenceResult,
  TimeTravelEra,
  TimeTravelMode,
} from '../../types/time-travel';
import {
  buildHistoricalOverlay,
  buildTimeTravelCallouts,
  chooseAssetForYear,
  mapHistoricalAssetToSource,
} from './timeTravel.mapper';

function parseAssetYear(asset: HistoricalAsset) {
  const match = asset.yearLabel?.match(/\d{4}/);
  return match ? Number(match[0]) : null;
}

function dedupeYears(values: number[]) {
  return Array.from(new Set(values.filter((value) => Number.isFinite(value)))).sort((a, b) => b - a);
}

function selectTimelineYears(values: number[], currentYear: number) {
  const deduped = dedupeYears(values);
  if (deduped.length <= 4) {
    return deduped;
  }

  const historical = deduped.filter((year) => year < currentYear - 1);
  if (!historical.length) {
    return deduped.slice(0, 4);
  }

  const recentHistorical =
    historical.find((year) => year >= currentYear - 20) || historical[0];
  const middleHistorical = historical[Math.floor(historical.length / 2)] || historical[0];
  const oldestHistorical = historical[historical.length - 1] || historical[0];

  return dedupeYears([
    currentYear,
    recentHistorical,
    middleHistorical,
    oldestHistorical,
  ]).sort((a, b) => b - a);
}

function formatEraLabel(year: number, currentYear: number) {
  if (year >= currentYear - 1) return 'Today';
  if (year >= currentYear - 40) return `${year}`;
  if (year >= currentYear - 90) return `Mid-century ${year}`;
  return `${year}`;
}

function extractSceneSubject(scene?: SceneInferenceResult | null) {
  return (
    scene?.sceneSubjects?.[0] ||
    scene?.objectCandidates?.[0]?.name ||
    scene?.district ||
    scene?.title ||
    'this view'
  );
}

function isTechnologyScene(scene?: SceneInferenceResult | null) {
  const searchableText = [
    scene?.environmentType,
    scene?.title,
    scene?.summary,
    ...(scene?.sceneSubjects || []),
    ...(scene?.technologyEraHints || []),
    ...(scene?.objectCandidates || []).map((candidate) => candidate.name),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return /(workstation|monitor|computer|desk|office|terminal|keyboard|display|electronics|studio)/.test(
    searchableText,
  );
}

function buildFallbackYears(
  currentYear: number,
  scene?: SceneInferenceResult | null,
) {
  if (isTechnologyScene(scene)) {
    return [currentYear - 8, currentYear - 18, currentYear - 28, currentYear - 38];
  }

  return [currentYear - 40, currentYear - 80, currentYear - 120];
}

function buildEraSummary(params: {
  year: number;
  currentYear: number;
  place?: PlaceDetails | null;
  scene?: SceneInferenceResult | null;
  asset?: HistoricalAsset | null;
}) {
  if (params.year >= params.currentYear - 1) {
    return params.place?.summary || params.scene?.summary || 'Present-day camera view.';
  }

  const sourceDescription = params.asset?.description;
  if (sourceDescription) return sourceDescription;

  const subject = params.place?.name || extractSceneSubject(params.scene);
  if (isTechnologyScene(params.scene)) {
    return `LensIQ reconstructs how ${subject} likely looked around ${params.year}, keeping the live layout while shifting visible technology and materials to the era.`;
  }

  return `LensIQ reconstructs how ${subject} likely appeared around ${params.year}.`;
}

export function buildTimeTravelTimeline(params: {
  mode: TimeTravelMode;
  place?: PlaceDetails | null;
  scene?: SceneInferenceResult | null;
  assets: HistoricalAsset[];
  citations: Citation[];
}): {
  title: string;
  subtitle?: string;
  sceneSummary: string;
  timeline: TimeTravelEra[];
  selectedEraId: string;
} {
  const currentYear = new Date().getFullYear();
  const assetYears = params.assets.map(parseAssetYear).filter((value): value is number => value !== null);
  const suggestedYears = params.scene?.eraSuggestions || [];
  const yearCandidates = dedupeYears([
    currentYear,
    ...assetYears,
    ...suggestedYears,
    ...buildFallbackYears(currentYear, params.scene),
  ]);

  const orderedYears = selectTimelineYears(yearCandidates, currentYear);

  const timeline = orderedYears.map((year) => {
    const asset = year === currentYear ? null : chooseAssetForYear(params.assets, year);
    const source = mapHistoricalAssetToSource(asset);
    const overlay =
      year === currentYear
        ? null
        : buildHistoricalOverlay(
            `time-travel-${year}`,
            asset?.imageUrl || null,
            asset?.description,
            asset?.type === 'reconstruction' ? 'reconstruction' : 'archival',
          );

    return {
      id: `era-${year}`,
      label: formatEraLabel(year, currentYear),
      year,
      summary: buildEraSummary({
        year,
        currentYear,
        place: params.place,
        scene: params.scene,
        asset,
      }),
      asset,
      overlay,
      source,
      callouts: buildTimeTravelCallouts({
        asset,
        verifiedFacts: asset?.description ? [asset.description] : [],
        sourceLabel: source?.label,
      }),
      whatChanged: asset?.description ? [asset.description] : [],
      verifiedFacts: asset?.description ? [asset.description] : [],
      inferredClaims: [],
      reconstructedElements:
        asset?.type === 'reconstruction'
          ? ['The historical layer reconstructs scene details that are not visible in archival imagery.']
          : [],
      citations: asset?.citations || params.citations.slice(0, 3),
      confidenceNote:
        asset?.type === 'reconstruction'
          ? 'This era includes reconstructed details informed by historical context.'
          : asset
            ? 'This era is anchored by archival source material.'
            : 'LensIQ will infer this era from the live scene and available historical context.',
      reconstructionMode:
        asset?.type === 'reconstruction'
          ? 'overlay-reconstruction'
          : asset
            ? 'archival'
            : null,
    } satisfies TimeTravelEra;
  });

  const selectedHistoricalEra = [...timeline]
    .reverse()
    .find((era) => era.year < currentYear);

  return {
    title:
      params.place?.name ||
      params.scene?.title ||
      `${extractSceneSubject(params.scene)} through time`,
    subtitle:
      params.mode === 'place-led'
        ? params.place?.category || undefined
        : params.scene?.environmentType || params.scene?.district || 'Scene-led reconstruction',
    sceneSummary:
      params.place?.summary ||
      params.place?.description ||
      params.scene?.summary ||
      `LensIQ is reconstructing ${extractSceneSubject(params.scene)} through time.`,
    timeline,
    selectedEraId: selectedHistoricalEra?.id || timeline[0]?.id || `era-${currentYear}`,
  };
}
