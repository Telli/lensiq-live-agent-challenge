import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { buildWavBuffer } from '../wavBuilder';

/** Helper: read an ASCII string from a DataView at a given offset. */
const readString = (view: DataView, offset: number, length: number): string => {
  let s = '';
  for (let i = 0; i < length; i++) {
    s += String.fromCharCode(view.getUint8(offset + i));
  }
  return s;
};

/**
 * Arbitrary for valid WAV parameters.
 * Constrains to realistic values that buildWavBuffer supports.
 */
const wavParamsArb = fc.record({
  sampleRate: fc.integer({ min: 8000, max: 192000 }),
  numChannels: fc.constantFrom(1, 2),
  bitsPerSample: fc.constantFrom(8, 16, 24, 32),
});

/**
 * Property 6: WAV buffer output size
 *
 * For any PCM ArrayBuffer of N bytes and valid WAV parameters,
 * buildWavBuffer shall produce an ArrayBuffer of exactly N + 44 bytes.
 *
 * **Validates: Requirements 4.1**
 */
describe('WAVHeaderBuilder — Property 6: WAV buffer output size', () => {
  it('output is exactly 44 + N bytes for any PCM buffer of N bytes', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000 }),
        wavParamsArb,
        (pcmByteLength, params) => {
          const pcmData = new ArrayBuffer(pcmByteLength);
          const wav = buildWavBuffer(
            pcmData,
            params.sampleRate,
            params.numChannels,
            params.bitsPerSample,
          );
          expect(wav.byteLength).toBe(pcmByteLength + 44);
        },
      ),
      { numRuns: 1000 },
    );
  });
});

/**
 * Property 7: WAV header field correctness
 *
 * For any valid combination of sampleRate, numChannels, and bitsPerSample,
 * buildWavBuffer shall write the correct RIFF/WAVE magic bytes at offsets
 * [0..3], [8..11], [12..15], [36..39], and encode byteRate as
 * sampleRate × numChannels × (bitsPerSample / 8) and blockAlign as
 * numChannels × (bitsPerSample / 8) at their respective header offsets.
 *
 * **Validates: Requirements 4.2, 4.3**
 */
describe('WAVHeaderBuilder — Property 7: WAV header field correctness', () => {
  it('magic bytes and computed fields are correct for any valid WAV parameters', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 5000 }),
        wavParamsArb,
        (pcmByteLength, params) => {
          const pcmData = new ArrayBuffer(pcmByteLength);
          const wav = buildWavBuffer(
            pcmData,
            params.sampleRate,
            params.numChannels,
            params.bitsPerSample,
          );
          const view = new DataView(wav);

          // Magic bytes
          expect(readString(view, 0, 4)).toBe('RIFF');
          expect(readString(view, 8, 4)).toBe('WAVE');
          expect(readString(view, 12, 4)).toBe('fmt ');
          expect(readString(view, 36, 4)).toBe('data');

          // Computed fields
          const expectedByteRate =
            params.sampleRate * params.numChannels * (params.bitsPerSample / 8);
          const expectedBlockAlign =
            params.numChannels * (params.bitsPerSample / 8);

          expect(view.getUint32(28, true)).toBe(expectedByteRate);  // byteRate
          expect(view.getUint16(32, true)).toBe(expectedBlockAlign); // blockAlign

          // Additional structural fields
          expect(view.getUint32(4, true)).toBe(wav.byteLength - 8);  // RIFF chunk size
          expect(view.getUint32(16, true)).toBe(16);                  // fmt sub-chunk size (PCM)
          expect(view.getUint16(20, true)).toBe(1);                   // audio format (PCM = 1)
          expect(view.getUint16(22, true)).toBe(params.numChannels);
          expect(view.getUint32(24, true)).toBe(params.sampleRate);
          expect(view.getUint16(34, true)).toBe(params.bitsPerSample);
          expect(view.getUint32(40, true)).toBe(pcmByteLength);       // data sub-chunk size
        },
      ),
      { numRuns: 1000 },
    );
  });
});
