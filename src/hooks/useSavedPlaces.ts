import { useState, useEffect, useCallback } from 'react';
import type { PlaceSummary, SavedPlace } from '../types';
import { apiRequest } from '../services/api/client';

export function useSavedPlaces(enabled: boolean = true) {
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSavedPlaces = useCallback(async () => {
    if (!enabled) {
      setSavedPlaces([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await apiRequest<SavedPlace[]>('/api/saved-places');
      setSavedPlaces(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load saved places');
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    fetchSavedPlaces();
  }, [fetchSavedPlaces]);

  const savePlace = async (place: PlaceSummary, notes?: string, collection?: string) => {
    const response = await apiRequest<{ id: string }>('/api/saved-places', {
      method: 'POST',
      body: JSON.stringify({
        place,
        notes,
        collection,
      }),
    });
    await fetchSavedPlaces();
    return response.id;
  };

  const unsavePlace = async (savedId: string) => {
    await apiRequest<void>(`/api/saved-places/${savedId}`, {
      method: 'DELETE',
    });
    await fetchSavedPlaces();
  };

  const updateSavedPlace = async (savedId: string, updates: { notes?: string; collection?: string }) => {
    await apiRequest<{ id: string }>(`/api/saved-places/${savedId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    await fetchSavedPlaces();
  };

  return { savedPlaces, isLoading, error, savePlace, unsavePlace, updateSavedPlace, refresh: fetchSavedPlaces };
}
