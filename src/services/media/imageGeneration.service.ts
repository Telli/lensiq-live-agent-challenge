import { apiRequest } from '../api/client';

export const imageGenerationService = {
  async generateHighQualityImage(prompt: string, size: '1K' | '2K' | '4K' = '1K') {
    const response = await apiRequest<{ url: string }>('/api/media/image', {
      method: 'POST',
      body: JSON.stringify({ prompt, size }),
    });
    return response.url;
  },
};
