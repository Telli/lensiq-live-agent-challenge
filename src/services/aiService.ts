import type { PlaceSummary } from '../types';
import { apiRequest } from './api/client';

function stripMarkdownJson(input: string) {
  return input.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
}

function parseJson<T>(input: string): T {
  return JSON.parse(stripMarkdownJson(input)) as T;
}

export const aiService = {
  async complete(params: {
    prompt: string;
    imageBase64?: string;
    useSearch?: boolean;
    useThinking?: boolean;
    place?: PlaceSummary | null;
  }) {
    const response = await apiRequest<{ text: string }>('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: params.prompt,
        useSearch: params.useSearch,
        useThinking: params.useThinking,
        imageBase64: params.imageBase64,
        place: params.place || undefined,
      }),
    });
    return response.text;
  },

  async completeJson<T>(params: {
    prompt: string;
    imageBase64?: string;
    useSearch?: boolean;
    useThinking?: boolean;
    place?: PlaceSummary | null;
  }) {
    const text = await this.complete(params);
    return parseJson<T>(text);
  },

  async generateImage(prompt: string, size: '1K' | '2K' | '4K' = '1K') {
    const response = await apiRequest<{ url: string }>('/api/media/image', {
      method: 'POST',
      body: JSON.stringify({ prompt, size }),
    });
    return response.url;
  },
};
