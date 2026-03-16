import { describe, it, expect, beforeEach } from 'vitest';
import { buildTransformString, updateTransform } from '../overlayTransform';
import type { ScreenProjection } from '../../types/ar';

/**
 * Creates a minimal mock of a RefObject<HTMLDivElement> with a style object.
 */
function createMockRef() {
  const style: Record<string, string> = { display: '', transform: '' };
  const element = { style } as unknown as HTMLDivElement;
  return { current: element };
}

describe('buildTransformString', () => {
  it('produces correct translate3d + scale format', () => {
    expect(buildTransformString(50, 50, 1)).toBe('translate3d(50vw, 50vh, 0) scale(1)');
  });

  it('handles decimal values', () => {
    expect(buildTransformString(12.5, 87.3, 0.45)).toBe(
      'translate3d(12.5vw, 87.3vh, 0) scale(0.45)'
    );
  });

  it('handles zero values', () => {
    expect(buildTransformString(0, 0, 0)).toBe('translate3d(0vw, 0vh, 0) scale(0)');
  });

  it('handles boundary percentage values', () => {
    expect(buildTransformString(100, 100, 1)).toBe('translate3d(100vw, 100vh, 0) scale(1)');
  });
});

describe('updateTransform', () => {
  let ref: ReturnType<typeof createMockRef>;

  beforeEach(() => {
    ref = createMockRef();
  });

  it('sets display to none when projection is not visible', () => {
    const projection: ScreenProjection = { x: 50, y: 50, scale: 0.5, visible: false };
    updateTransform(ref, projection);
    expect(ref.current!.style.display).toBe('none');
  });

  it('does not set transform when projection is not visible', () => {
    ref.current!.style.transform = 'old-value';
    const projection: ScreenProjection = { x: 50, y: 50, scale: 0.5, visible: false };
    updateTransform(ref, projection);
    expect(ref.current!.style.transform).toBe('old-value');
  });

  it('restores display and applies transform when visible', () => {
    // First hide it
    ref.current!.style.display = 'none';
    const projection: ScreenProjection = { x: 25, y: 75, scale: 0.8, visible: true };
    updateTransform(ref, projection);
    expect(ref.current!.style.display).toBe('');
    expect(ref.current!.style.transform).toBe('translate3d(25vw, 75vh, 0) scale(0.8)');
  });

  it('does nothing when ref.current is null', () => {
    const nullRef = { current: null };
    const projection: ScreenProjection = { x: 50, y: 50, scale: 1, visible: true };
    // Should not throw
    expect(() => updateTransform(nullRef, projection)).not.toThrow();
  });

  it('applies correct transform for visible projection', () => {
    const projection: ScreenProjection = { x: 10, y: 90, scale: 0.3, visible: true };
    updateTransform(ref, projection);
    expect(ref.current!.style.transform).toBe('translate3d(10vw, 90vh, 0) scale(0.3)');
  });

  it('transitions from visible to hidden correctly', () => {
    // First make visible
    updateTransform(ref, { x: 50, y: 50, scale: 1, visible: true });
    expect(ref.current!.style.display).toBe('');
    expect(ref.current!.style.transform).toBe('translate3d(50vw, 50vh, 0) scale(1)');

    // Then hide
    updateTransform(ref, { x: 50, y: 50, scale: 1, visible: false });
    expect(ref.current!.style.display).toBe('none');
  });

  it('transitions from hidden to visible correctly', () => {
    // First hide
    updateTransform(ref, { x: 0, y: 0, scale: 0, visible: false });
    expect(ref.current!.style.display).toBe('none');

    // Then show
    updateTransform(ref, { x: 30, y: 60, scale: 0.5, visible: true });
    expect(ref.current!.style.display).toBe('');
    expect(ref.current!.style.transform).toBe('translate3d(30vw, 60vh, 0) scale(0.5)');
  });
});
