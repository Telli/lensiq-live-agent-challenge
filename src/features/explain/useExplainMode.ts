import { useState, useCallback } from 'react';
import type { Place } from '../../types';
import { explainService } from '../../services/ai/explain.service';
import { frameStore } from '../../services/session/frameStore';
import { liveSessionService } from '../../services/live/liveSession.service';

export function useExplainMode() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const explainCurrentView = useCallback(async (userQuery?: string): Promise<Place | null> => {
    try {
      setIsProcessing(true);
      setError(null);

      const frame = frameStore.getLatestFrame();
      if (!frame?.data) {
        throw new Error('No frame available');
      }

      let coordinates;
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 3000,
            }),
          );
          coordinates = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
        } catch {
          coordinates = undefined;
        }
      }

      const place = await explainService.explainImage(frame.data, userQuery, coordinates);
      liveSessionService.addTranscriptMessage({
        role: 'ai',
        text: place.audioSummary || place.summary || place.name,
      });
      return place;
    } catch (err: any) {
      console.error('Explain error', err);
      setError(err.message || 'Failed to explain the current view.');
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return {
    explainCurrentView,
    isProcessing,
    error,
  };
}
