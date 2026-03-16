import crypto from 'crypto';
import { ActivityHandling, GoogleGenAI, Modality, ThinkingLevel } from '@google/genai';
import type {
  CapabilityState,
  Citation,
  Coordinates,
  HistoricalAsset,
  PlaceDetails,
  PlaceSummary,
} from '../types/index.js';
import { env } from './env.js';
import { saveBase64Asset, storageAvailable } from './storage.js';

const ai = env.geminiApiKey ? new GoogleGenAI({ apiKey: env.geminiApiKey }) : null;

const PLACE_TEXT_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.photos',
  'places.primaryTypeDisplayName',
  'places.editorialSummary',
  'places.googleMapsUri',
].join(',');

const PLACE_DETAILS_MASK = [
  'id',
  'displayName',
  'formattedAddress',
  'location',
  'photos',
  'primaryTypeDisplayName',
  'editorialSummary',
  'googleMapsUri',
].join(',');

const ROUTES_MASK = 'routes.distanceMeters,routes.duration';

const LIVE_MODEL = 'gemini-2.5-flash-native-audio-preview-12-2025';
const CHAT_MODEL = 'gemini-3-flash-preview';
const REASONING_MODEL = 'gemini-3-pro-preview';
const IMAGE_MODEL = 'gemini-3-pro-image-preview';
const VIDEO_MODEL = 'veo-3.1-fast-generate-preview';

function makeCitation(partial: Omit<Citation, 'id' | 'accessedAt'>): Citation {
  return {
    ...partial,
    id: crypto.randomUUID(),
    accessedAt: new Date().toISOString(),
  };
}

function stripMarkdownJson(input: string) {
  const match = input.match(/```json\s*([\s\S]*?)```/i) || input.match(/```\s*([\s\S]*?)```/i);
  return match ? match[1].trim() : input.trim();
}

function parseDuration(secondsOrProto: string | undefined) {
  if (!secondsOrProto) return undefined;
  const totalSeconds = Number(secondsOrProto.replace('s', ''));
  if (Number.isNaN(totalSeconds)) return undefined;
  const minutes = Math.round(totalSeconds / 60);
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function normalizeSummary(input?: string | null) {
  return input?.replace(/\s+/g, ' ').trim();
}

async function fetchJson<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    const suffix = errorBody ? `: ${errorBody}` : '';
    throw new Error(`${response.status} ${response.statusText} for ${input}${suffix}`);
  }
  return response.json() as Promise<T>;
}

async function resolvePhotoUri(photoName?: string) {
  if (!photoName || !env.googleMapsApiKey) return undefined;

  const data = await fetchJson<{ photoUri?: string }>(
    `https://places.googleapis.com/v1/${photoName}/media?key=${env.googleMapsApiKey}&maxWidthPx=1200&skipHttpRedirect=true`,
  );
  return data.photoUri;
}

async function withRoutes(origin: Coordinates, destination: Coordinates) {
  if (!env.googleMapsApiKey) {
    return {};
  }

  try {
    const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': env.googleMapsApiKey,
        'X-Goog-FieldMask': ROUTES_MASK,
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
        destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
        travelMode: 'WALK',
      }),
    });

    if (!response.ok) {
      return {};
    }

    const data = (await response.json()) as {
      routes?: Array<{ distanceMeters?: number; duration?: string }>;
    };
    const route = data.routes?.[0];
    return {
      distanceMeters: route?.distanceMeters,
      durationText: parseDuration(route?.duration),
    };
  } catch {
    return {};
  }
}

function toDeepLink(origin: Coordinates | undefined, destination: Coordinates) {
  const params = new URLSearchParams({
    api: '1',
    destination: `${destination.lat},${destination.lng}`,
    travelmode: 'walking',
  });
  if (origin) {
    params.set('origin', `${origin.lat},${origin.lng}`);
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

async function mapGooglePlace(
  place: any,
  origin?: Coordinates,
): Promise<PlaceSummary> {
  const coordinates = {
    lat: place.location?.latitude || 0,
    lng: place.location?.longitude || 0,
  };
  const route = origin ? await withRoutes(origin, coordinates) : {};

  return {
    id: place.id || place.name?.replace('places/', '') || crypto.randomUUID(),
    providerPlaceId: place.id || place.name?.replace('places/', ''),
    name: place.displayName?.text || 'Unknown place',
    category: place.primaryTypeDisplayName?.text || 'Place',
    summary: normalizeSummary(place.editorialSummary?.text),
    address: place.formattedAddress,
    imageUrl: await resolvePhotoUri(place.photos?.[0]?.name),
    coordinates,
    distance: route.distanceMeters
      ? `${(route.distanceMeters / 1000).toFixed(1)} km`
      : undefined,
    distanceMeters: route.distanceMeters,
    durationText: route.durationText,
    mapsUrl: place.googleMapsUri,
    guide: {
      distanceMeters: route.distanceMeters,
      distanceText: route.distanceMeters
        ? `${(route.distanceMeters / 1000).toFixed(1)} km walk`
        : undefined,
      durationText: route.durationText,
      deepLinkUrl: toDeepLink(origin, coordinates),
    },
  };
}

async function searchWikipedia(name: string) {
  try {
    const searchData = await fetchJson<any>(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
        name,
      )}&format=json&origin=*`,
    );
    const title = searchData.query?.search?.[0]?.title as string | undefined;
    if (!title) return null;

    const summary = await fetchJson<any>(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
    );
    return summary;
  } catch {
    return null;
  }
}

async function searchWikidata(name: string) {
  try {
    const result = await fetchJson<any>(
      `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(
        name,
      )}&language=en&format=json&limit=1&origin=*`,
    );
    const entityId = result.search?.[0]?.id as string | undefined;
    if (!entityId) return null;

    const entityData = await fetchJson<any>(
      `https://www.wikidata.org/wiki/Special:EntityData/${entityId}.json`,
    );
    return entityData.entities?.[entityId] || null;
  } catch {
    return null;
  }
}

function extractWikidataFacts(entity: any) {
  const facts: string[] = [];
  const claims = entity?.claims || {};

  const pushClaim = (property: string, label: string) => {
    const claim = claims[property]?.[0]?.mainsnak?.datavalue?.value;
    if (!claim) return;
    if (typeof claim === 'string') {
      facts.push(`${label}: ${claim}`);
      return;
    }
    if (claim.time) {
      facts.push(`${label}: ${claim.time.replace(/^[-+]/, '').split('T')[0]}`);
    }
  };

  pushClaim('P571', 'Established');
  pushClaim('P580', 'Start date');
  pushClaim('P625', 'Coordinates');
  return facts;
}

async function fetchKnowledge(name: string) {
  const citations: Citation[] = [];
  const facts: string[] = [];
  let summary = '';

  const wikipedia = await searchWikipedia(name);
  if (wikipedia?.extract) {
    summary = wikipedia.extract;
    citations.push(
      makeCitation({
        provider: 'Wikipedia',
        title: wikipedia.title || name,
        url: wikipedia.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(name)}`,
        snippet: wikipedia.extract,
        kind: 'summary',
        confidence: 'high',
      }),
    );
  }

  const wikidata = await searchWikidata(name);
  if (wikidata) {
    const wikidataFacts = extractWikidataFacts(wikidata);
    facts.push(...wikidataFacts);
    citations.push(
      makeCitation({
        provider: 'Wikidata',
        title: wikidata.labels?.en?.value || name,
        url: `https://www.wikidata.org/wiki/${wikidata.id}`,
        snippet: wikidata.descriptions?.en?.value,
        kind: 'fact',
        confidence: 'medium',
      }),
    );
  }

  return {
    summary,
    facts,
    citations,
  };
}

async function fetchLibraryOfCongressAssets(name: string): Promise<HistoricalAsset[]> {
  try {
    const data = await fetchJson<any>(
      `https://www.loc.gov/pictures/search/?q=${encodeURIComponent(name)}&fo=json`,
    );
    const results = Array.isArray(data.results) ? data.results.slice(0, 3) : [];
    return results
      .map((item: any) => {
        const imageUrl =
          item.image_url?.[0] || item.thumbnail?.url || item.url;
        if (!imageUrl) return null;
        const sourceUrl = item.url || imageUrl;
        return {
          id: `loc-${item.id || crypto.randomUUID()}`,
          title: item.title || name,
          imageUrl,
          sourceName: 'Library of Congress',
          sourceUrl,
          type: 'archival' as const,
          yearLabel: item.date,
          description: normalizeSummary(item.description?.[0]),
          citations: [
            makeCitation({
              provider: 'Library of Congress',
              title: item.title || name,
              url: sourceUrl,
              snippet: normalizeSummary(item.description?.[0]),
              kind: 'image',
              confidence: 'high',
            }),
          ],
        };
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function fetchInternetArchiveAssets(name: string): Promise<HistoricalAsset[]> {
  try {
    const query = encodeURIComponent(`title:(${name}) AND mediatype:(image)`);
    const data = await fetchJson<any>(
      `https://archive.org/advancedsearch.php?q=${query}&fl[]=identifier&fl[]=title&fl[]=description&rows=3&page=1&output=json`,
    );
    const docs = data.response?.docs || [];
    return docs.map((doc: any) => {
      const sourceUrl = `https://archive.org/details/${doc.identifier}`;
      return {
        id: `ia-${doc.identifier}`,
        title: doc.title || name,
        imageUrl: `https://archive.org/services/img/${doc.identifier}`,
        sourceName: 'Internet Archive',
        sourceUrl,
        type: 'archival' as const,
        description: normalizeSummary(
          Array.isArray(doc.description) ? doc.description[0] : doc.description,
        ),
        citations: [
          makeCitation({
            provider: 'Internet Archive',
            title: doc.title || name,
            url: sourceUrl,
            snippet: normalizeSummary(
              Array.isArray(doc.description) ? doc.description[0] : doc.description,
            ),
            kind: 'image',
            confidence: 'medium',
          }),
        ],
      };
    });
  } catch {
    return [];
  }
}

function buildGrounding(citations: Citation[], facts: string[], inferredClaims: string[]) {
  const overallConfidence: 'high' | 'medium' | 'low' =
    citations.length >= 2 ? 'high' : citations.length === 1 ? 'medium' : 'low';
  const placeConfidence: 'high' | 'medium' | 'low' = citations.length ? 'high' : 'medium';
  const signalStrength: 'strong' | 'moderate' | 'weak' =
    citations.length >= 2 ? 'strong' : citations.length === 1 ? 'moderate' : 'weak';

  return {
    overallConfidence,
    overallScore: Math.min(1, 0.35 + citations.length * 0.2 + facts.length * 0.05),
    placeConfidence,
    placeConfidenceScore: Math.min(1, 0.5 + citations.length * 0.15),
    mode: 'explain' as const,
    signals: [
      {
        name: 'Citations',
        strength: signalStrength,
        value: Math.min(1, citations.length / 3),
        description: 'Real-source citations attached to this result',
      },
    ],
    sources: citations.map((citation) => ({
      id: citation.id,
      name: citation.provider,
      url: citation.url,
      reliability: citation.confidence,
    })),
    verifiedFacts: facts,
    inferredClaims,
    reconstructedElements: [],
    whyThisMatch: citations.length
      ? 'Matched against real provider responses and enriched with cited knowledge sources.'
      : 'Matched against provider responses without additional public knowledge citations.',
    recoveryHints: ['Center the landmark', 'Move closer', 'Enable location for better place matching'],
    disclaimer: 'Facts and media are sourced from external providers and may update over time.',
  };
}

export function getCapabilities(): CapabilityState {
  const limitations: string[] = [];
  if (!env.databaseUrl) limitations.push('Postgres is not configured.');
  if (!env.geminiApiKey) limitations.push('Gemini API access is not configured.');
  if (!env.googleMapsApiKey) limitations.push('Google Maps APIs are not configured.');
  if (!authConfigured()) limitations.push('Google sign-in is not configured.');
  if (!storageAvailable()) limitations.push('Cloud storage is not configured; media URLs will be inline only.');

  return {
    database: Boolean(env.databaseUrl),
    gemini: Boolean(env.geminiApiKey),
    places: Boolean(env.googleMapsApiKey),
    routes: Boolean(env.googleMapsApiKey),
    live: Boolean(env.geminiApiKey),
    historical: true,
    media: Boolean(env.geminiApiKey),
    auth: authConfigured(),
    storage: storageAvailable(),
    limitations,
  };
}

function authConfigured() {
  return Boolean(
    env.googleClientId &&
      env.googleClientSecret &&
      env.googleAuthRedirectUri &&
      env.sessionSecret,
  );
}

export async function resolvePlaceByQuery(query: string, origin?: Coordinates) {
  if (!env.googleMapsApiKey) {
    throw new Error('Google Places API is not configured');
  }

  const requestBody: Record<string, unknown> = {
    textQuery: query,
    maxResultCount: 1,
    languageCode: 'en',
  };

  if (origin) {
    requestBody.locationBias = {
      circle: {
        center: { latitude: origin.lat, longitude: origin.lng },
        radius: 50_000,
      },
    };
  }

  const data = await fetchJson<any>('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': env.googleMapsApiKey,
      'X-Goog-FieldMask': PLACE_TEXT_MASK,
    },
    body: JSON.stringify(requestBody),
  });

  const first = data.places?.[0];
  if (!first) return null;
  return mapGooglePlace(first, origin);
}

export async function fetchPlaceDetails(placeId: string, origin?: Coordinates): Promise<PlaceDetails | null> {
  if (!env.googleMapsApiKey) {
    throw new Error('Google Places API is not configured');
  }

  const place = await fetchJson<any>(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: {
      'X-Goog-Api-Key': env.googleMapsApiKey,
      'X-Goog-FieldMask': PLACE_DETAILS_MASK,
    },
  });

  const summary = await mapGooglePlace(place, origin);
  const knowledge = await fetchKnowledge(summary.name);
  const facts = knowledge.facts.slice(0, 5);
  const citations = knowledge.citations;

  return {
    ...summary,
    description: knowledge.summary || summary.summary,
    audioSummary: knowledge.summary || summary.summary,
    facts,
    didYouKnow: facts[0],
    verifiedFacts: facts,
    inferredClaims: [],
    reconstructedClaims: [],
    citations,
    grounding: buildGrounding(citations, facts, []),
    followUpSuggestions: ['Why is it important?', 'Show nearby places', 'Guide me there'],
    historicalAssets: [],
  };
}

export async function fetchNearbyPlaces(origin: Coordinates) {
  if (!env.googleMapsApiKey) {
    throw new Error('Google Places API is not configured');
  }

  const data = await fetchJson<any>('https://places.googleapis.com/v1/places:searchNearby', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': env.googleMapsApiKey,
      'X-Goog-FieldMask': PLACE_TEXT_MASK,
    },
    body: JSON.stringify({
      includedTypes: ['tourist_attraction', 'museum', 'historical_landmark'],
      maxResultCount: 5,
      locationRestriction: {
        circle: {
          center: { latitude: origin.lat, longitude: origin.lng },
          radius: 5_000,
        },
      },
      languageCode: 'en',
    }),
  });

  const places = data.places || [];
  return Promise.all(places.map((place: any) => mapGooglePlace(place, origin)));
}

export async function explainScene(params: {
  imageBase64: string;
  query?: string;
  origin?: Coordinates;
}): Promise<PlaceDetails> {
  if (!ai) {
    throw new Error('Gemini API is not configured');
  }

  const prompt = `
Return JSON with keys:
- name
- category
- summary
- verifiedFacts (array of strings)
- inferredClaims (array of strings)
- followUpSuggestions (array of short strings)

Use the image and user question to identify the landmark or place. If uncertain, still provide the best place name candidate and say so in inferredClaims.
User question: ${params.query || 'What place is this?'}
`;

  const response = await ai.models.generateContent({
    model: REASONING_MODEL,
    contents: {
      parts: [
        { inlineData: { data: params.imageBase64, mimeType: 'image/jpeg' } },
        { text: prompt },
      ],
    },
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
    },
  });

  const parsed = JSON.parse(stripMarkdownJson(response.text));
  const resolved = await resolvePlaceByQuery(parsed.name, params.origin);
  if (!resolved?.providerPlaceId) {
    throw new Error('Unable to resolve detected place to Google Places');
  }

  const details = await fetchPlaceDetails(resolved.providerPlaceId, params.origin);
  if (!details) {
    throw new Error('Unable to load place details');
  }

  const verifiedFacts = Array.from(new Set([...(parsed.verifiedFacts || []), ...details.verifiedFacts])).slice(0, 6);
  const inferredClaims = Array.from(new Set([...(parsed.inferredClaims || []), ...details.inferredClaims]));

  return {
    ...details,
    category: parsed.category || details.category,
    summary: parsed.summary || details.summary,
    description: parsed.summary || details.description,
    audioSummary: parsed.summary || details.audioSummary,
    verifiedFacts,
    facts: verifiedFacts,
    didYouKnow: verifiedFacts[0] || details.didYouKnow,
    inferredClaims,
    followUpSuggestions:
      parsed.followUpSuggestions?.length ? parsed.followUpSuggestions : details.followUpSuggestions,
    grounding: buildGrounding(details.citations, verifiedFacts, inferredClaims),
  };
}

export async function fetchHistoricalAssets(place: PlaceSummary) {
  const [locAssets, archiveAssets, knowledge] = await Promise.all([
    fetchLibraryOfCongressAssets(place.name),
    fetchInternetArchiveAssets(place.name),
    fetchKnowledge(place.name),
  ]);

  const assets = [...locAssets, ...archiveAssets];
  const citations = [
    ...knowledge.citations,
    ...assets.flatMap((asset) => asset.citations),
  ];

  return {
    assets,
    citations,
    summary: knowledge.summary,
    facts: knowledge.facts,
  };
}

export async function reconstructHistoricalView(params: {
  imageBase64: string;
  place: PlaceSummary;
  citations: Citation[];
}) {
  if (!ai) {
    throw new Error('Gemini API is not configured');
  }

  if (params.citations.length === 0) {
    throw new Error('Historical reconstruction requires real-source citations');
  }

  const response = await ai.models.generateContent({
    model: IMAGE_MODEL,
    contents: {
      parts: [
        { inlineData: { data: params.imageBase64, mimeType: 'image/jpeg' } },
        {
          text: `Reconstruct ${params.place.name} using only historically plausible details inferred from these cited records: ${params.citations
            .map((citation) => `${citation.provider}: ${citation.title}`)
            .join('; ')}.`,
        },
      ],
    },
  });

  const imagePart = response.candidates?.[0]?.content?.parts?.find((part) => part.inlineData);
  if (!imagePart?.inlineData?.data) {
    throw new Error('No historical reconstruction was generated');
  }

  const assetUrl = await saveBase64Asset({
    base64Data: imagePart.inlineData.data,
    mimeType: imagePart.inlineData.mimeType || 'image/jpeg',
    folder: 'historical',
    filenameHint: params.place.id,
  });

  return {
    id: `reconstruction-${params.place.id}`,
    title: `${params.place.name} reconstruction`,
    imageUrl: assetUrl,
    sourceName: 'Gemini reconstruction',
    sourceUrl: params.citations[0].url,
    type: 'reconstruction' as const,
    description: 'AI reconstruction generated from real historical citations.',
    citations: params.citations,
  };
}

export async function chatWithLensIQ(params: {
  message: string;
  useSearch?: boolean;
  useThinking?: boolean;
  imageBase64?: string;
  place?: PlaceSummary | null;
}) {
  if (!ai) {
    throw new Error('Gemini API is not configured');
  }

  const text = params.place
    ? `Current place context: ${params.place.name}. ${params.place.summary || ''}\n\nUser: ${params.message}`
    : params.message;

  const response = await ai.models.generateContent({
    model: params.useThinking ? REASONING_MODEL : CHAT_MODEL,
    contents: params.imageBase64
      ? {
          parts: [
            { inlineData: { data: params.imageBase64, mimeType: 'image/jpeg' } },
            { text },
          ],
        }
      : text,
    config: {
      thinkingConfig: params.useThinking
        ? { thinkingLevel: ThinkingLevel.HIGH }
        : undefined,
      tools: params.useSearch ? [{ googleSearch: {} }] : undefined,
    },
  });

  return response.text;
}

export async function generateImageFromPrompt(prompt: string, size: '1K' | '2K' | '4K') {
  if (!ai) {
    throw new Error('Gemini API is not configured');
  }

  const response = await ai.models.generateContent({
    model: IMAGE_MODEL,
    contents: prompt,
    config: {
      imageConfig: {
        aspectRatio: '1:1',
        imageSize: size,
      },
    },
  });

  const imagePart = response.candidates?.[0]?.content?.parts?.find((part) => part.inlineData);
  if (!imagePart?.inlineData?.data) {
    throw new Error('No image was generated');
  }

  return saveBase64Asset({
    base64Data: imagePart.inlineData.data,
    mimeType: imagePart.inlineData.mimeType || 'image/jpeg',
    folder: 'generated-images',
    filenameHint: 'create',
  });
}

export async function generateVideoFromImage(imageBase64: string, prompt: string) {
  if (!ai || !env.geminiApiKey) {
    throw new Error('Gemini API is not configured');
  }

  let operation = await ai.models.generateVideos({
    model: VIDEO_MODEL,
    prompt,
    image: {
      imageBytes: imageBase64,
      mimeType: 'image/jpeg',
    },
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '9:16',
    },
  });

  while (!operation.done) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    operation = await ai.operations.getVideosOperation({ operation });
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) {
    throw new Error('No video was generated');
  }

  const response = await fetch(downloadLink, {
    headers: {
      'x-goog-api-key': env.geminiApiKey,
    },
  });
  const arrayBuffer = await response.arrayBuffer();
  const base64Data = Buffer.from(arrayBuffer).toString('base64');

  return saveBase64Asset({
    base64Data,
    mimeType: 'video/mp4',
    folder: 'generated-videos',
    filenameHint: 'animate',
  });
}

export async function analyzeVideo(videoBase64: string, mimeType: string, prompt: string) {
  if (!ai) {
    throw new Error('Gemini API is not configured');
  }

  const response = await ai.models.generateContent({
    model: CHAT_MODEL,
    contents: {
      parts: [
        { inlineData: { data: videoBase64, mimeType } },
        { text: prompt },
      ],
    },
  });

  return response.text;
}

export async function createLiveSession(callbacks: {
  onMessage: (event: any) => void;
  onError: (error: Error) => void;
  onClose: () => void;
}) {
  if (!ai) {
    throw new Error('Gemini API is not configured');
  }

  return ai.live.connect({
    model: LIVE_MODEL,
    config: {
      responseModalities: [Modality.AUDIO],
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      realtimeInputConfig: {
        automaticActivityDetection: {
          disabled: true,
        },
        activityHandling: ActivityHandling.START_OF_ACTIVITY_INTERRUPTS,
      },
    },
    callbacks: {
      onmessage: callbacks.onMessage,
      onerror: (event: any) => callbacks.onError(event.error || new Error('Live API error')),
      onclose: callbacks.onClose,
    },
  });
}
