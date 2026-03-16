import { useState, useCallback } from 'react';
import { imageGenerationService } from '../services/media/imageGeneration.service';

export function useCreate() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateImage = useCallback(async (prompt: string, size: "1K" | "2K" | "4K") => {
    try {
      setIsGenerating(true);
      setError(null);
      const url = await imageGenerationService.generateHighQualityImage(prompt, size);
      setImageUrl(url);
    } catch (err) {
      console.error("Error generating image:", err);
      setError('Failed to generate image');
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const reset = useCallback(() => {
    setImageUrl(null);
    setError(null);
  }, []);

  return {
    isGenerating,
    imageUrl,
    error,
    generateImage,
    reset
  };
}
