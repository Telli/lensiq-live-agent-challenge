import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { float32ToInt16 } from '../pcm-capture-processor';

/**
 * Property 1: Float32-to-Int16 conversion accuracy
 *
 * For any Float32 sample `s` in the range [-1.0, 1.0], converting it to Int16
 * and back to Float32 shall produce a value within ±1/32768 of the original,
 * and the Int16 value shall be in the range [-32768, 32767].
 *
 * **Validates: Requirements 1.2**
 */
describe('float32ToInt16 — Property 1: Float32-to-Int16 conversion accuracy', () => {
  it('should produce Int16 values in [-32768, 32767] and round-trip within ±1/32768', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1.0, max: 1.0, noNaN: true }),
        (sample: number) => {
          const int16 = float32ToInt16(sample);

          // Int16 range check
          expect(int16).toBeGreaterThanOrEqual(-32768);
          expect(int16).toBeLessThanOrEqual(32767);

          // Round-trip accuracy: convert Int16 back to Float32
          const roundTrip = int16 < 0 ? int16 / 0x8000 : int16 / 0x7fff;
          const error = Math.abs(roundTrip - sample);
          const tolerance = 1 / 32768;

          expect(error).toBeLessThanOrEqual(tolerance);
        }
      ),
      { numRuns: 1000 }
    );
  });
});
