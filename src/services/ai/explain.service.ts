import type { Coordinates, PlaceDetails } from '../../types';
import { apiRequest } from '../api/client';

export const explainService = {
  async explainImage(
    imageBase64: string,
    query?: string,
    coordinates?: Coordinates,
  ): Promise<PlaceDetails> {
    return apiRequest<PlaceDetails>('/api/explore/explain', {
      method: 'POST',
      body: JSON.stringify({
        imageBase64,
        query,
        coordinates,
      }),
    });
  },

  async fastResponse(message: string) {
    const response = await apiRequest<{ text: string }>('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message,
      }),
    });
    return response.text;
  },
};
