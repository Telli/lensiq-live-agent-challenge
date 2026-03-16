/**
 * JitterBuffer — FIFO queue that accumulates incoming audio chunks to a
 * configurable depth threshold before releasing them for playback.
 *
 * Absorbs network jitter by requiring `minDepth` buffered chunks before
 * dequeue returns data. On underrun the buffer pauses until the threshold
 * is re-met.
 *
 * A `maxDepth` cap prevents unbounded memory growth when chunks arrive
 * faster than playback can consume (e.g., network burst). When exceeded
 * the oldest chunks are dropped.
 *
 * @see Requirements 3.1, 3.2, 3.3, 3.4, 3.5
 */
export class JitterBuffer {
  private queue: ArrayBuffer[] = [];
  private readonly minDepth: number;
  private readonly maxDepth: number;

  constructor(minDepth: number = 2, maxDepth: number = 50) {
    this.minDepth = minDepth;
    this.maxDepth = maxDepth;
  }

  /** Current number of chunks in the buffer. */
  get bufferDepth(): number {
    return this.queue.length;
  }

  /** True when enough chunks are buffered to begin (or resume) playback. */
  get isReady(): boolean {
    return this.queue.length >= this.minDepth;
  }

  /** Append a PCM chunk to the end of the queue (FIFO). Drops oldest if at max depth. */
  enqueue(pcmArrayBuffer: ArrayBuffer): void {
    this.queue.push(pcmArrayBuffer);
    // Prevent unbounded memory growth: drop oldest chunks when over cap
    while (this.queue.length > this.maxDepth) {
      this.queue.shift();
    }
  }

  /**
   * Remove and return the oldest chunk, or `null` if the buffer depth is
   * below `minDepth` (including after an underrun).
   */
  dequeue(): ArrayBuffer | null {
    if (!this.isReady) return null;
    return this.queue.shift() ?? null;
  }

  /** Remove all enqueued chunks and reset to an empty state. */
  flush(): void {
    this.queue = [];
  }
}
