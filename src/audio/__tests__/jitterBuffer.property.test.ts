import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { JitterBuffer } from '../jitterBuffer';

/**
 * Property 3: Jitter buffer FIFO ordering
 *
 * For any sequence of ArrayBuffers enqueued into a JitterBuffer, dequeuing
 * them (once the buffer is ready) shall produce the same sequence in the
 * same order, with no chunks skipped or duplicated.
 *
 * **Validates: Requirements 3.1, 3.3**
 */
describe('JitterBuffer — Property 3: Jitter buffer FIFO ordering', () => {
  it('dequeued chunks match enqueued order with no skips or duplicates', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        fc.array(fc.uint8Array({ minLength: 1, maxLength: 64 }), { minLength: 1, maxLength: 50 }),
        (minDepth: number, chunks: Uint8Array[]) => {
          const jb = new JitterBuffer(minDepth);

          // Enqueue all chunks
          const enqueued: Uint8Array[] = [];
          for (const chunk of chunks) {
            const ab = new ArrayBuffer(chunk.byteLength);
            new Uint8Array(ab).set(chunk);
            jb.enqueue(ab);
            enqueued.push(new Uint8Array(ab));
          }

          // Dequeue everything that's available
          const dequeued: Uint8Array[] = [];
          let result = jb.dequeue();
          while (result !== null) {
            dequeued.push(new Uint8Array(result));
            result = jb.dequeue();
          }

          // Dequeued sequence must be a prefix of the enqueued sequence (FIFO, no skips/duplicates)
          for (let i = 0; i < dequeued.length; i++) {
            expect(dequeued[i].length).toBe(enqueued[i].length);
            for (let j = 0; j < dequeued[i].length; j++) {
              expect(dequeued[i][j]).toBe(enqueued[i][j]);
            }
          }

          // Remaining items in buffer + dequeued items == total enqueued
          expect(dequeued.length + jb.bufferDepth).toBe(enqueued.length);
        },
      ),
      { numRuns: 1000 },
    );
  });
});


/**
 * Property 4: Jitter buffer threshold gate
 *
 * For any JitterBuffer with a configured minDepth, dequeue shall return null
 * whenever the current buffer depth is below minDepth, including after an
 * underrun drains the buffer below threshold.
 *
 * **Validates: Requirements 3.2, 3.5**
 */
describe('JitterBuffer — Property 4: Jitter buffer threshold gate', () => {
  it('dequeue returns null whenever buffer depth is below minDepth', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        fc.array(
          fc.oneof(
            fc.constant('enqueue' as const),
            fc.constant('dequeue' as const),
          ),
          { minLength: 1, maxLength: 100 },
        ),
        (minDepth: number, operations: ('enqueue' | 'dequeue')[]) => {
          const jb = new JitterBuffer(minDepth);
          let depth = 0;

          for (const op of operations) {
            if (op === 'enqueue') {
              jb.enqueue(new ArrayBuffer(4));
              depth++;
            } else {
              const result = jb.dequeue();
              if (depth < minDepth) {
                // Threshold gate: must return null when below minDepth
                expect(result).toBeNull();
              } else {
                // At or above threshold: must return a buffer
                expect(result).not.toBeNull();
                depth--;
              }
            }
          }
        },
      ),
      { numRuns: 1000 },
    );
  });
});

/**
 * Property 5: Jitter buffer flush reset
 *
 * For any JitterBuffer in any state, calling flush shall result in a buffer
 * depth of 0 and subsequent dequeue calls returning null until minDepth new
 * chunks are enqueued.
 *
 * **Validates: Requirements 3.4, 3.5**
 */
describe('JitterBuffer — Property 5: Jitter buffer flush reset', () => {
  it('flush resets depth to 0 and dequeue returns null until minDepth new chunks enqueued', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        fc.array(fc.uint8Array({ minLength: 1, maxLength: 16 }), { minLength: 0, maxLength: 20 }),
        fc.integer({ min: 0, max: 20 }),
        (minDepth: number, preFlushChunks: Uint8Array[], postFlushEnqueueCount: number) => {
          const jb = new JitterBuffer(minDepth);

          // Fill buffer with some chunks before flush
          for (const chunk of preFlushChunks) {
            const ab = new ArrayBuffer(chunk.byteLength);
            new Uint8Array(ab).set(chunk);
            jb.enqueue(ab);
          }

          // Flush
          jb.flush();

          // After flush: depth must be 0
          expect(jb.bufferDepth).toBe(0);
          expect(jb.isReady).toBe(false);
          expect(jb.dequeue()).toBeNull();

          // Enqueue new chunks one at a time, verifying threshold gate
          for (let i = 0; i < postFlushEnqueueCount; i++) {
            jb.enqueue(new ArrayBuffer(4));

            if (i + 1 < minDepth) {
              // Still below threshold — dequeue must return null
              expect(jb.dequeue()).toBeNull();
            } else {
              // At or above threshold — dequeue must succeed
              expect(jb.dequeue()).not.toBeNull();
            }
          }
        },
      ),
      { numRuns: 1000 },
    );
  });
});
