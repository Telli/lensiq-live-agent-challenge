import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlaybackService } from '../playbackService';

/* ------------------------------------------------------------------ */
/*  Minimal AudioContext / AudioBuffer stubs for Node environment      */
/* ------------------------------------------------------------------ */

function createMockAudioContext() {
  let _currentTime = 0;

  const scheduledSources: Array<{
    startTime: number;
    duration: number;
    onended: (() => void) | null;
    stop: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  }> = [];

  const mockCtx: any = {
    sampleRate: 24000,
    get currentTime() {
      return _currentTime;
    },
    destination: {},
    close: vi.fn(),

    decodeAudioData: vi.fn(async (_buffer: ArrayBuffer) => {
      // Return a fake AudioBuffer with a fixed duration
      return { duration: 0.5, length: 12000, sampleRate: 24000 };
    }),

    createBufferSource: vi.fn(() => {
      const source: any = {
        buffer: null,
        onended: null,
        stop: vi.fn(),
        disconnect: vi.fn(),
        connect: vi.fn(),
        start: vi.fn((when: number) => {
          const entry = {
            startTime: when,
            duration: source.buffer?.duration ?? 0,
            stop: source.stop,
            disconnect: source.disconnect,
            get onended() {
              return source.onended;
            },
          };
          scheduledSources.push(entry);
        }),
      };
      return source;
    }),
  };

  return {
    mockCtx,
    scheduledSources,
    advanceTime(t: number) {
      _currentTime = t;
    },
    /** Trigger onended for all sources whose playback has finished. */
    flushEnded() {
      for (const s of scheduledSources) {
        if (s.startTime + s.duration <= _currentTime && s.onended) {
          s.onended();
        }
      }
    },
  };
}

/** Tiny PCM buffer helper. */
const pcm = (tag: number): ArrayBuffer => {
  const ab = new ArrayBuffer(2);
  new Uint8Array(ab)[0] = tag;
  return ab;
};

/* ------------------------------------------------------------------ */
/*  Patch global AudioContext so PlaybackService can construct one     */
/* ------------------------------------------------------------------ */

let mockHelper: ReturnType<typeof createMockAudioContext>;

beforeEach(() => {
  mockHelper = createMockAudioContext();
  (globalThis as any).AudioContext = function AudioContext() {
    return mockHelper.mockCtx;
  };
});

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('PlaybackService', () => {
  it('does not schedule playback until jitter buffer is ready', async () => {
    const svc = new PlaybackService(2, 24000);
    svc.enqueueChunk(pcm(1));

    // Only 1 chunk enqueued, minDepth is 2 — no decode should happen
    expect(mockHelper.mockCtx.decodeAudioData).not.toHaveBeenCalled();
  });

  it('schedules playback once jitter buffer reaches minDepth', async () => {
    const svc = new PlaybackService(2, 24000);
    svc.enqueueChunk(pcm(1));
    svc.enqueueChunk(pcm(2));

    // Wait for the async decodeAudioData to resolve
    await vi.waitFor(() => {
      expect(mockHelper.mockCtx.decodeAudioData).toHaveBeenCalledTimes(1);
    });

    expect(mockHelper.mockCtx.createBufferSource).toHaveBeenCalledTimes(1);
    expect(mockHelper.scheduledSources).toHaveLength(1);
    expect(mockHelper.scheduledSources[0].startTime).toBe(0);
  });

  it('schedules gapless playback — next start = prev start + duration', async () => {
    const svc = new PlaybackService(2, 24000);
    svc.enqueueChunk(pcm(1));
    svc.enqueueChunk(pcm(2));
    svc.enqueueChunk(pcm(3));

    // With greedy scheduling, both ready chunks are decoded and scheduled
    // immediately without waiting for onended callbacks.
    await vi.waitFor(() => {
      expect(mockHelper.scheduledSources).toHaveLength(2);
    });

    // Second source should start at 0 + 0.5 = 0.5 (gapless)
    expect(mockHelper.scheduledSources[0].startTime).toBe(0);
    expect(mockHelper.scheduledSources[1].startTime).toBe(0.5);
  });

  it('skips corrupted chunks and continues pipeline (Req 10.1, 10.2)', async () => {
    const svc = new PlaybackService(2, 24000);

    // First call to decodeAudioData rejects (corrupted), second succeeds
    mockHelper.mockCtx.decodeAudioData
      .mockRejectedValueOnce(new Error('corrupt'))
      .mockResolvedValueOnce({ duration: 0.5, length: 12000, sampleRate: 24000 });

    svc.enqueueChunk(pcm(1));
    svc.enqueueChunk(pcm(2));
    svc.enqueueChunk(pcm(3));

    // Should eventually schedule the second chunk after skipping the first
    await vi.waitFor(() => {
      expect(mockHelper.mockCtx.decodeAudioData).toHaveBeenCalledTimes(2);
    });

    await vi.waitFor(() => {
      expect(mockHelper.scheduledSources).toHaveLength(1);
    });
  });

  it('flush resets the buffer and scheduling timeline', async () => {
    const svc = new PlaybackService(2, 24000);
    svc.enqueueChunk(pcm(1));
    svc.enqueueChunk(pcm(2));

    // Let the first scheduling kick off
    await vi.waitFor(() => {
      expect(mockHelper.mockCtx.decodeAudioData).toHaveBeenCalledTimes(1);
    });

    svc.flush();
    mockHelper.mockCtx.decodeAudioData.mockClear();

    // After flush, enqueuing a single chunk should not trigger playback
    // because the jitter buffer needs minDepth (2) chunks again
    svc.enqueueChunk(pcm(3));
    expect(mockHelper.mockCtx.decodeAudioData).not.toHaveBeenCalled();
  });

  it('flush invalidates in-flight decode work and prevents ghost playback', async () => {
    const svc = new PlaybackService(2, 24000);
    let resolveDecode: ((value: unknown) => void) | null = null;

    mockHelper.mockCtx.decodeAudioData.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveDecode = resolve;
        }),
    );

    svc.enqueueChunk(pcm(1));
    svc.enqueueChunk(pcm(2));

    await vi.waitFor(() => {
      expect(mockHelper.mockCtx.decodeAudioData).toHaveBeenCalledTimes(1);
    });

    svc.flush();
    resolveDecode?.({ duration: 0.5, length: 12000, sampleRate: 24000 });
    await Promise.resolve();
    await Promise.resolve();

    expect(mockHelper.mockCtx.createBufferSource).not.toHaveBeenCalled();
  });

  it('interrupt stops scheduled sources', async () => {
    const svc = new PlaybackService(2, 24000);
    svc.enqueueChunk(pcm(1));
    svc.enqueueChunk(pcm(2));

    await vi.waitFor(() => {
      expect(mockHelper.scheduledSources).toHaveLength(1);
    });

    svc.interrupt();

    expect(mockHelper.scheduledSources[0].stop).toHaveBeenCalled();
    expect(mockHelper.scheduledSources[0].disconnect).toHaveBeenCalled();
  });

  it('destroy closes the AudioContext', () => {
    const svc = new PlaybackService(2, 24000);
    svc.destroy();
    expect(mockHelper.mockCtx.close).toHaveBeenCalledTimes(1);
  });
});
