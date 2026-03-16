import { apiRequest } from '../api/client';

export const videoGenerationService = {
  async generateVideo(imageBase64: string, prompt: string) {
    const response = await apiRequest<{ url: string }>('/api/media/video', {
      method: 'POST',
      body: JSON.stringify({
        imageBase64,
        prompt,
      }),
    });
    return response.url;
  },
};
