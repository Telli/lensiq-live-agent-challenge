/**
 * @vitest-environment jsdom
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockAudioCaptureInstances: Array<{
  startCapture: ReturnType<typeof vi.fn>;
  stopCapture: ReturnType<typeof vi.fn>;
}> = [];

const mockPlaybackInstances: Array<{
  enqueueChunk: ReturnType<typeof vi.fn>;
  interrupt: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
  prime: ReturnType<typeof vi.fn>;
  bufferDepth: number;
  scheduledSourceCount: number;
}> = [];

vi.mock('../../utils/audioCapture', () => {
  class MockAudioCaptureService {
    static OUTPUT_SAMPLE_RATE = 16000;
    static STARTUP_TIMEOUT_MS = 3000;
    startCapture = vi.fn(async (_onAudioData: unknown, options: any = {}) => {
      options.onReady?.({
        inputSampleRate: 48000,
        outputSampleRate: 16000,
        processorPath: 'worklet',
      });
    });
    stopCapture = vi.fn();
    getDiagnostics = vi.fn(() => ({
      inputSampleRate: 48000,
      outputSampleRate: 16000,
      processorPath: 'worklet',
    }));

    constructor() {
      mockAudioCaptureInstances.push(this);
    }
  }

  return { AudioCaptureService: MockAudioCaptureService };
});

vi.mock('../../audio/playbackService', () => {
  class MockPlaybackService {
    bufferDepth = 0;
    scheduledSourceCount = 0;
    enqueueChunk = vi.fn();
    interrupt = vi.fn();
    destroy = vi.fn();
    prime = vi.fn(async () => {});

    constructor() {
      mockPlaybackInstances.push(this);
    }
  }

  return { PlaybackService: MockPlaybackService };
});

class FakeWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;
  static instances: FakeWebSocket[] = [];

  readyState = FakeWebSocket.OPEN;
  bufferedAmount = 0;
  binaryType = 'blob';
  sent: Array<string | ArrayBuffer | Uint8Array> = [];
  private listeners = new Map<string, Array<(event: any) => void>>();

  constructor(public readonly url: string) {
    FakeWebSocket.instances.push(this);
  }

  addEventListener(type: string, listener: (event: any) => void) {
    const current = this.listeners.get(type) ?? [];
    current.push(listener);
    this.listeners.set(type, current);
  }

  send(payload: string | ArrayBuffer | Uint8Array) {
    this.sent.push(payload);
  }

  close() {
    this.readyState = FakeWebSocket.CLOSED;
    this.emit('close', {});
  }

  emit(type: string, event: any) {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }
}

describe('useLiveExplore', () => {
  beforeEach(() => {
    FakeWebSocket.instances = [];
    mockAudioCaptureInstances.length = 0;
    mockPlaybackInstances.length = 0;
    vi.stubGlobal('WebSocket', FakeWebSocket as unknown as typeof WebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns the same pending promise while connecting', async () => {
    const { useLiveExplore } = await import('../useLiveExplore');
    const { result } = renderHook(() => useLiveExplore());

    let firstPromise!: Promise<void>;
    let secondPromise!: Promise<void>;

    act(() => {
      firstPromise = result.current.connect();
      secondPromise = result.current.connect();
    });

    expect(firstPromise).toBe(secondPromise);
    expect(FakeWebSocket.instances).toHaveLength(1);

    act(() => {
      FakeWebSocket.instances[0].emit('message', {
        data: JSON.stringify({ type: 'state', state: 'connected' }),
      });
    });

    await firstPromise;
    await waitFor(() => {
      expect(result.current.connectionState).toBe('listening');
    });
    expect(mockAudioCaptureInstances).toHaveLength(1);
  });

  it('sends activity_end before audio_end during disconnect after user speech starts', async () => {
    const { useLiveExplore } = await import('../useLiveExplore');
    const { result } = renderHook(() => useLiveExplore());

    await act(async () => {
      const promise = result.current.connect();
      FakeWebSocket.instances[0].emit('message', {
        data: JSON.stringify({ type: 'state', state: 'connected' }),
      });
      await promise;
    });

    const socket = FakeWebSocket.instances[0];
    expect(result.current.connectionState).toBe('listening');

    act(() => {
      result.current.interrupt();
    });

    expect(socket.sent[0]).toBe(JSON.stringify({ type: 'activity_start' }));

    act(() => {
      result.current.disconnect();
    });

    expect(socket.sent.slice(1, 3)).toEqual([
      JSON.stringify({ type: 'activity_end' }),
      JSON.stringify({ type: 'audio_end' }),
    ]);

    await waitFor(() => {
      expect(result.current.connectionState).toBe('idle');
    });
  });
});
