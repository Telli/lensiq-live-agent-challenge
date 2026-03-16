import { useState, useCallback } from 'react';
import { videoAnalysisService } from '../services/media/videoAnalysis.service';

export function useVideo() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeVideo = useCallback(async (videoBase64: string, mimeType: string, prompt: string) => {
    try {
      setIsAnalyzing(true);
      setError(null);
      const result = await videoAnalysisService.analyzeVideo(videoBase64, mimeType, prompt);
      setAnalysis(result);
    } catch (err) {
      console.error("Error analyzing video:", err);
      setError('Failed to analyze video');
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const reset = useCallback(() => {
    setAnalysis(null);
    setError(null);
  }, []);

  return {
    isAnalyzing,
    analysis,
    error,
    analyzeVideo,
    reset
  };
}
