import { useEffect, useRef } from 'react';
import type { ExploreMode, TrackingState } from '../../types';
import type { CapturedFrame } from '../../services/session/frameStore';

interface AutoExplainState {
  lastPlaceId?: string;
  lastTriggeredAt?: number;
  lastAttemptAt?: number;
  lastErrorAt?: number;
  inFlight: boolean;
}

interface UseAutoExplainParams {
  mode: ExploreMode;
  latestFrame: CapturedFrame | null;
  tracking: TrackingState | null;
  autoExplain: AutoExplainState;
  activePlaceId?: string;
  onTrigger: () => void;
}

const FRAME_MAX_AGE_MS = 1500;
const STABLE_HOLD_MS = 1200;
const PLACE_COOLDOWN_MS = 20000;
const ATTEMPT_COOLDOWN_MS = 10000;
const ERROR_COOLDOWN_MS = 60000;

export function useAutoExplain({
  mode,
  latestFrame,
  tracking,
  autoExplain,
  activePlaceId,
  onTrigger,
}: UseAutoExplainParams) {
  const stableSinceRef = useRef<number | null>(null);

  useEffect(() => {
    if (mode !== 'explain' || !latestFrame || !tracking) {
      stableSinceRef.current = null;
      return;
    }

    const frameAge = Date.now() - latestFrame.timestamp;
    const hasFreshFrame = frameAge <= FRAME_MAX_AGE_MS;
    const isStable = Boolean(tracking.isStable && (tracking.stabilityScore || 0) >= 0.85);
    const samePlaceLocked =
      Boolean(activePlaceId) && activePlaceId === autoExplain.lastPlaceId;
    const withinPlaceCooldown =
      Boolean(autoExplain.lastTriggeredAt) &&
      Date.now() - (autoExplain.lastTriggeredAt || 0) < PLACE_COOLDOWN_MS &&
      samePlaceLocked;
    const withinAttemptCooldown =
      !activePlaceId &&
      Boolean(autoExplain.lastAttemptAt) &&
      Date.now() - (autoExplain.lastAttemptAt || 0) < ATTEMPT_COOLDOWN_MS;
    const withinErrorCooldown =
      Boolean(autoExplain.lastErrorAt) &&
      Date.now() - (autoExplain.lastErrorAt || 0) < ERROR_COOLDOWN_MS;

    if (
      !hasFreshFrame ||
      !isStable ||
      autoExplain.inFlight ||
      withinPlaceCooldown ||
      withinAttemptCooldown ||
      withinErrorCooldown
    ) {
      stableSinceRef.current = null;
      return;
    }

    if (stableSinceRef.current === null) {
      stableSinceRef.current = Date.now();
      return;
    }

    if (Date.now() - stableSinceRef.current >= STABLE_HOLD_MS) {
      stableSinceRef.current = null;
      onTrigger();
    }
  }, [activePlaceId, autoExplain, latestFrame, mode, onTrigger, tracking]);
}
