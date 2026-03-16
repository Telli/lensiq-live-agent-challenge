import { describe, it, expect, vi } from 'vitest';
import { float32ToInt16 } from '../audio/pcm-capture-processor';
import { buildWavBuffer } from '../audio/wavBuilder';
import { JitterBuffer } from '../audio/jitterBuffer';
import { projectToScreen, type WorldAnchor } from '../utils/projectionMath';
import { buildTransformString, updateTransform } from '../utils/overlayTransform';
import type { Pose6DOF, ScreenProjection } from '../types/ar';

// --- Helpers: replicate the base64 encode/decode used at WebSocket boundaries ---

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function readString(view: DataView, offset: number, length: number): string {
  let s = '';
  for (let i = 0; i < length; i++) {
    s += String.fromCharCode(view.getUint8(offset + i));
  }
  return s;
}

// ============================================================
// 1. Audio pipeline integration
//    Validates: Requirements 2.1, 2.2, 2.3
// ============================================================
describe('Audio pipeline integration: capture → encode → decode → WAV', () => {
  it('Int16 PCM → base64 encode → base64 decode → buildWavBuffer produces valid WAV', () => {
    // Simulate PCM capture: create Float32 samples and convert to Int16
    const sampleCount = 128;
    const float32Samples = new Float32Array(sampleCount);
    for (let i = 0; i < sampleCount; i++) {
      float32Samples[i] = Math.sin((2 * Math.PI * i) / sampleCount); // sine wave
    }

    const int16Buffer = new Int16Array(sampleCount);
    for (let i = 0; i < sampleCount; i++) {
      int16Buffer[i] = float32ToInt16(float32Samples[i]);
    }
    const pcmArrayBuffer = int16Buffer.buffer as ArrayBuffer;

    // Simulate WebSocket send boundary: base64 encode
    const base64Encoded = arrayBufferToBase64(pcmArrayBuffer);
    expect(typeof base64Encoded).toBe('string');
    expect(base64Encoded.length).toBeGreaterThan(0);

    // Simulate WebSocket receive boundary: base64 decode
    const decodedBuffer = base64ToArrayBuffer(base64Encoded);
    expect(decodedBuffer.byteLength).toBe(pcmArrayBuffer.byteLength);

    // Verify decoded bytes match original
    const originalBytes = new Uint8Array(pcmArrayBuffer);
    const decodedBytes = new Uint8Array(decodedBuffer);
    for (let i = 0; i < originalBytes.length; i++) {
      expect(decodedBytes[i]).toBe(originalBytes[i]);
    }

    // Wrap in WAV header
    const wavBuffer = buildWavBuffer(decodedBuffer, 16000, 1, 16);

    // Verify WAV output size: 44-byte header + PCM data
    expect(wavBuffer.byteLength).toBe(44 + decodedBuffer.byteLength);

    // Verify WAV header magic bytes
    const wavView = new DataView(wavBuffer);
    expect(readString(wavView, 0, 4)).toBe('RIFF');
    expect(readString(wavView, 8, 4)).toBe('WAVE');
    expect(readString(wavView, 12, 4)).toBe('fmt ');
    expect(readString(wavView, 36, 4)).toBe('data');

    // Verify WAV header fields match 16kHz mono 16-bit
    expect(wavView.getUint32(24, true)).toBe(16000); // sample rate
    expect(wavView.getUint16(22, true)).toBe(1);     // channels
    expect(wavView.getUint16(34, true)).toBe(16);    // bits per sample
    expect(wavView.getUint32(28, true)).toBe(32000);  // byteRate = 16000*1*2
    expect(wavView.getUint16(32, true)).toBe(2);      // blockAlign = 1*2
    expect(wavView.getUint32(40, true)).toBe(decodedBuffer.byteLength); // data size
  });

  it('jitter buffer integrates with base64 decode and WAV wrapping', () => {
    const jitter = new JitterBuffer(2);

    // Simulate 3 incoming WebSocket chunks (base64-encoded PCM)
    const chunks: string[] = [];
    for (let c = 0; c < 3; c++) {
      const pcm = new Int16Array(64);
      for (let i = 0; i < 64; i++) {
        pcm[i] = float32ToInt16((c + 1) * 0.1 * Math.sin((2 * Math.PI * i) / 64));
      }
      chunks.push(arrayBufferToBase64(pcm.buffer as ArrayBuffer));
    }

    // Decode at receive boundary and enqueue
    for (const b64 of chunks) {
      jitter.enqueue(base64ToArrayBuffer(b64));
    }

    // Buffer should be ready (3 >= minDepth of 2)
    expect(jitter.isReady).toBe(true);

    // Dequeue and WAV-wrap each chunk
    const wavBuffers: ArrayBuffer[] = [];
    let chunk = jitter.dequeue();
    while (chunk !== null) {
      wavBuffers.push(buildWavBuffer(chunk, 24000, 1, 16));
      chunk = jitter.dequeue();
    }

    // We should get at least 2 WAV buffers (3 enqueued, minDepth=2)
    expect(wavBuffers.length).toBeGreaterThanOrEqual(2);

    // Each WAV buffer should be valid
    for (const wav of wavBuffers) {
      expect(wav.byteLength).toBe(44 + 128); // 64 Int16 samples = 128 bytes
      const view = new DataView(wav);
      expect(readString(view, 0, 4)).toBe('RIFF');
      expect(readString(view, 8, 4)).toBe('WAVE');
    }
  });
});

// ============================================================
// 2. AR projection pipeline integration
//    Validates: Requirements 7.1, 8.1
// ============================================================
describe('AR projection pipeline integration: pose → project → transform', () => {
  const identityPose: Pose6DOF = {
    position: { x: 0, y: 0, z: 0 },
    orientation: { x: 0, y: 0, z: 0, w: 1 }, // identity quaternion
    timestamp: 0,
  };

  const fov = { horizontal: 60, vertical: 45 };

  it('anchor in front of camera projects to valid screen coords and CSS transform', () => {
    const anchor: WorldAnchor = {
      id: 'test-1',
      worldPosition: { x: 0, y: 0, z: -5 }, // 5m directly ahead
    };

    const projection = projectToScreen(anchor, identityPose, fov);

    // Should be visible and centered
    expect(projection.visible).toBe(true);
    expect(projection.x).toBeCloseTo(50, 0);
    expect(projection.y).toBeCloseTo(50, 0);
    expect(projection.scale).toBeGreaterThan(0);
    expect(projection.scale).toBeLessThanOrEqual(1);

    // Build CSS transform string
    const css = buildTransformString(projection.x, projection.y, projection.scale);
    expect(css).toMatch(/^translate3d\(.+vw, .+vh, 0\) scale\(.+\)$/);
    expect(css).toContain('vw');
    expect(css).toContain('vh');
    expect(css).toContain('scale(');
  });

  it('anchor behind camera returns not visible with scale 0', () => {
    const anchor: WorldAnchor = {
      id: 'behind',
      worldPosition: { x: 0, y: 0, z: 5 }, // behind camera (positive z)
    };

    const projection = projectToScreen(anchor, identityPose, fov);

    expect(projection.visible).toBe(false);
    expect(projection.scale).toBe(0);
  });

  it('anchor to the right projects to x > 50', () => {
    const anchor: WorldAnchor = {
      id: 'right',
      worldPosition: { x: 2, y: 0, z: -5 }, // right of center
    };

    const projection = projectToScreen(anchor, identityPose, fov);

    expect(projection.visible).toBe(true);
    expect(projection.x).toBeGreaterThan(50);
  });

  it('anchor above camera projects to y < 50', () => {
    const anchor: WorldAnchor = {
      id: 'above',
      worldPosition: { x: 0, y: 2, z: -5 }, // above center
    };

    const projection = projectToScreen(anchor, identityPose, fov);

    expect(projection.visible).toBe(true);
    expect(projection.y).toBeLessThan(50); // screen Y is flipped
  });

  it('updateTransform sets style.transform on a mock DOM element when visible', () => {
    const mockElement = {
      style: { transform: '', display: '' },
    };
    const ref = { current: mockElement as unknown as HTMLDivElement };

    const anchor: WorldAnchor = {
      id: 'dom-test',
      worldPosition: { x: 0, y: 0, z: -3 },
    };

    const projection = projectToScreen(anchor, identityPose, fov);
    expect(projection.visible).toBe(true);

    updateTransform(ref, projection);

    expect(mockElement.style.display).toBe('');
    expect(mockElement.style.transform).toBe(
      buildTransformString(projection.x, projection.y, projection.scale)
    );
  });

  it('updateTransform sets display none when projection is not visible', () => {
    const mockElement = {
      style: { transform: 'old-value', display: '' },
    };
    const ref = { current: mockElement as unknown as HTMLDivElement };

    const notVisible: ScreenProjection = {
      x: 0, y: 0, scale: 0, visible: false,
    };

    updateTransform(ref, notVisible);

    expect(mockElement.style.display).toBe('none');
  });
});

// ============================================================
// 3. Fallback detection
//    Validates: Requirement 6.1
// ============================================================
describe('Fallback detection: CapacitorARPlugin.isAvailable() returns false', () => {
  it('web fallback plugin reports AR as unavailable', async () => {
    // The capacitorAR module exports a singleton that uses WebFallbackARPlugin
    // in a plain Node/browser environment (no Capacitor native shell).
    const { capacitorARPlugin } = await import('../plugins/capacitorAR');

    const available = await capacitorARPlugin.isAvailable();

    // In a test environment (no Capacitor), isAvailable must return false,
    // which triggers the 3DOF fallback path.
    expect(available).toBe(false);
  });

  it('web fallback plugin throws on startSession', async () => {
    const { capacitorARPlugin } = await import('../plugins/capacitorAR');

    await expect(
      capacitorARPlugin.startSession({ targetFps: 60 })
    ).rejects.toThrow('AR is not available in this environment');
  });

  it('web fallback addPoseListener returns a no-op handle', async () => {
    const { capacitorARPlugin } = await import('../plugins/capacitorAR');

    const callback = vi.fn();
    const handle = capacitorARPlugin.addPoseListener(callback);

    // The handle should have a remove method that doesn't throw
    expect(typeof handle.remove).toBe('function');
    handle.remove(); // should not throw

    // Callback should never be called (no native AR)
    expect(callback).not.toHaveBeenCalled();
  });
});
