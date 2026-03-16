import { useState, useEffect, useCallback, useRef } from 'react';
import { capacitorARPlugin } from '../plugins/capacitorAR';
import type { PluginListenerHandle } from '../plugins/capacitorAR';
import type { TrackingState, Pose6DOF } from '../types/ar';

const DEFAULT_TRACKING_STATE: TrackingState = {
  mode: '3dof',
  pose: null,
  driftOffset: { x: 0, y: 0 },
  fps: 15,
  headingDegrees: null,
  pitchDegrees: null,
  rollDegrees: null,
  stabilityScore: 0,
  isStable: false,
};

function normalizeDegrees(value: number) {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function shortestDeltaDegrees(next: number, previous: number) {
  let delta = next - previous;
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;
  return delta;
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function quaternionToEulerDegrees(
  orientation: Pose6DOF['orientation'],
): { yaw: number; pitch: number; roll: number } {
  const { x, y, z, w } = orientation;

  const sinrCosp = 2 * (w * x + y * z);
  const cosrCosp = 1 - 2 * (x * x + y * y);
  const roll = Math.atan2(sinrCosp, cosrCosp);

  const sinp = 2 * (w * y - z * x);
  const pitch = Math.abs(sinp) >= 1 ? Math.sign(sinp) * (Math.PI / 2) : Math.asin(sinp);

  const sinyCosp = 2 * (w * z + x * y);
  const cosyCosp = 1 - 2 * (y * y + z * z);
  const yaw = Math.atan2(sinyCosp, cosyCosp);

  return {
    yaw: normalizeDegrees((yaw * 180) / Math.PI),
    pitch: (pitch * 180) / Math.PI,
    roll: (roll * 180) / Math.PI,
  };
}

/**
 * AR Tracking Hook with 6DOF + 3DOF fallback.
 */
export function useARTracking(isActive: boolean = true) {
  const [trackingState, setTrackingState] = useState<TrackingState>(DEFAULT_TRACKING_STATE);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

  const baseOrientationRef = useRef<{ alpha: number; beta: number; gamma: number } | null>(null);
  const lastUpdateRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const latestDriftRef = useRef({ x: 0, y: 0 });
  const latestHeadingRef = useRef<number | null>(null);
  const latestPitchRef = useRef<number | null>(null);
  const latestRollRef = useRef<number | null>(null);
  const latestStabilityRef = useRef(0);
  const latestPosePositionRef = useRef<Pose6DOF['position'] | null>(null);
  const modeRef = useRef<'3dof' | '6dof'>('3dof');
  const arAvailableRef = useRef(false);
  const poseListenerRef = useRef<PluginListenerHandle | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const requestPermission = useCallback(async () => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permissionState = await (DeviceOrientationEvent as any).requestPermission();
        setPermissionGranted(permissionState === 'granted');
        if (permissionState !== 'granted') {
          console.warn('DeviceOrientation permission denied');
        }
      } catch (err) {
        console.error('Error requesting DeviceOrientation permission', err);
        setPermissionGranted(false);
      }
    } else {
      setPermissionGranted(true);
    }
  }, []);

  const resetTracking = useCallback(() => {
    baseOrientationRef.current = null;
    latestDriftRef.current = { x: 0, y: 0 };
    latestHeadingRef.current = null;
    latestPitchRef.current = null;
    latestRollRef.current = null;
    latestStabilityRef.current = 0;
    latestPosePositionRef.current = null;
    setTrackingState(DEFAULT_TRACKING_STATE);
  }, []);

  const start3DOF = useCallback(() => {
    modeRef.current = '3dof';
    setTrackingState((prev) => ({
      ...prev,
      mode: '3dof',
      pose: null,
      fps: 15,
      headingDegrees: latestHeadingRef.current,
      pitchDegrees: latestPitchRef.current,
      rollDegrees: latestRollRef.current,
      stabilityScore: latestStabilityRef.current,
      isStable: latestStabilityRef.current >= 0.85,
    }));

    const THROTTLE_MS = 66;

    const handleOrientation = (event: DeviceOrientationEvent) => {
      const { alpha, beta, gamma } = event;
      if (alpha === null || beta === null || gamma === null) return;

      if (!baseOrientationRef.current) {
        baseOrientationRef.current = { alpha, beta, gamma };
        latestHeadingRef.current = normalizeDegrees(alpha);
        latestPitchRef.current = beta;
        latestRollRef.current = gamma;
        latestStabilityRef.current = 1;
        return;
      }

      const now = performance.now();
      if (now - lastUpdateRef.current < THROTTLE_MS) return;
      lastUpdateRef.current = now;

      const base = baseOrientationRef.current;
      let dAlpha = alpha - base.alpha;
      if (dAlpha > 180) dAlpha -= 360;
      if (dAlpha < -180) dAlpha += 360;

      const dBeta = beta - base.beta;
      const driftX = -(dAlpha * 1.5);
      const driftY = -(dBeta * 1.5);

      const headingDegrees = normalizeDegrees(alpha);
      const pitchDegrees = beta;
      const rollDegrees = gamma;
      const headingDelta = Math.abs(
        shortestDeltaDegrees(headingDegrees, latestHeadingRef.current ?? headingDegrees),
      );
      const pitchDelta = Math.abs(pitchDegrees - (latestPitchRef.current ?? pitchDegrees));
      const rollDelta = Math.abs(rollDegrees - (latestRollRef.current ?? rollDegrees));
      const stabilityScore = clamp01(1 - (headingDelta + pitchDelta + rollDelta) / 45);

      latestDriftRef.current = { x: driftX, y: driftY };
      latestHeadingRef.current = headingDegrees;
      latestPitchRef.current = pitchDegrees;
      latestRollRef.current = rollDegrees;
      latestStabilityRef.current = stabilityScore;

      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(() => {
          setTrackingState({
            mode: '3dof',
            pose: null,
            driftOffset: { ...latestDriftRef.current },
            fps: 15,
            headingDegrees: latestHeadingRef.current,
            pitchDegrees: latestPitchRef.current,
            rollDegrees: latestRollRef.current,
            stabilityScore: latestStabilityRef.current,
            isStable: latestStabilityRef.current >= 0.85,
          });
          rafRef.current = null;
        });
      }
    };

    window.addEventListener('deviceorientation', handleOrientation);

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  const start6DOF = useCallback(async (): Promise<(() => void) | null> => {
    try {
      await capacitorARPlugin.startSession({ targetFps: 60 });
    } catch {
      return null;
    }

    modeRef.current = '6dof';

    const handle = capacitorARPlugin.addPoseListener((pose: Pose6DOF) => {
      const euler = quaternionToEulerDegrees(pose.orientation);
      const lastPosition = latestPosePositionRef.current;
      const positionDelta = lastPosition
        ? Math.hypot(
            pose.position.x - lastPosition.x,
            pose.position.y - lastPosition.y,
            pose.position.z - lastPosition.z,
          )
        : 0;
      const headingDelta = Math.abs(
        shortestDeltaDegrees(euler.yaw, latestHeadingRef.current ?? euler.yaw),
      );
      const pitchDelta = Math.abs(euler.pitch - (latestPitchRef.current ?? euler.pitch));
      const rollDelta = Math.abs(euler.roll - (latestRollRef.current ?? euler.roll));
      const stabilityScore = clamp01(
        1 - (headingDelta + pitchDelta + rollDelta + positionDelta * 20) / 45,
      );

      latestHeadingRef.current = euler.yaw;
      latestPitchRef.current = euler.pitch;
      latestRollRef.current = euler.roll;
      latestStabilityRef.current = stabilityScore;
      latestPosePositionRef.current = pose.position;

      setTrackingState({
        mode: '6dof',
        pose,
        driftOffset: { x: 0, y: 0 },
        fps: 60,
        headingDegrees: euler.yaw,
        pitchDegrees: euler.pitch,
        rollDegrees: euler.roll,
        stabilityScore,
        isStable: stabilityScore >= 0.85,
      });
    });

    poseListenerRef.current = handle;

    return () => {
      handle.remove();
      poseListenerRef.current = null;
      latestPosePositionRef.current = null;
      void capacitorARPlugin.stopSession();
    };
  }, []);

  useEffect(() => {
    if (!isActive) {
      resetTracking();
      return;
    }

    let disposed = false;
    let cleanup3dof: (() => void) | null = null;
    let cleanup6dof: (() => void) | null = null;

    const teardown = () => {
      cleanup3dof?.();
      cleanup3dof = null;
      cleanup6dof?.();
      cleanup6dof = null;
    };

    const transitionTo3DOF = () => {
      cleanup6dof?.();
      cleanup6dof = null;
      baseOrientationRef.current = null;
      cleanup3dof = start3DOF();
    };

    const attemptStart6DOF = async () => {
      const sixDofCleanup = await start6DOF();
      if (disposed) {
        sixDofCleanup?.();
        return;
      }
      if (sixDofCleanup) {
        cleanup6dof = sixDofCleanup;
      } else {
        transitionTo3DOF();
      }
    };

    const handleVisibilityChange = () => {
      if (disposed) return;

      if (document.hidden) {
        if (modeRef.current === '6dof') {
          transitionTo3DOF();
        }
      } else if (arAvailableRef.current && modeRef.current === '3dof') {
        cleanup3dof?.();
        cleanup3dof = null;
        void attemptStart6DOF();
      }
    };

    capacitorARPlugin.isAvailable().then((available) => {
      if (disposed) return;
      arAvailableRef.current = available;

      if (available) {
        void attemptStart6DOF();
      } else {
        if (permissionGranted === null) {
          if (typeof (DeviceOrientationEvent as any).requestPermission !== 'function') {
            setPermissionGranted(true);
          }
        }
        if (permissionGranted === true) {
          cleanup3dof = start3DOF();
        }
      }
    });

    document.addEventListener('visibilitychange', handleVisibilityChange);

    cleanupRef.current = () => {
      disposed = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      teardown();
    };

    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [isActive, permissionGranted, resetTracking, start3DOF, start6DOF]);

  return {
    trackingState,
    permissionGranted,
    requestPermission,
    resetTracking,
  };
}
