import { useState, useCallback } from 'react';
import { Place } from '../types';
import { aiService } from '../services/aiService';

export function useTimeTravel() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [historicalImage, setHistoricalImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateHistoricalView = useCallback(async (place: Place, year: string) => {
    try {
      setIsGenerating(true);
      setError(null);
      
      const base64Image = (window as any).lastCapturedFrame;
      if (!base64Image) {
        throw new Error("No camera frame captured");
      }

      const image = await aiService.generateHistoricalImage(base64Image, year, place.name);
      setHistoricalImage(image);
    } catch (err) {
      console.error("Error generating historical view:", err);
      setError('Failed to generate historical view');
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const reset = useCallback(() => {
    setHistoricalImage(null);
    setError(null);
  }, []);

  return {
    isGenerating,
    historicalImage,
    error,
    generateHistoricalView,
    reset
  };
}
