/**
 * PlaybackService — Integrates JitterBuffer with WAV header builder and
 * Web Audio API for gapless audio playback with error recovery.
 *
 * Enqueued PCM chunks are buffered via JitterBuffer, wrapped with a WAV
 * header, decoded via `decodeAudioData`, and scheduled for gapless
 * sequential playback using `AudioBufferSourceNode.start(scheduledTime)`.
 *
 * Corrupted chunks that fail `decodeAudioData` are silently skipped so
 * the pipeline continues without interruption.
 *
 * @see Requirements 10.1, 10.2, 10.3
 */

import { JitterBuffer } from './jitterBuffer';
import { buildWavBuffer } from './wavBuilder';

interface PlaybackServiceOptions {
  onDecodeError?: () => void;
  onUnderrun?: () => void;
}

export class PlaybackService {
  private readonly jitterBuffer: JitterBuffer;
  private readonly audioContext: AudioContext;
  private readonly onDecodeError?: () => void;
  private readonly onUnderrun?: () => void;
  private nextStartTime: number = 0;
  private scheduling: boolean = false;
  private destroyed: boolean = false;
  private currentSource: AudioBufferSourceNode | null = null;
  private generation: number = 0;
  private readonly scheduledSources = new Set<AudioBufferSourceNode>();
  private hasStartedPlayback: boolean = false;

  constructor(
    minDepth: number = 2,
    sampleRate: number = 24000,
    options: PlaybackServiceOptions = {},
  ) {
    this.jitterBuffer = new JitterBuffer(minDepth);
    this.audioContext = new AudioContext({ sampleRate });
    this.onDecodeError = options.onDecodeError;
    this.onUnderrun = options.onUnderrun;
  }

  /**
   * Enqueue a raw PCM chunk and trigger the scheduling pipeline.
   */
  enqueueChunk(pcmArrayBuffer: ArrayBuffer): void {
    if (this.destroyed) return;
    this.jitterBuffer.enqueue(pcmArrayBuffer);
    this.schedulePlayback();
  }

  get bufferDepth(): number {
    return this.jitterBuffer.bufferDepth;
  }

  get scheduledSourceCount(): number {
    return this.scheduledSources.size;
  }

  /**
   * Flush the jitter buffer and reset the scheduling timeline.
   */
  flush(): void {
    this.generation += 1;
    this.jitterBuffer.flush();
    for (const source of this.scheduledSources) {
      source.onended = null;
      try {
        source.stop();
      } catch {
        // Source may already be stopped.
      }
      if (typeof source.disconnect === 'function') {
        source.disconnect();
      }
    }
    this.scheduledSources.clear();
    this.currentSource = null;
    this.scheduling = false;
    this.nextStartTime = 0;
    this.hasStartedPlayback = false;
  }

  /**
   * Immediately stop any in-flight playback and discard buffered chunks.
   */
  interrupt(): void {
    this.flush();
  }

  /**
   * Close the AudioContext and release resources.
   */
  destroy(): void {
    this.flush();
    this.destroyed = true;
    try {
      const p = this.audioContext.close();
      if (p && p.catch) p.catch(() => {});
    } catch (e) {
      // Ignored
    }
  }

  async prime(): Promise<void> {
    if (this.destroyed) {
      return;
    }
    await this.ensureContextResumed();
  }

  /**
   * Ensure the AudioContext is running. On mobile browsers, AudioContexts
   * start in a "suspended" state due to autoplay policies and must be
   * explicitly resumed after a user gesture.
   */
  private async ensureContextResumed(): Promise<void> {
    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch {
        // Best-effort; some environments don't support resume.
      }
    }
  }

  /**
   * Dequeue the next chunk, wrap it in a WAV header, decode it, and
   * schedule gapless playback. On decode failure the corrupted chunk is
   * skipped and the next chunk is attempted.
   *
   * Uses greedy scheduling: after successfully scheduling a source, it
   * immediately attempts to drain additional ready chunks rather than
   * waiting for the onended callback. This eliminates gaps when chunks
   * arrive faster than realtime.
   */
  private schedulePlayback(): void {
    if (this.scheduling || this.destroyed) return;

    const chunk = this.jitterBuffer.dequeue();
    if (!chunk) {
      if (this.hasStartedPlayback && this.jitterBuffer.bufferDepth > 0) {
        this.onUnderrun?.();
      }
      return;
    }

    this.scheduling = true;
    const generation = this.generation;

    const wavBuffer = buildWavBuffer(chunk, this.audioContext.sampleRate, 1, 16);

    this.ensureContextResumed().then(() => {
      if (this.destroyed || generation !== this.generation) {
        this.scheduling = false;
        return null;
      }
      try {
        return this.audioContext.decodeAudioData(wavBuffer);
      } catch (err) {
        return null;
      }
    }).then(
      (audioBuffer) => {
        if (!audioBuffer || this.destroyed || generation !== this.generation) {
          this.scheduling = false;
          return;
        }

        const source = this.audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.audioContext.destination);
        this.currentSource = source;
        this.scheduledSources.add(source);

        const now = this.audioContext.currentTime;
        const startAt = Math.max(now, this.nextStartTime);
        source.start(startAt);
        this.nextStartTime = startAt + audioBuffer.duration;
        this.hasStartedPlayback = true;

        source.onended = () => {
          this.scheduledSources.delete(source);
          if (this.currentSource === source) {
            this.currentSource = null;
          }
          if (typeof source.disconnect === 'function') {
            source.disconnect();
          }
          // Greedy: try to schedule the next chunk immediately on end
          this.schedulePlayback();
        };

        // Greedy scheduling: unlock and immediately try the next chunk
        // while the current one is playing.
        this.scheduling = false;
        this.schedulePlayback();
      },
      () => {
        // Requirement 10.1 & 10.2: skip corrupted chunk, continue pipeline
        this.onDecodeError?.();
        this.scheduling = false;
        this.schedulePlayback();
      }
    );
  }
}
