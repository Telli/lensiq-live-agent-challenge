/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { Pose6DOF } from '../../types/ar';

// Use vi.hoisted so mock references are available in the hoisted vi.mock factory
const { mockPlugin, getMockPoseCallback, setMockPoseCallback, mockRemove } = vi.hoisted(() => {
  let _poseCallback: ((pose: any) => void) | null = null;
  const _mockRemove = vi.fn(() => { _poseCallback = null; });
  return {
    mockRemove: _mockRemove,
    getMockPoseCallback: () => _poseCallback,
    setMockPoseCallback: (cb: ((pose: any) => void) | null) => { _poseCallback = cb; },
    mockPlugin: {
      isAvailable: vi.fn().mockResolvedValue(false),
      startSession: vi.fn().mockResolvedValue(undefined),
      stopSession: vi.fn().mockResolvedValue(undefined),
      addPoseListener: vi.fn((cb: (pose: any) => void) => {
        _poseCallback = cb;
        return { remove: _mockRemove };
      }),
    },
  };
});

vi.mock('../../plugins/capacitorAR', () => ({
  capacitorARPlugin: mockPlugin,
}));

import { useARTracking } from '../useARTracking';

const samplePose: Pose6DOF = {
  position: { x: 1, y: 2, z: 3 },
  orientation: { x: 0, y: 0, z: 0, w: 1 },
  timestamp: 1000,
};

describe('useARTracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setMockPoseCallback(null);
    mockPlugin.isAvailable.mockResolvedValue(false);
    mockPlugin.startSession.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns default 3DOF tracking state initially', () => {
    const { result } = renderHook(() => useARTracking(true));
    expect(result.current.trackingState.mode).toBe('3dof');
    expect(result.current.trackingState.pose).toBeNull();
    expect(result.current.trackingState.fps).toBe(15);
    expect(result.current.trackingState.driftOffset).toEqual({ x: 0, y: 0 });
  });

  it('checks AR availability on mount', async () => {
    renderHook(() => useARTracking(true));
    await waitFor(() => {
      expect(mockPlugin.isAvailable).toHaveBeenCalledOnce();
    });
  });

  describe('6DOF mode', () => {
    beforeEach(() => {
      mockPlugin.isAvailable.mockResolvedValue(true);
    });

    it('starts 6DOF session at 60fps when AR is available', async () => {
      renderHook(() => useARTracking(true));
      await waitFor(() => {
        expect(mockPlugin.startSession).toHaveBeenCalledWith({ targetFps: 60 });
        expect(mockPlugin.addPoseListener).toHaveBeenCalled();
      });
    });

    it('updates tracking state with 6DOF pose data', async () => {
      const { result } = renderHook(() => useARTracking(true));
      await waitFor(() => {
        expect(mockPlugin.addPoseListener).toHaveBeenCalled();
      });

      act(() => {
        getMockPoseCallback()?.(samplePose);
      });

      await waitFor(() => {
        expect(result.current.trackingState.mode).toBe('6dof');
        expect(result.current.trackingState.pose).toEqual(samplePose);
        expect(result.current.trackingState.fps).toBe(60);
        expect(result.current.trackingState.driftOffset).toEqual({ x: 0, y: 0 });
      });
    });

    it('falls back to 3DOF if startSession throws', async () => {
      mockPlugin.startSession.mockRejectedValue(new Error('AR init failed'));
      const { result } = renderHook(() => useARTracking(true));
      await waitFor(() => {
        expect(result.current.trackingState.mode).toBe('3dof');
      });
    });

    it('cleans up listener and stops session on unmount', async () => {
      const { unmount } = renderHook(() => useARTracking(true));
      await waitFor(() => {
        expect(mockPlugin.addPoseListener).toHaveBeenCalled();
      });

      unmount();

      expect(mockRemove).toHaveBeenCalled();
      expect(mockPlugin.stopSession).toHaveBeenCalled();
    });
  });

  describe('3DOF fallback', () => {
    it('does not start AR session when unavailable', async () => {
      mockPlugin.isAvailable.mockResolvedValue(false);
      renderHook(() => useARTracking(true));
      await waitFor(() => {
        expect(mockPlugin.isAvailable).toHaveBeenCalled();
      });
      expect(mockPlugin.startSession).not.toHaveBeenCalled();
    });
  });

  describe('inactive state', () => {
    it('resets tracking when isActive is false', () => {
      const { result } = renderHook(() => useARTracking(false));
      expect(result.current.trackingState.mode).toBe('3dof');
      expect(result.current.trackingState.driftOffset).toEqual({ x: 0, y: 0 });
    });
  });

  describe('visibility change (session interruption)', () => {
    beforeEach(() => {
      mockPlugin.isAvailable.mockResolvedValue(true);
    });

    it('transitions to 3DOF when document becomes hidden during 6DOF', async () => {
      const { result } = renderHook(() => useARTracking(true));
      await waitFor(() => {
        expect(mockPlugin.addPoseListener).toHaveBeenCalled();
      });

      // Fire a pose to confirm we're in 6DOF
      act(() => { getMockPoseCallback()?.(samplePose); });
      await waitFor(() => {
        expect(result.current.trackingState.mode).toBe('6dof');
      });

      // Simulate app backgrounded
      Object.defineProperty(document, 'hidden', { value: true, writable: true, configurable: true });
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      await waitFor(() => {
        expect(result.current.trackingState.mode).toBe('3dof');
      });

      // Restore
      Object.defineProperty(document, 'hidden', { value: false, writable: true, configurable: true });
    });

    it('attempts 6DOF restart on foreground return', async () => {
      const { result } = renderHook(() => useARTracking(true));
      await waitFor(() => {
        expect(mockPlugin.addPoseListener).toHaveBeenCalled();
      });

      // Fire a pose to be in 6DOF
      act(() => { getMockPoseCallback()?.(samplePose); });
      await waitFor(() => {
        expect(result.current.trackingState.mode).toBe('6dof');
      });

      // Background the app
      Object.defineProperty(document, 'hidden', { value: true, writable: true, configurable: true });
      act(() => { document.dispatchEvent(new Event('visibilitychange')); });
      await waitFor(() => {
        expect(result.current.trackingState.mode).toBe('3dof');
      });

      // Clear call counts to track restart
      mockPlugin.startSession.mockClear();
      mockPlugin.addPoseListener.mockClear();

      // Foreground the app
      Object.defineProperty(document, 'hidden', { value: false, writable: true, configurable: true });
      act(() => { document.dispatchEvent(new Event('visibilitychange')); });

      await waitFor(() => {
        expect(mockPlugin.startSession).toHaveBeenCalledWith({ targetFps: 60 });
      });
    });

    it('stays in 3DOF if 6DOF restart fails on foreground', async () => {
      const { result } = renderHook(() => useARTracking(true));
      await waitFor(() => {
        expect(mockPlugin.addPoseListener).toHaveBeenCalled();
      });

      act(() => { getMockPoseCallback()?.(samplePose); });
      await waitFor(() => {
        expect(result.current.trackingState.mode).toBe('6dof');
      });

      // Background
      Object.defineProperty(document, 'hidden', { value: true, writable: true, configurable: true });
      act(() => { document.dispatchEvent(new Event('visibilitychange')); });
      await waitFor(() => {
        expect(result.current.trackingState.mode).toBe('3dof');
      });

      // Make restart fail
      mockPlugin.startSession.mockRejectedValue(new Error('restart failed'));

      // Foreground
      Object.defineProperty(document, 'hidden', { value: false, writable: true, configurable: true });
      act(() => { document.dispatchEvent(new Event('visibilitychange')); });

      // Should stay in 3DOF
      await waitFor(() => {
        expect(result.current.trackingState.mode).toBe('3dof');
      });

      // Restore
      Object.defineProperty(document, 'hidden', { value: false, writable: true, configurable: true });
    });
  });
});
