import { ConfidenceLevel } from './grounding';

// --- New AR types for 6DOF tracking ---

export interface WorldPosition {
  x: number; // meters
  y: number; // meters
  z: number; // meters
}

export interface Pose6DOF {
  position: { x: number; y: number; z: number };
  orientation: { x: number; y: number; z: number; w: number };
  timestamp: number;
}

export interface ScreenProjection {
  x: number;       // 0-100 percentage
  y: number;       // 0-100 percentage
  scale: number;   // depth-based scale factor (0, 1]
  visible: boolean;
}

export type TrackingMode = '3dof' | '6dof';

export interface TrackingState {
  mode: TrackingMode;
  pose: Pose6DOF | null;
  driftOffset: { x: number; y: number };
  fps: number;
  headingDegrees?: number | null;
  pitchDegrees?: number | null;
  rollDegrees?: number | null;
  stabilityScore?: number;
  isStable?: boolean;
}

// --- Validation helpers ---

/**
 * Clamps a screen percentage value to the range [0, 100].
 */
export function clampScreenPercentage(value: number): number {
  return Math.min(100, Math.max(0, value));
}

/**
 * Clamps a scale value to the range (0, 1].
 * Values <= 0 are clamped to a small positive epsilon.
 * Values > 1 are clamped to 1.
 */
export function clampScale(value: number): number {
  const MIN_SCALE = 1e-6;
  if (value <= 0) return MIN_SCALE;
  if (value > 1) return 1;
  return value;
}

// --- Existing types (augmented with optional worldPosition) ---

export interface DetectionFrame {
  visible: boolean;
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  width: number; // percentage (0-100)
  height: number; // percentage (0-100)
  confidence: ConfidenceLevel;
  state: 'idle' | 'analyzing' | 'detected';
}

export interface AnchoredLabel {
  title: string;
  subtitle: string;
  confidence: ConfidenceLevel;
  distanceText?: string;
  secondaryFact?: string;
  x: number;              // screen percentage (0-100)
  y: number;              // screen percentage (0-100)
  worldPosition?: WorldPosition;
}

export interface NearbyMarker {
  id: string;
  name: string;
  distanceText: string;
  side: 'left' | 'center' | 'right';
  priority: number;
  category: string;
  relativeBearingDegrees?: number;
  absoluteBearingDegrees?: number;
  screenX?: number;
  screenY?: number;
  edge?: 'left' | 'right' | 'center';
  isOffscreen?: boolean;
  isGuided?: boolean;
}

export interface HotspotRegion {
  id: string;
  label: string;
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  kind: 'explain' | 'history' | 'detail';
  actionPayload?: any;
  worldPosition?: WorldPosition;
}

export interface CompareCallout {
  id: string;
  title: string;
  body: string;
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  worldPosition?: WorldPosition;
}
