import type { PlaceSummary } from '../../types';
import { apiRequest } from '../api/client';

export const chatService = {
  async chat(
    message: string,
    useThinking: boolean = false,
    options?: { imageBase64?: string; place?: PlaceSummary | null; useSearch?: boolean },
  ) {
    const response = await apiRequest<{ text: string }>('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message,
        useThinking,
        useSearch: options?.useSearch,
        imageBase64: options?.imageBase64,
        place: options?.place || undefined,
      }),
    });
    return response.text;
  },
};
