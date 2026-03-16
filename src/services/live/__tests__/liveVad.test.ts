import { describe, expect, it } from 'vitest';
import { AdaptiveVad } from '../liveVad';

function pcmBuffer(level: number, sampleCount: number = 160): ArrayBuffer {
  const pcm = new Int16Array(sampleCount).fill(level);
  return pcm.buffer;
}

describe('AdaptiveVad', () => {
  it('stays quiet during warmup and silence', () => {
    const vad = new AdaptiveVad();
    const result = vad.processChunk(pcmBuffer(20), 100, 100);

    expect(result.state).toBe('warming');
    expect(result.shouldStart).toBe(false);
  });

  it('starts speech after sustained energy above the adaptive threshold', () => {
    const vad = new AdaptiveVad();
    for (let time = 0; time < 500; time += 100) {
      vad.processChunk(pcmBuffer(30), 100, time);
    }

    const result = vad.processChunk(pcmBuffer(500), 160, 700);
    expect(result.shouldStart).toBe(true);
    expect(result.state).toBe('speaking');
  });

  it('can start speech even when the user begins talking during warmup', () => {
    const vad = new AdaptiveVad();

    const result = vad.processChunk(pcmBuffer(700), 160, 160);
    expect(result.shouldStart).toBe(true);
    expect(result.state).toBe('speaking');
  });

  it('suppresses immediate playback bleed after ai audio', () => {
    const vad = new AdaptiveVad();
    for (let time = 0; time < 500; time += 100) {
      vad.processChunk(pcmBuffer(30), 100, time);
    }

    vad.registerPlayback(600);
    const result = vad.processChunk(pcmBuffer(260), 100, 700);
    expect(result.state).toBe('echo-suppressed');
    expect(result.shouldStart).toBe(false);
  });

  it('still allows a strong user barge-in during playback suppression', () => {
    const vad = new AdaptiveVad();
    for (let time = 0; time < 500; time += 100) {
      vad.processChunk(pcmBuffer(30), 100, time);
    }

    vad.registerPlayback(600);
    let result = vad.processChunk(pcmBuffer(520), 80, 650);
    expect(result.shouldStart).toBe(false);
    expect(result.state).toBe('speech-candidate');

    result = vad.processChunk(pcmBuffer(540), 80, 730);
    expect(result.shouldStart).toBe(true);
    expect(result.state).toBe('speaking');
  });

  it('ends speech after sustained silence', () => {
    const vad = new AdaptiveVad();
    for (let time = 0; time < 500; time += 100) {
      vad.processChunk(pcmBuffer(30), 100, time);
    }

    vad.processChunk(pcmBuffer(600), 160, 700);
    let result = vad.processChunk(pcmBuffer(20), 300, 1000);
    expect(result.shouldEnd).toBe(false);

    result = vad.processChunk(pcmBuffer(20), 320, 1320);
    expect(result.shouldEnd).toBe(true);
    expect(result.state).toBe('quiet');
  });
});
