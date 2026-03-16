import type { RefObject } from 'react';
import type { ScreenProjection } from '../types/ar';

/**
 * Builds a CSS transform string using translate3d and scale for GPU-composited rendering.
 * Exported separately for testability.
 */
export function buildTransformString(x: number, y: number, scale: number): string {
  return `translate3d(${x}vw, ${y}vh, 0) scale(${scale})`;
}

/**
 * Applies a screen-space projection to a DOM element via direct ref mutation.
 * - Sets display: none when projection is not visible
 * - Restores display and applies translate3d + scale transform when visible
 * - No React state mutations — purely imperative DOM updates for 60fps rendering
 */
export function updateTransform(
  ref: RefObject<HTMLDivElement | null>,
  projection: ScreenProjection
): void {
  if (!ref.current) return;

  if (!projection.visible) {
    ref.current.style.display = 'none';
    return;
  }

  ref.current.style.display = '';
  ref.current.style.transform = buildTransformString(
    projection.x,
    projection.y,
    projection.scale
  );
}
