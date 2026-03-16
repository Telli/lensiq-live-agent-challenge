import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioCaptureService } from '../audioCapture';

function createMockMediaStream() {
  const track = { stop: vi.fn() };
  return { getTracks: () => [track], _track: track };
}

function createMockWorkletNode() {
  const port = { onmessage: null as ((ev: any) => void) | null };
  return { port, disconnect: vi.fn(), connect: vi.fn() };
}

function createMockScriptProcessor() {
  return {
    onaudioprocess: null as ((event: any) => void) | null,
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
}

function createMockSourceNode() {
  return { connect: vi.fn(), disconnect: vi.fn() };
}

function createMockGainNode() {
  return {
    gain: { value: 1 },
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
}

function createMockAudioContext(supportsWorklet: boolean, sampleRate: number = 48000) {
  const sourceNode = createMockSourceNode();
  const workletNode = createMockWorkletNode();
  const scriptProcessor = createMockScriptProcessor();
  const gainNode = createMockGainNode();

  const ctx: any = {
    sampleRate,
    state: 'running',
    destination: {},
    resume: vi.fn().mockResolvedValue(undefined),
    createMediaStreamSource: vi.fn(() => sourceNode),
    createScriptProcessor: vi.fn(() => scriptProcessor),
    createGain: vi.fn(() => gainNode),
    close: vi.fn(),
    _sourceNode: sourceNode,
    _workletNode: workletNode,
    _scriptProcessor: scriptProcessor,
    _gainNode: gainNode,
  };

  if (supportsWorklet) {
    ctx.audioWorklet = { addModule: vi.fn().mockResolvedValue(undefined) };
  }

  return ctx;
}

describe('AudioCaptureService', () => {
  let mockStream: ReturnType<typeof createMockMediaStream>;
  let mockCtx: ReturnType<typeof createMockAudioContext>;
  let getUserMediaMock: ReturnType<typeof vi.fn>;

  function setup(supportsWorklet: boolean, sampleRate: number = 48000) {
    mockStream = createMockMediaStream();
    mockCtx = createMockAudioContext(supportsWorklet, sampleRate);
    getUserMediaMock = vi.fn().mockResolvedValue(mockStream);

    vi.stubGlobal('navigator', {
      mediaDevices: { getUserMedia: getUserMediaMock },
    });

    vi.stubGlobal(
      'AudioContext',
      vi.fn(function (this: unknown) {
        return mockCtx;
      }),
    );

    if (supportsWorklet) {
      vi.stubGlobal(
        'AudioWorkletNode',
        vi.fn(function (this: unknown) {
          return mockCtx._workletNode;
        }),
      );
    }
  }

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('AudioWorklet path', () => {
    beforeEach(() => setup(true, 44100));

    it('loads the worklet, waits for the callback path, and reports diagnostics', async () => {
      const service = new AudioCaptureService();
      const onReady = vi.fn();
      const callback = vi.fn();
      const startPromise = service.startCapture(callback, { onReady });

      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      expect(mockCtx.audioWorklet.addModule).toHaveBeenCalledWith(
        '/audio/pcm-capture-processor.js',
      );
      expect(AudioWorkletNode).toHaveBeenCalledWith(
        mockCtx,
        'pcm-capture-processor',
        expect.objectContaining({
          processorOptions: { targetSampleRate: AudioCaptureService.OUTPUT_SAMPLE_RATE },
        }),
      );

      const testBuffer = new Int16Array([100, -200, 300]).buffer;
      mockCtx._workletNode.port.onmessage?.({
        data: { type: 'pcm-chunk', buffer: testBuffer },
      });

      await startPromise;

      expect(callback).toHaveBeenCalledWith(testBuffer);
      expect(onReady).toHaveBeenCalledWith({
        inputSampleRate: 44100,
        outputSampleRate: 16000,
        processorPath: 'worklet',
      });
      expect(mockCtx._sourceNode.connect).toHaveBeenCalledWith(mockCtx._workletNode);
      expect(mockCtx._workletNode.connect).toHaveBeenCalledWith(mockCtx._gainNode);
      expect(mockCtx._gainNode.connect).toHaveBeenCalledWith(mockCtx.destination);
      expect(mockCtx._gainNode.gain.value).toBe(0);
    });

    it('returns the same pending promise while capture is still starting', async () => {
      const service = new AudioCaptureService();
      const callback = vi.fn();

      const startPromise = service.startCapture(callback);
      const secondPromise = service.startCapture(callback);

      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      mockCtx._workletNode.port.onmessage?.({
        data: { type: 'pcm-chunk', buffer: new Int16Array([1]).buffer },
      });

      await startPromise;
      await secondPromise;
      expect(getUserMediaMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('ScriptProcessorNode fallback', () => {
    beforeEach(() => setup(false, 16000));

    it('keeps the fallback graph silent and emits PCM once audio arrives', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const service = new AudioCaptureService();
      const callback = vi.fn();
      const onReady = vi.fn();
      const startPromise = service.startCapture(callback, { onReady });

      await Promise.resolve();
      await Promise.resolve();

      const fakeInput = new Float32Array([0.5, -0.5, 0.0, 1.0]);
      const fakeOutput = new Float32Array([1, 1, 1, 1]);

      mockCtx._scriptProcessor.onaudioprocess?.({
        inputBuffer: { getChannelData: () => fakeInput },
        outputBuffer: { getChannelData: () => fakeOutput },
      });

      await startPromise;

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('AudioWorklet is not supported'),
      );
      expect(callback).toHaveBeenCalledTimes(1);
      expect(Array.from(new Int16Array(callback.mock.calls[0][0]))).toEqual([
        16383,
        -16384,
        0,
        32767,
      ]);
      expect(Array.from(fakeOutput)).toEqual([0, 0, 0, 0]);
      expect(onReady).toHaveBeenCalledWith({
        inputSampleRate: 16000,
        outputSampleRate: 16000,
        processorPath: 'script-processor',
      });
      expect(mockCtx._sourceNode.connect).toHaveBeenCalledWith(mockCtx._scriptProcessor);
      expect(mockCtx._scriptProcessor.connect).toHaveBeenCalledWith(mockCtx._gainNode);
      expect(mockCtx._gainNode.connect).toHaveBeenCalledWith(mockCtx.destination);
    });
  });

  describe('stopCapture', () => {
    it('stops tracks and disconnects the silent graph', async () => {
      setup(true);
      const service = new AudioCaptureService();
      const startPromise = service.startCapture(vi.fn());

      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      mockCtx._workletNode.port.onmessage?.({
        data: { type: 'pcm-chunk', buffer: new Int16Array([1]).buffer },
      });
      await startPromise;

      service.stopCapture();

      expect(mockStream._track.stop).toHaveBeenCalled();
      expect(mockCtx._workletNode.disconnect).toHaveBeenCalled();
      expect(mockCtx._gainNode.disconnect).toHaveBeenCalled();
      expect(mockCtx.close).toHaveBeenCalled();
      expect(service.getDiagnostics()).toBeNull();
    });

    it('is safe to call without starting', () => {
      const service = new AudioCaptureService();
      expect(() => service.stopCapture()).not.toThrow();
    });
  });
});
