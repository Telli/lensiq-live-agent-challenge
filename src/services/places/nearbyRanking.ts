import { NearbyAttraction } from '../../types';
import { seattleLandmarks } from '../../data/landmarks/seattle';

export const nearbyRanking = {
  rankByProximity: (lat: number, lng: number): NearbyAttraction[] => {
    const ranked = seattleLandmarks.map(p => {
      const dLat = Math.abs(p.coordinates.lat - lat) * 69;
      const dLng = Math.abs(p.coordinates.lng - lng) * 54;
      const dist = Math.sqrt(dLat * dLat + dLng * dLng);
      return { 
        place: p, 
        distanceMiles: dist,
        distanceText: dist < 0.2 ? "Just steps away" : `${dist.toFixed(1)} miles away` 
      };
    }).sort((a, b) => a.distanceMiles - b.distanceMiles);

    return ranked.slice(0, 5).map(r => ({
      id: r.place.id,
      name: r.place.name,
      distanceText: r.distanceText,
      category: r.place.category,
      coordinates: r.place.coordinates,
      shortSummary: r.place.shortSummary,
      imageUrl: r.place.imageUrl
    }));
  }
};
