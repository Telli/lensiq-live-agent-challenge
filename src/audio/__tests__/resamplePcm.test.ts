import { describe, expect, it } from 'vitest';
import { StreamingPcmResampler, downsampleFloat32ToInt16 } from '../resamplePcm';

describe('resamplePcm', () => {
  it('downsamples 48 kHz PCM to 16 kHz output length', () => {
    const input = new Float32Array(480).fill(0.25);
    const result = downsampleFloat32ToInt16(input, 48000, 16000);

    expect(result).toHaveLength(160);
  });

  it('downsamples 44.1 kHz PCM to approximately 16 kHz output length', () => {
    const input = new Float32Array(441).fill(0.25);
    const result = downsampleFloat32ToInt16(input, 44100, 16000);

    expect(result).toHaveLength(160);
  });

  it('streams across chunk boundaries without losing continuity', () => {
    const resampler = new StreamingPcmResampler(48000, 16000);
    const first = resampler.push(new Float32Array(240).fill(0.5));
    const second = resampler.push(new Float32Array(240).fill(0.5));

    expect(first.length + second.length).toBe(160);
    expect(first[0]).toBeGreaterThan(0);
    expect(second[second.length - 1]).toBeGreaterThan(0);
  });
});
