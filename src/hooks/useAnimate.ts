import { useState, useCallback } from 'react';
import { aiService } from '../services/aiService';

export function useAnimate() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateVideo = useCallback(async (imageBase64: string, prompt: string) => {
    try {
      setIsGenerating(true);
      setError(null);
      const url = await aiService.generateVideo(imageBase64, prompt);
      setVideoUrl(url);
    } catch (err) {
      console.error("Error generating video:", err);
      setError('Failed to generate video');
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const reset = useCallback(() => {
    setVideoUrl(null);
    setError(null);
  }, []);

  return {
    isGenerating,
    videoUrl,
    error,
    generateVideo,
    reset
  };
}
