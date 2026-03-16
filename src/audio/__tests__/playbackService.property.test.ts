import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import { PlaybackService } from '../playbackService';

/**
 * Property 14: Gapless audio scheduling
 *
 * For any sequence of audio buffer durations, the PlaybackService shall
 * schedule each buffer's start time as the previous buffer's start time
 * plus its duration, ensuring no gaps or overlaps in the playback timeline.
 *
 * **Validates: Requirement 10.3**
 */

interface ScheduledEntry {
  startTime: number;
  duration: number;
  triggerOnended: () => void;
}

function createMockAudioContext(durations: number[]) {
  let idx = 0;
  const scheduled: ScheduledEntry[] = [];
  const mockCtx: any = {
    sampleRate: 24000,
    currentTime: 0,
    destination: {},
    close: vi.fn(),
    decodeAudioData: vi.fn(async () => {
      const dur = durations[idx] ?? 0.5;
      idx++;
      return { duration: dur, length: Math.round(dur * 24000), sampleRate: 24000 };
    }),
    createBufferSource: vi.fn(() => {
      const src: any = {
        buffer: null,
        onended: null,
        connect: vi.fn(),
        start: vi.fn((when: number) => {
          scheduled.push({
            startTime: when,
            duration: src.buffer?.duration ?? 0,
            triggerOnended: () => { if (src.onended) src.onended(); },
          });
        }),
      };
      return src;
    }),
  };
  return { mockCtx, scheduled };
}


const pcm = (): ArrayBuffer => new ArrayBuffer(2);
const tick = () => new Promise((r) => setTimeout(r, 0));

describe('PlaybackService — Property 14: Gapless audio scheduling', () => {
  it('start[i+1] = start[i] + duration[i]', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.double({ min: 0.01, max: 2.0, noNaN: true }), { minLength: 3, maxLength: 12 }),
        async (durations: number[]) => {
          const { mockCtx, scheduled } = createMockAudioContext(durations);
          (globalThis as any).AudioContext = function () { return mockCtx; };
          const svc = new PlaybackService(2, 24000);
          for (let i = 0; i < durations.length; i++) svc.enqueueChunk(pcm());
          for (let i = 0; i < durations.length; i++) {
            let a = 0;
            while (scheduled.length <= i && a < 50) { await tick(); a++; }
            if (scheduled.length <= i) break;
            scheduled[i].triggerOnended();
          }
          const expectedCount = durations.length - 1;
          expect(scheduled.length).toBe(expectedCount);
          expect(scheduled[0].startTime).toBe(0);
          for (let i = 1; i < scheduled.length; i++) {
            const exp = scheduled[i - 1].startTime + scheduled[i - 1].duration;
            expect(scheduled[i].startTime).toBeCloseTo(exp, 10);
          }
          svc.destroy();
        },
      ),
      { numRuns: 40 },
    );
  }, 15000);
});
