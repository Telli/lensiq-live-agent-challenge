import type { Coordinates } from '../../types';

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function toDegrees(value: number) {
  return (value * 180) / Math.PI;
}

export function calculateBearing(origin: Coordinates, destination: Coordinates) {
  const lat1 = toRadians(origin.lat);
  const lat2 = toRadians(destination.lat);
  const deltaLng = toRadians(destination.lng - origin.lng);

  const y = Math.sin(deltaLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);

  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}

export function normalizeBearingDelta(bearing: number, heading: number) {
  let delta = bearing - heading;
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;
  return delta;
}

export function classifyMarkerBand(relativeBearingDegrees: number) {
  if (relativeBearingDegrees < -25) return 'left' as const;
  if (relativeBearingDegrees > 25) return 'right' as const;
  return 'center' as const;
}

export function bearingToScreenOffset(relativeBearingDegrees: number) {
  const clamped = Math.max(-90, Math.min(90, relativeBearingDegrees));
  const normalized = clamped / 90;
  return {
    screenX: 50 + normalized * 38,
    screenY: 38 + Math.min(12, Math.abs(normalized) * 10),
    isOffscreen: Math.abs(relativeBearingDegrees) > 60,
    edge: Math.abs(relativeBearingDegrees) <= 25 ? 'center' : relativeBearingDegrees < 0 ? 'left' : 'right',
  };
}
