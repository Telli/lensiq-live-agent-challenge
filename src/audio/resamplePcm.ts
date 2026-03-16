export function float32ToInt16(sample: number): number {
  const clamped = Math.max(-1, Math.min(1, sample));
  return clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
}

function concatFloat32Arrays(
  first: Float32Array,
  second: Float32Array,
): Float32Array {
  if (first.length === 0) return second.slice();
  if (second.length === 0) return first.slice();

  const merged = new Float32Array(first.length + second.length);
  merged.set(first);
  merged.set(second, first.length);
  return merged;
}

export class StreamingPcmResampler {
  private readonly ratio: number;
  private residual = new Float32Array(0);
  private offset = 0;

  constructor(
    private readonly sourceSampleRate: number,
    private readonly targetSampleRate: number = 16000,
  ) {
    this.ratio = sourceSampleRate / targetSampleRate;
  }

  push(input: Float32Array): Int16Array {
    if (input.length === 0) {
      return new Int16Array(0);
    }

    if (this.sourceSampleRate === this.targetSampleRate) {
      const pcm16 = new Int16Array(input.length);
      for (let i = 0; i < input.length; i += 1) {
        pcm16[i] = float32ToInt16(input[i]);
      }
      return pcm16;
    }

    const combined = concatFloat32Arrays(this.residual, input);
    if (combined.length < 2) {
      this.residual = combined;
      return new Int16Array(0);
    }

    const output: number[] = [];
    while (this.offset < combined.length - 1) {
      const baseIndex = Math.floor(this.offset);
      const nextIndex = Math.min(baseIndex + 1, combined.length - 1);
      const fraction = this.offset - baseIndex;
      const interpolated =
        combined[baseIndex] +
        (combined[nextIndex] - combined[baseIndex]) * fraction;
      output.push(float32ToInt16(interpolated));
      this.offset += this.ratio;
    }

    const carryStart = Math.max(0, Math.floor(this.offset));
    this.residual = combined.slice(carryStart);
    this.offset -= carryStart;

    return Int16Array.from(output);
  }

  reset(): void {
    this.residual = new Float32Array(0);
    this.offset = 0;
  }
}

export function downsampleFloat32ToInt16(
  input: Float32Array,
  sourceSampleRate: number,
  targetSampleRate: number = 16000,
): Int16Array {
  const resampler = new StreamingPcmResampler(sourceSampleRate, targetSampleRate);
  return resampler.push(input);
}
