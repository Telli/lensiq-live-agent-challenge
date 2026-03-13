import { useState, useEffect } from 'react';
import { SavedPlace } from '../types';
import { mockSavedPlaces } from '../mocks';

export function useSavedPlaces() {
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSavedPlaces = async () => {
      try {
        setIsLoading(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setSavedPlaces(mockSavedPlaces);
      } catch (err) {
        setError('Failed to load saved places');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSavedPlaces();
  }, []);

  return { savedPlaces, isLoading, error };
}
