import { aiService } from '../aiService';
import { ApiRequestError } from '../api/client';

let rateLimitUntilMs = 0;
let rateLimitNote: string | null = null;

function parseRetryDelayMs(message: string) {
  const match = message.match(/retry in\s+([\d.]+)s/i);
  if (!match) {
    return 60_000;
  }

  return Math.max(15_000, Math.ceil(Number(match[1]) * 1000));
}

function isRateLimitError(error: unknown) {
  return (
    error instanceof ApiRequestError
      ? error.status === 429
      : error instanceof Error &&
        /(quota|rate limit|resource_exhausted|maximum limit)/i.test(error.message)
  );
}

export const genMediaToolAdapter = {
  getStatusNote() {
    if (Date.now() >= rateLimitUntilMs) {
      rateLimitNote = null;
      return null;
    }

    return rateLimitNote;
  },
  async generateHistoricalScene(prompt: string) {
    if (Date.now() < rateLimitUntilMs) {
      return null;
    }

    try {
      return await aiService.generateImage(prompt, '2K');
    } catch (error) {
      if (isRateLimitError(error)) {
        const delayMs = parseRetryDelayMs(
          error instanceof Error ? error.message : 'Retry in 60s.',
        );
        rateLimitUntilMs = Date.now() + delayMs;
        const retrySeconds = Math.ceil(delayMs / 1000);
        rateLimitNote = `Historical image generation is temporarily rate-limited. LensIQ will stay in source-led summary mode for about ${retrySeconds}s.`;
      }
      return null;
    }
  },
};
