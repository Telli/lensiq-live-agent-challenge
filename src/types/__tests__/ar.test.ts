import { describe, it, expect } from 'vitest';
import { clampScreenPercentage, clampScale } from '../ar';

describe('clampScreenPercentage', () => {
  it('returns value unchanged when within [0, 100]', () => {
    expect(clampScreenPercentage(0)).toBe(0);
    expect(clampScreenPercentage(50)).toBe(50);
    expect(clampScreenPercentage(100)).toBe(100);
  });

  it('clamps negative values to 0', () => {
    expect(clampScreenPercentage(-1)).toBe(0);
    expect(clampScreenPercentage(-100)).toBe(0);
  });

  it('clamps values above 100 to 100', () => {
    expect(clampScreenPercentage(101)).toBe(100);
    expect(clampScreenPercentage(999)).toBe(100);
  });
});

describe('clampScale', () => {
  it('returns value unchanged when within (0, 1]', () => {
    expect(clampScale(0.5)).toBe(0.5);
    expect(clampScale(1)).toBe(1);
    expect(clampScale(0.001)).toBe(0.001);
  });

  it('clamps zero to a small positive epsilon', () => {
    const result = clampScale(0);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(1);
  });

  it('clamps negative values to a small positive epsilon', () => {
    const result = clampScale(-5);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(1);
  });

  it('clamps values above 1 to 1', () => {
    expect(clampScale(1.5)).toBe(1);
    expect(clampScale(100)).toBe(1);
  });
});
