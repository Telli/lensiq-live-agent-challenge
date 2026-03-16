import { describe, it, expect } from 'vitest';
import { JitterBuffer } from '../jitterBuffer';

describe('JitterBuffer', () => {
  /** Helper: create an ArrayBuffer with a single-byte tag for identity checks. */
  const buf = (tag: number): ArrayBuffer => {
    const ab = new ArrayBuffer(1);
    new Uint8Array(ab)[0] = tag;
    return ab;
  };

  const tag = (ab: ArrayBuffer): number => new Uint8Array(ab)[0];

  // --- Requirement 3.1: FIFO ordering ---
  it('enqueues and dequeues in FIFO order', () => {
    const jb = new JitterBuffer(2);
    jb.enqueue(buf(1));
    jb.enqueue(buf(2));
    jb.enqueue(buf(3));

    expect(tag(jb.dequeue()!)).toBe(1);
    // After one dequeue depth drops to 2 (still >= minDepth)
    expect(tag(jb.dequeue()!)).toBe(2);
  });

  // --- Requirement 3.2: threshold gate ---
  it('returns null when buffer depth is below minDepth', () => {
    const jb = new JitterBuffer(3);
    jb.enqueue(buf(1));
    jb.enqueue(buf(2));
    expect(jb.dequeue()).toBeNull();
    expect(jb.bufferDepth).toBe(2);
  });

  // --- Requirement 3.3: dequeue returns oldest chunk ---
  it('returns the oldest chunk when depth >= minDepth', () => {
    const jb = new JitterBuffer(1);
    jb.enqueue(buf(42));
    expect(tag(jb.dequeue()!)).toBe(42);
  });

  // --- Requirement 3.4: flush resets to empty ---
  it('flush removes all chunks and resets to empty', () => {
    const jb = new JitterBuffer(2);
    jb.enqueue(buf(1));
    jb.enqueue(buf(2));
    jb.enqueue(buf(3));
    expect(jb.bufferDepth).toBe(3);

    jb.flush();
    expect(jb.bufferDepth).toBe(0);
    expect(jb.isReady).toBe(false);
    expect(jb.dequeue()).toBeNull();
  });

  // --- Requirement 3.5: underrun pauses until minDepth re-met ---
  it('pauses dequeue after underrun until minDepth is re-met', () => {
    const jb = new JitterBuffer(2);
    jb.enqueue(buf(1));
    jb.enqueue(buf(2));

    // Drain to below threshold
    expect(tag(jb.dequeue()!)).toBe(1);
    // depth is now 1, below minDepth of 2
    expect(jb.dequeue()).toBeNull();
    expect(jb.isReady).toBe(false);

    // Re-fill to threshold
    jb.enqueue(buf(3));
    expect(jb.isReady).toBe(true);
    expect(tag(jb.dequeue()!)).toBe(2);
  });

  // --- bufferDepth and isReady accessors ---
  it('reports correct bufferDepth and isReady', () => {
    const jb = new JitterBuffer(2);
    expect(jb.bufferDepth).toBe(0);
    expect(jb.isReady).toBe(false);

    jb.enqueue(buf(1));
    expect(jb.bufferDepth).toBe(1);
    expect(jb.isReady).toBe(false);

    jb.enqueue(buf(2));
    expect(jb.bufferDepth).toBe(2);
    expect(jb.isReady).toBe(true);
  });

  // --- default minDepth ---
  it('defaults minDepth to 2', () => {
    const jb = new JitterBuffer();
    jb.enqueue(buf(1));
    expect(jb.dequeue()).toBeNull();
    jb.enqueue(buf(2));
    expect(jb.dequeue()).not.toBeNull();
  });
});
