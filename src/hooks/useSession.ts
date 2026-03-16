import { useState, useEffect, useCallback } from 'react';
import type { Citation, PlaceSummary, Session, TranscriptMessage } from '../types';
import { apiRequest } from '../services/api/client';

interface EndSessionPayload {
  id?: string;
  title?: string;
  createdAt?: string;
  thumbnailUrl?: string;
  transcript: TranscriptMessage[];
  placesExplored: PlaceSummary[];
  citations?: Citation[];
  generatedAssetUrls?: string[];
}

export function useSession(enabled: boolean = true) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    if (!enabled) {
      setSessions([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await apiRequest<Session[]>('/api/sessions');
      setSessions(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load sessions');
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const endSession = async (payload: EndSessionPayload) => {
    const response = await apiRequest<{ id: string }>('/api/sessions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    await fetchSessions();
    return response.id;
  };

  const getSession = async (sessionId: string) => {
    return apiRequest<Session>(`/api/sessions/${sessionId}`);
  };

  return { sessions, isLoading, error, endSession, getSession, refresh: fetchSessions };
}
