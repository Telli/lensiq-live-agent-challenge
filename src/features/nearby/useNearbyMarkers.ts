import { useMemo } from 'react';
import type { Coordinates, PlaceSummary, TrackingState } from '../../types';
import type { NearbyMarker } from '../../types/ar';
import type { NearbyViewModel } from '../../services/orchestrator/orchestrator.types';
import {
  bearingToScreenOffset,
  calculateBearing,
  classifyMarkerBand,
  normalizeBearingDelta,
} from '../../services/location/bearing';

export function useNearbyMarkers(
  nearby: NearbyViewModel | null,
  tracking: TrackingState | null,
  location: Coordinates | null,
  guideDestination: PlaceSummary | null,
): NearbyMarker[] {
  return useMemo(() => {
    if (!nearby?.places.length || !location) return [];
    const headingDegrees = tracking?.headingDegrees ?? 0;

    return nearby.places.slice(0, 5).map((place, index) => {
      const absoluteBearing = calculateBearing(location, place.coordinates);
      const relativeBearing = normalizeBearingDelta(absoluteBearing, headingDegrees);
      const placement = bearingToScreenOffset(relativeBearing);
      const band = classifyMarkerBand(relativeBearing);

      return {
        id: place.id,
        name: place.name,
        distanceText:
          place.guide?.durationText ||
          place.durationText ||
          place.distance ||
          'Nearby',
        side: band,
        priority: index + 1,
        category: place.category,
        relativeBearingDegrees: relativeBearing,
        absoluteBearingDegrees: absoluteBearing,
        screenX: placement.screenX,
        screenY: placement.screenY,
        edge: placement.edge,
        isOffscreen: placement.isOffscreen,
        isGuided: guideDestination?.id === place.id,
      };
    });
  }, [guideDestination, location, nearby, tracking?.headingDegrees]);
}
