import { useCallback, useState } from 'react';
import type { PlaceFeedbackPayload } from '../types';
import { apiRequest } from '../services/api/client';

export function usePlaceFeedback() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitFeedback = useCallback(async (payload: PlaceFeedbackPayload) => {
    try {
      setIsSubmitting(true);
      setError(null);
      const response = await apiRequest<{ id: string }>('/api/place-feedback', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return response.id;
    } catch (err: any) {
      setError(err.message || 'Failed to submit feedback');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
  }, []);

  return { submitFeedback, isSubmitting, error, reset };
}
