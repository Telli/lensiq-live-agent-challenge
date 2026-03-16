import { describe, it, expect } from 'vitest';
import { projectToScreen, rotateByQuaternion, WorldAnchor } from '../projectionMath';
import type { Pose6DOF } from '../../types/ar';

// Identity quaternion (no rotation) — camera looks down -z
const identityQ = { x: 0, y: 0, z: 0, w: 1 };
const defaultFov = { horizontal: 60, vertical: 45 };

function makePose(
  pos: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 },
  orientation = identityQ
): Pose6DOF {
  return { position: pos, orientation, timestamp: 0 };
}

function makeAnchor(x: number, y: number, z: number, id = 'a'): WorldAnchor {
  return { worldPosition: { x, y, z }, id };
}

describe('rotateByQuaternion', () => {
  it('identity quaternion leaves vector unchanged', () => {
    const v = { x: 1, y: 2, z: 3 };
    const result = rotateByQuaternion(v, identityQ);
    expect(result.x).toBeCloseTo(1);
    expect(result.y).toBeCloseTo(2);
    expect(result.z).toBeCloseTo(3);
  });

  it('90° rotation around Y axis rotates x to -z', () => {
    // 90° around Y: q = (0, sin(45°), 0, cos(45°))
    const angle = Math.PI / 2;
    const q = { x: 0, y: Math.sin(angle / 2), z: 0, w: Math.cos(angle / 2) };
    const v = { x: 1, y: 0, z: 0 };
    const result = rotateByQuaternion(v, q);
    expect(result.x).toBeCloseTo(0);
    expect(result.y).toBeCloseTo(0);
    expect(result.z).toBeCloseTo(-1);
  });

  it('90° rotation around X axis rotates y to z', () => {
    const angle = Math.PI / 2;
    const q = { x: Math.sin(angle / 2), y: 0, z: 0, w: Math.cos(angle / 2) };
    const v = { x: 0, y: 1, z: 0 };
    const result = rotateByQuaternion(v, q);
    expect(result.x).toBeCloseTo(0);
    expect(result.y).toBeCloseTo(0);
    expect(result.z).toBeCloseTo(1);
  });
});

describe('projectToScreen', () => {
  it('anchor directly in front of camera projects to ~(50, 50)', () => {
    // Anchor at (0, 0, -5), camera at origin with identity orientation
    const result = projectToScreen(makeAnchor(0, 0, -5), makePose(), defaultFov);
    expect(result.x).toBeCloseTo(50);
    expect(result.y).toBeCloseTo(50);
    expect(result.visible).toBe(true);
    expect(result.scale).toBeGreaterThan(0);
    expect(result.scale).toBeLessThanOrEqual(1);
  });

  it('anchor behind camera returns visible: false, scale: 0', () => {
    // Anchor at (0, 0, 5) — behind camera (positive z in camera-local)
    const result = projectToScreen(makeAnchor(0, 0, 5), makePose(), defaultFov);
    expect(result.visible).toBe(false);
    expect(result.scale).toBe(0);
  });

  it('anchor exactly at camera position (z=0 in local) is culled', () => {
    const result = projectToScreen(makeAnchor(0, 0, 0), makePose(), defaultFov);
    expect(result.visible).toBe(false);
    expect(result.scale).toBe(0);
  });

  it('scale is clamped to [0.1, 1.0] for visible anchors', () => {
    // Very close anchor → scale should cap at 1.0
    const close = projectToScreen(makeAnchor(0, 0, -0.5), makePose(), defaultFov);
    expect(close.scale).toBe(1);

    // Very far anchor → scale should floor at 0.1
    const far = projectToScreen(makeAnchor(0, 0, -100), makePose(), defaultFov);
    expect(far.scale).toBe(0.1);
  });

  it('anchor to the right of camera projects to x > 50', () => {
    const result = projectToScreen(makeAnchor(1, 0, -5), makePose(), defaultFov);
    expect(result.x).toBeGreaterThan(50);
    expect(result.visible).toBe(true);
  });

  it('anchor above camera projects to y < 50 (screen Y flipped)', () => {
    const result = projectToScreen(makeAnchor(0, 1, -5), makePose(), defaultFov);
    expect(result.y).toBeLessThan(50);
    expect(result.visible).toBe(true);
  });

  it('does not mutate input objects (purity)', () => {
    const anchor = makeAnchor(1, 2, -3);
    const pose = makePose({ x: 0.5, y: 0.5, z: 0.5 });
    const fov = { horizontal: 60, vertical: 45 };

    const anchorCopy = JSON.parse(JSON.stringify(anchor));
    const poseCopy = JSON.parse(JSON.stringify(pose));
    const fovCopy = { ...fov };

    projectToScreen(anchor, pose, fov);

    expect(anchor).toEqual(anchorCopy);
    expect(pose).toEqual(poseCopy);
    expect(fov).toEqual(fovCopy);
  });

  it('far-off-screen anchor returns visible: false', () => {
    // Anchor way to the right — should exceed the ±110 margin
    const result = projectToScreen(makeAnchor(100, 0, -1), makePose(), defaultFov);
    expect(result.visible).toBe(false);
  });

  it('works with non-origin camera position', () => {
    // Camera at (10, 0, 0), anchor at (10, 0, -5) → directly in front
    const result = projectToScreen(
      makeAnchor(10, 0, -5),
      makePose({ x: 10, y: 0, z: 0 }),
      defaultFov
    );
    expect(result.x).toBeCloseTo(50);
    expect(result.y).toBeCloseTo(50);
    expect(result.visible).toBe(true);
  });
});
