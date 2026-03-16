import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Encode helpers — extracted from the WebSocket boundary code in
 * src/hooks/useLiveExplore.ts (send path).
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Decode helper — extracted from the WebSocket receive path in
 * src/hooks/useLiveExplore.ts (playback path).
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Property 2: Base64 round-trip integrity
 *
 * For any ArrayBuffer of PCM audio data, base64-encoding it and then
 * base64-decoding the result shall produce an ArrayBuffer with identical
 * byte content to the original.
 *
 * **Validates: Requirements 2.2, 2.3**
 */
describe('Base64 round-trip — Property 2: Base64 round-trip integrity', () => {
  it('encoding then decoding an ArrayBuffer produces identical bytes', () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: 0, maxLength: 4096 }),
        (original: Uint8Array) => {
          const buffer = original.buffer.slice(
            original.byteOffset,
            original.byteOffset + original.byteLength,
          );

          const encoded = arrayBufferToBase64(buffer);
          const decoded = base64ToArrayBuffer(encoded);

          const decodedBytes = new Uint8Array(decoded);

          // Same length
          expect(decodedBytes.length).toBe(original.length);

          // Byte-for-byte equality
          for (let i = 0; i < original.length; i++) {
            expect(decodedBytes[i]).toBe(original[i]);
          }
        },
      ),
      { numRuns: 1000 },
    );
  });
});
