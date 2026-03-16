import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { projectToScreen, rotateByQuaternion, WorldAnchor } from '../projectionMath';
import type { Pose6DOF } from '../../types/ar';

// --- Helpers & Generators ---

const finiteCoord = fc.double({ min: -1000, max: 1000, noNaN: true, noDefaultInfinity: true });

const fovArb = fc.record({
  horizontal: fc.double({ min: 10, max: 170, noNaN: true, noDefaultInfinity: true }),
  vertical: fc.double({ min: 10, max: 170, noNaN: true, noDefaultInfinity: true }),
});

const positionArb = fc.record({
  x: finiteCoord,
  y: finiteCoord,
  z: finiteCoord,
});

const unitQuaternionArb = fc
  .tuple(
    fc.double({ min: -1, max: 1, noNaN: true, noDefaultInfinity: true }),
    fc.double({ min: -1, max: 1, noNaN: true, noDefaultInfinity: true }),
    fc.double({ min: -1, max: 1, noNaN: true, noDefaultInfinity: true }),
    fc.double({ min: -1, max: 1, noNaN: true, noDefaultInfinity: true }),
  )
  .filter(([x, y, z, w]) => {
    const len = Math.sqrt(x * x + y * y + z * z + w * w);
    return len > 0.01;
  })
  .map(([x, y, z, w]) => {
    const len = Math.sqrt(x * x + y * y + z * z + w * w);
    return { x: x / len, y: y / len, z: z / len, w: w / len };
  });

function makePose(
  position: { x: number; y: number; z: number },
  orientation: { x: number; y: number; z: number; w: number },
): Pose6DOF {
  return { position, orientation, timestamp: 0 };
}

function makeAnchor(x: number, y: number, z: number): WorldAnchor {
  return { worldPosition: { x, y, z }, id: 'test' };
}

/**
 * Property 8: Behind-camera culling
 *
 * For any anchor whose camera-local z coordinate is >= 0 (behind the camera),
 * projectToScreen shall return visible as false and scale as 0.
 *
 * **Validates: Requirements 7.2**
 */
describe('ProjectionMath — Property 8: Behind-camera culling', () => {
  it('anchors behind the camera return visible: false and scale: 0', () => {
    fc.assert(
      fc.property(
        positionArb,
        unitQuaternionArb,
        fovArb,
        fc.double({ min: 0.01, max: 500, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: -100, max: 100, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: -100, max: 100, noNaN: true, noDefaultInfinity: true }),
        (camPos, camOri, fov, localZ, localX, localY) => {
          // Build a camera-local point with z > 0 (behind camera)
          // Using min 0.01 to avoid floating-point edge cases at exactly z=0
          const localPoint = { x: localX, y: localY, z: localZ };
          // Rotate from camera-local to world space using the camera orientation
          const worldOffset = rotateByQuaternion(localPoint, camOri);
          const anchor = makeAnchor(
            camPos.x + worldOffset.x,
            camPos.y + worldOffset.y,
            camPos.z + worldOffset.z,
          );
          const pose = makePose(camPos, camOri);
          const result = projectToScreen(anchor, pose, fov);
          expect(result.visible).toBe(false);
          expect(result.scale).toBe(0);
        },
      ),
      { numRuns: 500 },
    );
  });
});

/**
 * Property 9: In-FOV projection range
 *
 * For any anchor that is in front of the camera and within the horizontal and
 * vertical field of view, projectToScreen shall return x and y as screen
 * percentages in the range [0, 100] and visible as true.
 *
 * Strategy: place anchors along the camera's forward direction (-z in camera-local)
 * with small lateral offsets that stay within the FOV cone.
 *
 * **Validates: Requirements 7.3**
 */
describe('ProjectionMath — Property 9: In-FOV projection range', () => {
  it('in-FOV anchors project to x,y in [0,100] and visible: true', () => {
    fc.assert(
      fc.property(
        positionArb,
        unitQuaternionArb,
        fovArb,
        fc.double({ min: 1, max: 200, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: -0.4, max: 0.4, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: -0.4, max: 0.4, noNaN: true, noDefaultInfinity: true }),
        (camPos, camOri, fov, depth, hFrac, vFrac) => {
          // hFrac/vFrac are fractions of the half-FOV angle, kept well within [-0.4, 0.4]
          // so the anchor is comfortably inside the FOV
          const tanHalfH = Math.tan((fov.horizontal / 2) * (Math.PI / 180));
          const tanHalfV = Math.tan((fov.vertical / 2) * (Math.PI / 180));

          // Camera-local position: in front (negative z), with lateral offsets within FOV
          const localX = hFrac * tanHalfH * depth;
          const localY = vFrac * tanHalfV * depth;
          const localZ = -depth;

          // Rotate from camera-local to world space
          const worldOffset = rotateByQuaternion({ x: localX, y: localY, z: localZ }, camOri);
          const anchor = makeAnchor(
            camPos.x + worldOffset.x,
            camPos.y + worldOffset.y,
            camPos.z + worldOffset.z,
          );
          const pose = makePose(camPos, camOri);
          const result = projectToScreen(anchor, pose, fov);

          expect(result.visible).toBe(true);
          expect(result.x).toBeGreaterThanOrEqual(0);
          expect(result.x).toBeLessThanOrEqual(100);
          expect(result.y).toBeGreaterThanOrEqual(0);
          expect(result.y).toBeLessThanOrEqual(100);
        },
      ),
      { numRuns: 500 },
    );
  });
});

/**
 * Property 10: Projection scale clamping
 *
 * For any anchor and camera position, the scale value returned by projectToScreen
 * shall be in the range [0.1, 1.0] when the anchor is visible.
 *
 * **Validates: Requirements 7.4**
 */
describe('ProjectionMath — Property 10: Projection scale clamping', () => {
  it('scale is in [0.1, 1.0] for all visible anchors', () => {
    fc.assert(
      fc.property(
        positionArb,
        unitQuaternionArb,
        fovArb,
        fc.double({ min: 0.5, max: 200, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: -0.3, max: 0.3, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: -0.3, max: 0.3, noNaN: true, noDefaultInfinity: true }),
        (camPos, camOri, fov, depth, hFrac, vFrac) => {
          const tanHalfH = Math.tan((fov.horizontal / 2) * (Math.PI / 180));
          const tanHalfV = Math.tan((fov.vertical / 2) * (Math.PI / 180));
          const localX = hFrac * tanHalfH * depth;
          const localY = vFrac * tanHalfV * depth;
          const localZ = -depth;

          const worldOffset = rotateByQuaternion({ x: localX, y: localY, z: localZ }, camOri);
          const anchor = makeAnchor(
            camPos.x + worldOffset.x,
            camPos.y + worldOffset.y,
            camPos.z + worldOffset.z,
          );
          const pose = makePose(camPos, camOri);
          const result = projectToScreen(anchor, pose, fov);

          if (result.visible) {
            expect(result.scale).toBeGreaterThanOrEqual(0.1);
            expect(result.scale).toBeLessThanOrEqual(1.0);
          }
        },
      ),
      { numRuns: 500 },
    );
  });
});

/**
 * Property 11: Projection function purity
 *
 * For any inputs (anchor, cameraPose, fov), calling projectToScreen shall not
 * mutate any of the input objects.
 *
 * **Validates: Requirements 7.5**
 */
describe('ProjectionMath — Property 11: Projection function purity', () => {
  it('projectToScreen does not mutate any input objects', () => {
    fc.assert(
      fc.property(
        positionArb,
        positionArb,
        unitQuaternionArb,
        fovArb,
        (anchorPos, camPos, camOri, fov) => {
          const anchor: WorldAnchor = {
            worldPosition: { ...anchorPos },
            id: 'purity-test',
          };
          const pose: Pose6DOF = {
            position: { ...camPos },
            orientation: { ...camOri },
            timestamp: 42,
          };
          const fovInput = { ...fov };

          // Snapshot values (not references) for comparison
          const anchorBefore = {
            worldPosition: { x: anchor.worldPosition.x, y: anchor.worldPosition.y, z: anchor.worldPosition.z },
            id: anchor.id,
          };
          const poseBefore = {
            position: { x: pose.position.x, y: pose.position.y, z: pose.position.z },
            orientation: { x: pose.orientation.x, y: pose.orientation.y, z: pose.orientation.z, w: pose.orientation.w },
            timestamp: pose.timestamp,
          };
          const fovBefore = { horizontal: fovInput.horizontal, vertical: fovInput.vertical };

          projectToScreen(anchor, pose, fovInput);

          // Use Object.is-safe comparison to handle -0 vs 0
          expect(Object.is(anchor.worldPosition.x, anchorBefore.worldPosition.x)).toBe(true);
          expect(Object.is(anchor.worldPosition.y, anchorBefore.worldPosition.y)).toBe(true);
          expect(Object.is(anchor.worldPosition.z, anchorBefore.worldPosition.z)).toBe(true);
          expect(anchor.id).toBe(anchorBefore.id);

          expect(Object.is(pose.position.x, poseBefore.position.x)).toBe(true);
          expect(Object.is(pose.position.y, poseBefore.position.y)).toBe(true);
          expect(Object.is(pose.position.z, poseBefore.position.z)).toBe(true);
          expect(Object.is(pose.orientation.x, poseBefore.orientation.x)).toBe(true);
          expect(Object.is(pose.orientation.y, poseBefore.orientation.y)).toBe(true);
          expect(Object.is(pose.orientation.z, poseBefore.orientation.z)).toBe(true);
          expect(Object.is(pose.orientation.w, poseBefore.orientation.w)).toBe(true);
          expect(pose.timestamp).toBe(poseBefore.timestamp);

          expect(Object.is(fovInput.horizontal, fovBefore.horizontal)).toBe(true);
          expect(Object.is(fovInput.vertical, fovBefore.vertical)).toBe(true);
        },
      ),
      { numRuns: 500 },
    );
  });
});

/**
 * Property 12: Center-of-FOV projection symmetry
 *
 * For any camera pose with a unit quaternion orientation, an anchor placed
 * directly along the camera's negative-z axis at the center of the field of
 * view shall project to approximately (50, 50).
 *
 * Strategy: compute the camera's forward vector from the quaternion, place the
 * anchor at camera position + forward * distance.
 *
 * **Validates: Requirements 7.6**
 */
describe('ProjectionMath — Property 12: Center-of-FOV projection symmetry', () => {
  it('anchor along camera forward axis projects to ~(50, 50)', () => {
    fc.assert(
      fc.property(
        positionArb,
        unitQuaternionArb,
        fovArb,
        fc.double({ min: 1, max: 200, noNaN: true, noDefaultInfinity: true }),
        (camPos, camOri, fov, distance) => {
          // Camera forward direction is -z in camera-local space: (0, 0, -1)
          // Rotate (0, 0, -1) by the camera orientation to get world-space forward
          const forward = rotateByQuaternion({ x: 0, y: 0, z: -1 }, camOri);

          const anchor = makeAnchor(
            camPos.x + forward.x * distance,
            camPos.y + forward.y * distance,
            camPos.z + forward.z * distance,
          );
          const pose = makePose(camPos, camOri);
          const result = projectToScreen(anchor, pose, fov);

          expect(result.visible).toBe(true);
          expect(result.x).toBeCloseTo(50, 0);
          expect(result.y).toBeCloseTo(50, 0);
        },
      ),
      { numRuns: 500 },
    );
  });
});
