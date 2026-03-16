import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { buildTransformString } from '../overlayTransform';

/**
 * Property 13: Overlay transform string format
 *
 * For any screen-space x, y percentages and scale factor, the OverlayRenderer
 * shall produce a CSS transform string matching the format
 * `translate3d({x}vw, {y}vh, 0) scale({scale})`.
 *
 * **Validates: Requirement 8.2**
 */
describe('OverlayTransform — Property 13: Overlay transform string format', () => {
  const finiteDouble = fc.double({ noNaN: true, noDefaultInfinity: true });

  it('output matches the expected translate3d + scale format for any finite inputs', () => {
    fc.assert(
      fc.property(finiteDouble, finiteDouble, finiteDouble, (x, y, scale) => {
        const result = buildTransformString(x, y, scale);
        const expected = `translate3d(${x}vw, ${y}vh, 0) scale(${scale})`;
        expect(result).toBe(expected);
      }),
      { numRuns: 1000 },
    );
  });

  it('output contains the exact input values in the correct positions', () => {
    fc.assert(
      fc.property(finiteDouble, finiteDouble, finiteDouble, (x, y, scale) => {
        const result = buildTransformString(x, y, scale);

        // Verify structural format via regex
        const pattern = /^translate3d\((.+)vw, (.+)vh, 0\) scale\((.+)\)$/;
        const match = result.match(pattern);
        expect(match).not.toBeNull();

        // Verify extracted values match inputs
        const parsedX = match![1];
        const parsedY = match![2];
        const parsedScale = match![3];
        expect(parsedX).toBe(String(x));
        expect(parsedY).toBe(String(y));
        expect(parsedScale).toBe(String(scale));
      }),
      { numRuns: 1000 },
    );
  });
});
