import type { Pose6DOF, ScreenProjection } from '../types/ar';

export interface WorldAnchor {
  worldPosition: { x: number; y: number; z: number };
  id: string;
}

/**
 * Rotates a 3D vector by a quaternion using the formula:
 *   v' = q * v * q^(-1)
 * Expanded to avoid constructing intermediate quaternion objects.
 */
export function rotateByQuaternion(
  v: { x: number; y: number; z: number },
  q: { x: number; y: number; z: number; w: number }
): { x: number; y: number; z: number } {
  const { x: qx, y: qy, z: qz, w: qw } = q;

  // t = 2 * (q_xyz × v)
  const tx = 2 * (qy * v.z - qz * v.y);
  const ty = 2 * (qz * v.x - qx * v.z);
  const tz = 2 * (qx * v.y - qy * v.x);

  return {
    x: v.x + qw * tx + (qy * tz - qz * ty),
    y: v.y + qw * ty + (qz * tx - qx * tz),
    z: v.z + qw * tz + (qx * ty - qy * tx),
  };
}

/**
 * Projects a world-space anchor to screen-space percentages given
 * the current camera pose and field-of-view.
 *
 * Pure function — no side effects, no input mutation.
 */
export function projectToScreen(
  anchor: WorldAnchor,
  cameraPose: Pose6DOF,
  fov: { horizontal: number; vertical: number }
): ScreenProjection {
  // 1. World-space delta from camera to anchor
  const dx = anchor.worldPosition.x - cameraPose.position.x;
  const dy = anchor.worldPosition.y - cameraPose.position.y;
  const dz = anchor.worldPosition.z - cameraPose.position.z;

  // 2. Apply inverse camera quaternion to get camera-local coordinates
  const q = cameraPose.orientation;
  const qInv = { x: -q.x, y: -q.y, z: -q.z, w: q.w };
  const local = rotateByQuaternion({ x: dx, y: dy, z: dz }, qInv);

  // 3. Behind-camera culling (camera looks down -z in local space)
  if (local.z >= 0) {
    return { x: 0, y: 0, scale: 0, visible: false };
  }

  // 4. Perspective divide to NDC [-1, 1]
  const tanHalfH = Math.tan((fov.horizontal / 2) * (Math.PI / 180));
  const tanHalfV = Math.tan((fov.vertical / 2) * (Math.PI / 180));

  const ndcX = local.x / (-local.z * tanHalfH);
  const ndcY = local.y / (-local.z * tanHalfV);

  // 5. NDC → screen percentage [0, 100]
  const screenX = (ndcX + 1) * 50;
  const screenY = (1 - ndcY) * 50; // flip Y (screen Y goes down)

  // 6. Depth-based scale clamped to [0.1, 1.0]
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const scale = Math.min(1, Math.max(0.1, 2 / distance));

  return {
    x: screenX,
    y: screenY,
    scale,
    visible: screenX >= -10 && screenX <= 110 && screenY >= -10 && screenY <= 110,
  };
}
