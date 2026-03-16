import { useState, useEffect, useCallback } from 'react';
import { frameStore } from '../../services/session/frameStore';

export function useSceneCapture() {
  const [latestFrame, setLatestFrameLocal] = useState(frameStore.getLatestFrame());

  useEffect(() => {
    return frameStore.subscribe(() => {
      setLatestFrameLocal(frameStore.getLatestFrame());
    });
  }, []);

  const captureFrame = useCallback(() => {
    if (typeof window !== 'undefined' && (window as any).captureCameraFrame) {
      (window as any).captureCameraFrame();
    }
    return frameStore.getLatestFrame();
  }, []);

  const clearFrame = useCallback(() => {
    frameStore.clearLatestFrame();
  }, []);

  return {
    latestFrame,
    currentFrame: latestFrame ? `data:${latestFrame.mimeType};base64,${latestFrame.data}` : null,
    captureFrame,
    clearFrame
  };
}
