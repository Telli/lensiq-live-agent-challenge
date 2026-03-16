import type { PlaceSummary } from '../../types';
import { apiRequest } from '../api/client';

export const searchService = {
  async search(query: string, place?: PlaceSummary | null) {
    const response = await apiRequest<{ text: string }>('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: query,
        useSearch: true,
        place: place || undefined,
      }),
    });
    return response.text;
  },
};
