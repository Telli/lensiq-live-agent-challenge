import { useState, useEffect } from 'react';
import { NearbyAttraction } from '../../types';
import { nearbyService } from '../../services/places/nearby.service';

export function useNearbyMode() {
  const [attractions, setAttractions] = useState<NearbyAttraction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAttractions = async () => {
      try {
        setIsLoading(true);
        let lat = 0;
        let lng = 0;

        if (typeof navigator === 'undefined' || !navigator.geolocation) {
          throw new Error('Geolocation is not available on this device');
        }

        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 7000,
          });
        });
        lat = position.coords.latitude;
        lng = position.coords.longitude;

        const result = await nearbyService.getNearbyAttractions(lat, lng);
        setAttractions(result || []);
      } catch (err) {
        console.error('Error fetching nearby attractions:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to load nearby attractions',
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchAttractions();
  }, []);

  return { attractions, isLoading, error };
}
