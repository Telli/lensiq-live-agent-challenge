import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { clampScreenPercentage, clampScale } from '../ar';

/**
 * Property 15: Screen percentage range validation
 *
 * For any AnchoredLabel, HotspotRegion, or CompareCallout, the x and y
 * screen percentage values shall be constrained to the range [0, 100],
 * rejecting values outside this range.
 *
 * **Validates: Requirement 11.1**
 */
describe('AR validation — Property 15: Screen percentage range validation', () => {
  it('clampScreenPercentage always returns a value in [0, 100] for any number', () => {
    fc.assert(
      fc.property(
        fc.double({ noNaN: true, noDefaultInfinity: true }),
        (value) => {
          const result = clampScreenPercentage(value);
          expect(result).toBeGreaterThanOrEqual(0);
          expect(result).toBeLessThanOrEqual(100);
        },
      ),
      { numRuns: 1000 },
    );
  });

  it('clampScreenPercentage preserves values already in [0, 100]', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 100, noNaN: true }),
        (value) => {
          expect(clampScreenPercentage(value)).toBe(value);
        },
      ),
      { numRuns: 1000 },
    );
  });

  it('clampScale always returns a value in (0, 1] for any number', () => {
    fc.assert(
      fc.property(
        fc.double({ noNaN: true, noDefaultInfinity: true }),
        (value) => {
          const result = clampScale(value);
          expect(result).toBeGreaterThan(0);
          expect(result).toBeLessThanOrEqual(1);
        },
      ),
      { numRuns: 1000 },
    );
  });

  it('clampScale preserves values already in (0, 1]', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1e-6, max: 1, noNaN: true }),
        (value) => {
          expect(clampScale(value)).toBe(value);
        },
      ),
      { numRuns: 1000 },
    );
  });
});
