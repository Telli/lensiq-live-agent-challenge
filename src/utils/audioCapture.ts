import { StreamingPcmResampler } from '../audio/resamplePcm';

/**
 * AudioCaptureService — Main-thread service for microphone PCM capture.
 *
 * Primary path: AudioWorklet (off-main-thread processing via PCMCaptureProcessor).
 * Fallback path: ScriptProcessorNode when AudioWorklet is unavailable.
 *
 * The callback receives raw ArrayBuffer (Int16 PCM). Base64 encoding
 * is deferred to the WebSocket send boundary (Requirement 2.1, 2.2).
 */

interface PCMCaptureMessage {
  type: 'pcm-chunk';
  buffer: ArrayBuffer;
}

export interface AudioCaptureDiagnostics {
  inputSampleRate: number;
  outputSampleRate: number;
  processorPath: 'worklet' | 'script-processor';
}

export class AudioCaptureService {
  static readonly OUTPUT_SAMPLE_RATE = 16000;
  static readonly STARTUP_TIMEOUT_MS = 3000;

  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private silentGainNode: GainNode | null = null;
  private starting: boolean = false;
  private startId: number = 0;
  private startPromise: Promise<void> | null = null;
  private diagnostics: AudioCaptureDiagnostics | null = null;

  async startCapture(
    onAudioData: (pcmBuffer: ArrayBuffer) => void,
    options: {
      onReady?: (diagnostics: AudioCaptureDiagnostics) => void;
    } = {},
  ): Promise<void> {
    if (this.stream && !this.starting) return;
    if (this.startPromise) return this.startPromise;

    this.starting = true;
    const currentId = ++this.startId;

    this.startPromise = (async () => {
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (currentId !== this.startId) {
          this.cleanupResources();
          return;
        }

        const AudioCtx =
          (globalThis as any).AudioContext || (globalThis as any).webkitAudioContext;
        this.audioContext = new AudioCtx({ latencyHint: 'interactive' });

        if (
          this.audioContext.state === 'suspended' &&
          typeof this.audioContext.resume === 'function'
        ) {
          await this.audioContext.resume();
        }
        if (currentId !== this.startId) {
          this.cleanupResources();
          return;
        }

        this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);
        this.silentGainNode = this.audioContext.createGain();
        this.silentGainNode.gain.value = 0;
        this.silentGainNode.connect(this.audioContext.destination);

        this.diagnostics = {
          inputSampleRate: this.audioContext.sampleRate,
          outputSampleRate: AudioCaptureService.OUTPUT_SAMPLE_RATE,
          processorPath: this.audioContext.audioWorklet ? 'worklet' : 'script-processor',
        };

        let ready = false;
        const markReady = () => {
          if (!ready) {
            ready = true;
            options.onReady?.(this.diagnostics!);
          }
        };

        if (this.audioContext.audioWorklet) {
          await this.startWorkletCapture(onAudioData, markReady);
        } else {
          console.warn(
            'AudioWorklet is not supported in this browser. Falling back to ScriptProcessorNode.',
          );
          this.startScriptProcessorCapture(onAudioData, markReady);
        }

        await new Promise<void>((resolve, reject) => {
          const timeout = globalThis.setTimeout(() => {
            if (!ready) {
              reject(new Error('Microphone capture did not become ready in time.'));
            }
          }, AudioCaptureService.STARTUP_TIMEOUT_MS);

          const poll = () => {
            if (ready) {
              globalThis.clearTimeout(timeout);
              resolve();
              return;
            }
            globalThis.setTimeout(poll, 25);
          };

          poll();
        });
      } catch (err) {
        this.cleanupResources();
        console.error('Failed to start audio recording', err);
        throw err;
      } finally {
        this.starting = false;
        this.startPromise = null;
      }
    })();

    return this.startPromise;
  }

  stopCapture(): void {
    this.startId++;
    this.cleanupResources();
  }

  getDiagnostics(): AudioCaptureDiagnostics | null {
    return this.diagnostics;
  }

  private cleanupResources(): void {
    if (this.workletNode) {
      this.workletNode.port.onmessage = null;
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    if (this.processorNode) {
      this.processorNode.onaudioprocess = null;
      this.processorNode.disconnect();
      this.processorNode = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.silentGainNode) {
      this.silentGainNode.disconnect();
      this.silentGainNode = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      try {
        const p = this.audioContext.close();
        if (p && p.catch) p.catch(() => {});
      } catch (e) {}
      this.audioContext = null;
    }
    this.diagnostics = null;
  }

  /**
   * Primary path: load the AudioWorklet module and wire up the message port.
   */
  private async startWorkletCapture(
    onAudioData: (pcmBuffer: ArrayBuffer) => void,
    onReady: () => void,
  ): Promise<void> {
    await this.audioContext!.audioWorklet.addModule('/audio/pcm-capture-processor.js');

    if (!this.audioContext) return;

    this.workletNode = new AudioWorkletNode(this.audioContext, 'pcm-capture-processor', {
      processorOptions: {
        targetSampleRate: AudioCaptureService.OUTPUT_SAMPLE_RATE,
      },
    });

    this.workletNode.port.onmessage = (event: MessageEvent<PCMCaptureMessage>) => {
      if (event.data.type === 'pcm-chunk') {
        onReady();
        onAudioData(event.data.buffer);
      }
    };

    this.sourceNode!.connect(this.workletNode);
    this.workletNode.connect(this.silentGainNode!);
  }

  /**
   * Fallback path: ScriptProcessorNode for browsers without AudioWorklet.
   * Produces the same ArrayBuffer output format as the worklet path (Req 9.3).
   */
  private startScriptProcessorCapture(
    onAudioData: (pcmBuffer: ArrayBuffer) => void,
    onReady: () => void,
  ): void {
    this.processorNode = this.audioContext!.createScriptProcessor(4096, 1, 1);
    const resampler = new StreamingPcmResampler(
      this.audioContext!.sampleRate,
      AudioCaptureService.OUTPUT_SAMPLE_RATE,
    );

    this.processorNode.onaudioprocess = (e: AudioProcessingEvent) => {
      const inputData = e.inputBuffer.getChannelData(0);
      const outputData = e.outputBuffer?.getChannelData?.(0);
      if (outputData) {
        outputData.fill(0);
      }
      const pcm16 = resampler.push(inputData);
      onReady();
      if (pcm16.length > 0) {
        onAudioData(pcm16.buffer);
      }
    };

    this.sourceNode!.connect(this.processorNode);
    this.processorNode.connect(this.silentGainNode!);
  }
}
