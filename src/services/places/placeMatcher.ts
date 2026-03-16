import type { Coordinates, PlaceDetails } from '../../types';
import { apiRequest } from '../api/client';

export const placeMatcher = {
  resolvePlace: async (
    query: string,
    lat?: number,
    lng?: number,
  ): Promise<PlaceDetails | null> => {
    try {
      return apiRequest<PlaceDetails>('/api/places/resolve', {
        method: 'POST',
        body: JSON.stringify({
          query,
          coordinates:
            typeof lat === 'number' && typeof lng === 'number'
              ? ({ lat, lng } satisfies Coordinates)
              : undefined,
        }),
      });
    } catch {
      return null;
    }
  },
};
