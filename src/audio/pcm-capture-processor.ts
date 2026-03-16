import { StreamingPcmResampler, float32ToInt16 } from './resamplePcm';

export { float32ToInt16 };

declare const sampleRate: number;

/**
 * PCMCaptureProcessor — AudioWorkletProcessor subclass
 *
 * Receives raw Float32 audio frames from the Web Audio graph,
 * converts them to Int16 PCM, and posts the resulting ArrayBuffer
 * to the main thread with transfer semantics (zero-copy).
 */
class PCMCaptureProcessor extends AudioWorkletProcessor {
  private readonly resampler: StreamingPcmResampler;

  constructor(options?: AudioWorkletNodeOptions) {
    super();
    const targetRate = Number(options?.processorOptions?.targetSampleRate || 16000);
    this.resampler = new StreamingPcmResampler(sampleRate, targetRate);
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const input = inputs[0]?.[0];
    const output = outputs[0]?.[0];
    if (output) {
      output.fill(0);
    }
    if (!input || input.length === 0) return true;

    const pcm16 = this.resampler.push(input);
    if (pcm16.length === 0) {
      return true;
    }

    // Transfer ownership of the underlying buffer (zero-copy)
    const buffer = pcm16.buffer;
    this.port.postMessage({ type: 'pcm-chunk', buffer }, [buffer]);

    return true; // keep processor alive
  }
}

registerProcessor('pcm-capture-processor', PCMCaptureProcessor);
