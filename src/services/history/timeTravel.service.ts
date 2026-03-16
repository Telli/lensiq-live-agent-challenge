import type {
  Coordinates,
  HistoricalAsset,
  PlaceDetails,
  PlaceSummary,
} from '../../types';
import { apiRequest } from '../api/client';
import { ApiRequestError } from '../api/client';

export interface HistoryResponse {
  place: PlaceSummary;
  summary?: string;
  facts: string[];
  citations: any[];
  assets: HistoricalAsset[];
  canReconstruct: boolean;
}

let reconstructionRateLimitUntilMs = 0;
let reconstructionRateLimitNote: string | null = null;

function parseRetryDelayMs(message: string) {
  const match = message.match(/retry in\s+([\d.]+)s/i);
  if (!match) {
    return 60_000;
  }

  return Math.max(15_000, Math.ceil(Number(match[1]) * 1000));
}

function isRateLimitError(error: unknown) {
  return (
    error instanceof ApiRequestError
      ? error.status === 429
      : error instanceof Error &&
        /(quota|rate limit|resource_exhausted|maximum limit)/i.test(error.message)
  );
}

export const timeTravelService = {
  canAttemptHistoricalReconstruction() {
    return Date.now() >= reconstructionRateLimitUntilMs;
  },

  getHistoricalReconstructionStatusNote() {
    if (Date.now() >= reconstructionRateLimitUntilMs) {
      reconstructionRateLimitUntilMs = 0;
      reconstructionRateLimitNote = null;
      return null;
    }

    return reconstructionRateLimitNote;
  },

  async getHistoricalAssets(placeId: string) {
    return apiRequest<HistoryResponse>(`/api/places/${placeId}/history`);
  },

  async generateHistoricalImage(placeId: string, imageBase64: string) {
    if (Date.now() < reconstructionRateLimitUntilMs) {
      throw new Error(
        reconstructionRateLimitNote ||
          'Historical image generation is temporarily rate-limited.',
      );
    }

    try {
      return await apiRequest<HistoricalAsset>(`/api/places/${placeId}/history/reconstruct`, {
        method: 'POST',
        body: JSON.stringify({
          imageBase64,
        }),
      });
    } catch (error) {
      if (isRateLimitError(error)) {
        const delayMs = parseRetryDelayMs(
          error instanceof Error ? error.message : 'Retry in 60s.',
        );
        reconstructionRateLimitUntilMs = Date.now() + delayMs;
        const retrySeconds = Math.ceil(delayMs / 1000);
        reconstructionRateLimitNote = `Landmark reconstruction is temporarily rate-limited. LensIQ will stay in source-led summary mode for about ${retrySeconds}s.`;
      }
      throw error;
    }
  },

  async resolvePlace(query: string, coordinates?: Coordinates) {
    return apiRequest<PlaceDetails>('/api/places/resolve', {
      method: 'POST',
      body: JSON.stringify({
        query,
        coordinates,
      }),
    });
  },
};
