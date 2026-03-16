import type { PlaceSummary } from '../../types';
import { apiRequest } from '../api/client';

export const nearbyService = {
  async getNearbyAttractions(latitude: number, longitude: number): Promise<PlaceSummary[]> {
    return apiRequest<PlaceSummary[]>(`/api/places/nearby?lat=${latitude}&lng=${longitude}`);
  },
};
