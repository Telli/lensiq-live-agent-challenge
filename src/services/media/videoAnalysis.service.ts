import { apiRequest } from '../api/client';

export const videoAnalysisService = {
  async analyzeVideo(videoBase64: string, mimeType: string, prompt: string) {
    const response = await apiRequest<{ text: string }>('/api/media/video-analysis', {
      method: 'POST',
      body: JSON.stringify({
        videoBase64,
        mimeType,
        prompt,
      }),
    });
    return response.text;
  },
};
