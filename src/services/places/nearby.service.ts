import type { PlaceSummary } from '../../types';
import { ApiRequestError, apiRequest } from '../api/client';

const CACHE_TTL_MS = 3 * 60 * 1000;
const nearbyCache = new Map<string, { expiresAt: number; value: PlaceSummary[] }>();
let placesCooldownUntilMs = 0;
let placesCooldownNote = 'Google Places is temporarily rate-limited. Try again shortly.';

function makeKey(latitude: number, longitude: number) {
  return `${latitude.toFixed(3)}:${longitude.toFixed(3)}`;
}

function isRateLimitError(error: unknown) {
  return (
    error instanceof ApiRequestError
      ? error.status === 429
      : error instanceof Error && /(429|rate limit|quota|resource_exhausted|maximum limit)/i.test(error.message)
  );
}

function parseRetryDelayMs(message: string) {
  const match = message.match(/retry in\s+([\d.]+)s/i);
  if (!match) {
    return 60_000;
  }
  return Math.max(15_000, Math.ceil(Number(match[1]) * 1000));
}

export const nearbyService = {
  async getNearbyAttractions(latitude: number, longitude: number): Promise<PlaceSummary[]> {
    const key = makeKey(latitude, longitude);
    const cached = nearbyCache.get(key);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.value;
    }

    if (Date.now() < placesCooldownUntilMs) {
      throw new Error(placesCooldownNote);
    }

    try {
      const places = await apiRequest<PlaceSummary[]>(`/api/places/nearby?lat=${latitude}&lng=${longitude}`);
      nearbyCache.set(key, {
        value: places,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
      return places;
    } catch (error) {
      if (isRateLimitError(error)) {
        const message = error instanceof Error ? error.message : 'Retry in 60s.';
        const delayMs = parseRetryDelayMs(message);
        placesCooldownUntilMs = Date.now() + delayMs;
        placesCooldownNote = message;
      }
      throw error;
    }
  },
};
