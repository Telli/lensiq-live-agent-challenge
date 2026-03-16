function float32ToInt16(sample) {
  const clamped = Math.max(-1, Math.min(1, sample));
  return clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
}

class StreamingPcmResampler {
  constructor(sourceSampleRate, targetSampleRate) {
    this.sourceSampleRate = sourceSampleRate;
    this.targetSampleRate = targetSampleRate;
    this.ratio = sourceSampleRate / targetSampleRate;
    this.residual = new Float32Array(0);
    this.offset = 0;
  }

  push(input) {
    if (!input || input.length === 0) {
      return new Int16Array(0);
    }

    if (this.sourceSampleRate === this.targetSampleRate) {
      const pcm16 = new Int16Array(input.length);
      for (let i = 0; i < input.length; i += 1) {
        pcm16[i] = float32ToInt16(input[i]);
      }
      return pcm16;
    }

    const combined = new Float32Array(this.residual.length + input.length);
    combined.set(this.residual);
    combined.set(input, this.residual.length);
    if (combined.length < 2) {
      this.residual = combined;
      return new Int16Array(0);
    }

    const output = [];
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
}

class PCMCaptureProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const targetSampleRate = Number(
      (options && options.processorOptions && options.processorOptions.targetSampleRate) || 16000,
    );
    this.resampler = new StreamingPcmResampler(sampleRate, targetSampleRate);
  }

  process(inputs) {
    const input = inputs[0] && inputs[0][0];
    if (!input || input.length === 0) {
      return true;
    }

    const pcm16 = this.resampler.push(input);
    if (pcm16.length === 0) {
      return true;
    }

    const buffer = pcm16.buffer;
    this.port.postMessage({ type: 'pcm-chunk', buffer }, [buffer]);
    return true;
  }
}

registerProcessor('pcm-capture-processor', PCMCaptureProcessor);
