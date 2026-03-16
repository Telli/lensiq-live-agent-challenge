import type { Pose6DOF } from '../types/ar';

/**
 * Handle returned by addPoseListener for cleanup.
 * Call remove() to unsubscribe from pose updates.
 */
export interface PluginListenerHandle {
  remove: () => void;
}

/**
 * Capacitor AR plugin interface wrapping ARKit (iOS) and ARCore (Android)
 * for streaming 6DOF pose data to the web layer.
 */
export interface CapacitorARPlugin {
  isAvailable(): Promise<boolean>;
  startSession(config: { targetFps: 30 | 60 }): Promise<void>;
  stopSession(): Promise<void>;
  addPoseListener(callback: (pose: Pose6DOF) => void): PluginListenerHandle;
}

/**
 * Web fallback implementation used when running in a plain browser
 * without the Capacitor native shell. isAvailable() always returns false.
 */
class WebFallbackARPlugin implements CapacitorARPlugin {
  async isAvailable(): Promise<boolean> {
    return false;
  }

  async startSession(_config: { targetFps: 30 | 60 }): Promise<void> {
    throw new Error('AR is not available in this environment');
  }

  async stopSession(): Promise<void> {
    // No-op: no session to stop in web fallback
  }

  addPoseListener(_callback: (pose: Pose6DOF) => void): PluginListenerHandle {
    // No-op listener in web fallback — return a handle whose remove is a no-op
    return { remove: () => {} };
  }
}

/**
 * Attempts to register the plugin via the Capacitor bridge if available,
 * otherwise returns the web fallback.
 */
function createARPlugin(): CapacitorARPlugin {
  try {
    // Check if Capacitor's registerPlugin is available at runtime
    // (i.e., the app is running inside a Capacitor native shell)
    const Capacitor = (globalThis as any).Capacitor;
    if (Capacitor?.registerPlugin) {
      return Capacitor.registerPlugin('CapacitorAR') as CapacitorARPlugin;
    }
  } catch {
    // Capacitor not available — fall through to web fallback
  }
  return new WebFallbackARPlugin();
}

/**
 * Singleton AR plugin instance.
 * In a Capacitor native shell, this bridges to ARKit/ARCore.
 * In a plain browser, this is a web fallback where isAvailable() returns false.
 */
export const capacitorARPlugin: CapacitorARPlugin = createARPlugin();
