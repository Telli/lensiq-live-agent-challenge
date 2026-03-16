import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('capacitorAR', () => {
  beforeEach(() => {
    // Clear module cache so each test gets a fresh createARPlugin() call
    vi.resetModules();
    // Clean up any Capacitor global from previous tests
    delete (globalThis as any).Capacitor;
  });

  afterEach(() => {
    delete (globalThis as any).Capacitor;
  });

  describe('web fallback (no Capacitor)', () => {
    it('isAvailable returns false', async () => {
      const { capacitorARPlugin } = await import('../capacitorAR');
      expect(await capacitorARPlugin.isAvailable()).toBe(false);
    });

    it('startSession throws an error', async () => {
      const { capacitorARPlugin } = await import('../capacitorAR');
      await expect(capacitorARPlugin.startSession({ targetFps: 60 })).rejects.toThrow(
        'AR is not available in this environment'
      );
    });

    it('stopSession resolves without error', async () => {
      const { capacitorARPlugin } = await import('../capacitorAR');
      await expect(capacitorARPlugin.stopSession()).resolves.toBeUndefined();
    });

    it('addPoseListener returns a handle with a remove method', async () => {
      const { capacitorARPlugin } = await import('../capacitorAR');
      const callback = vi.fn();
      const handle = capacitorARPlugin.addPoseListener(callback);
      expect(handle).toBeDefined();
      expect(typeof handle.remove).toBe('function');
      // remove should not throw
      handle.remove();
    });

    it('addPoseListener callback is never invoked in web fallback', async () => {
      const { capacitorARPlugin } = await import('../capacitorAR');
      const callback = vi.fn();
      capacitorARPlugin.addPoseListener(callback);
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Capacitor bridge registration', () => {
    it('uses registerPlugin when Capacitor global is available', async () => {
      const mockPlugin = {
        isAvailable: vi.fn().mockResolvedValue(true),
        startSession: vi.fn().mockResolvedValue(undefined),
        stopSession: vi.fn().mockResolvedValue(undefined),
        addPoseListener: vi.fn().mockReturnValue({ remove: vi.fn() }),
      };
      (globalThis as any).Capacitor = {
        registerPlugin: vi.fn().mockReturnValue(mockPlugin),
      };

      const { capacitorARPlugin } = await import('../capacitorAR');

      expect((globalThis as any).Capacitor.registerPlugin).toHaveBeenCalledWith('CapacitorAR');
      expect(await capacitorARPlugin.isAvailable()).toBe(true);
    });

    it('falls back to web plugin when registerPlugin is not a function', async () => {
      (globalThis as any).Capacitor = {};

      const { capacitorARPlugin } = await import('../capacitorAR');
      expect(await capacitorARPlugin.isAvailable()).toBe(false);
    });

    it('falls back to web plugin when Capacitor global throws', async () => {
      Object.defineProperty(globalThis, 'Capacitor', {
        get() { throw new Error('access denied'); },
        configurable: true,
      });

      const { capacitorARPlugin } = await import('../capacitorAR');
      expect(await capacitorARPlugin.isAvailable()).toBe(false);

      // Clean up the getter
      delete (globalThis as any).Capacitor;
    });
  });

  describe('PluginListenerHandle', () => {
    it('remove() can be called multiple times without error', async () => {
      const { capacitorARPlugin } = await import('../capacitorAR');
      const handle = capacitorARPlugin.addPoseListener(vi.fn());
      handle.remove();
      handle.remove(); // second call should not throw
    });
  });
});
