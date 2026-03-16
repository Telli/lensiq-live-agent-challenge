import type { Coordinates, PlaceDetails } from '../../types';
import { apiRequest } from '../api/client';

export const explainService = {
  async explainScene(imageBase64: string, coordinates?: Coordinates, query?: string) {
    return apiRequest<PlaceDetails>('/api/explore/explain', {
      method: 'POST',
      body: JSON.stringify({
        imageBase64,
        coordinates,
        query,
      }),
    });
  },
};
