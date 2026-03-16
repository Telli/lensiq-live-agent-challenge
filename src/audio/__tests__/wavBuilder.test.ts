import { describe, it, expect } from 'vitest';
import { buildWavBuffer } from '../wavBuilder';

describe('buildWavBuffer', () => {
  /** Helper: create a PCM ArrayBuffer of a given byte length. */
  const pcm = (byteLength: number): ArrayBuffer => new ArrayBuffer(byteLength);

  const readString = (view: DataView, offset: number, length: number): string => {
    let s = '';
    for (let i = 0; i < length; i++) {
      s += String.fromCharCode(view.getUint8(offset + i));
    }
    return s;
  };

  // --- Requirement 4.1: output size is exactly 44 + pcmData.byteLength ---
  it('produces an ArrayBuffer of exactly 44 + PCM data length', () => {
    const data = pcm(100);
    const wav = buildWavBuffer(data, 24000, 1, 16);
    expect(wav.byteLength).toBe(144);
  });

  it('produces correct size for empty PCM data', () => {
    const wav = buildWavBuffer(pcm(0), 24000, 1, 16);
    expect(wav.byteLength).toBe(44);
  });

  // --- Requirement 4.2: correct magic bytes ---
  it('writes RIFF at bytes [0..3]', () => {
    const wav = buildWavBuffer(pcm(10));
    const view = new DataView(wav);
    expect(readString(view, 0, 4)).toBe('RIFF');
  });

  it('writes WAVE at bytes [8..11]', () => {
    const wav = buildWavBuffer(pcm(10));
    const view = new DataView(wav);
    expect(readString(view, 8, 4)).toBe('WAVE');
  });

  it('writes "fmt " at bytes [12..15]', () => {
    const wav = buildWavBuffer(pcm(10));
    const view = new DataView(wav);
    expect(readString(view, 12, 4)).toBe('fmt ');
  });

  it('writes "data" at bytes [36..39]', () => {
    const wav = buildWavBuffer(pcm(10));
    const view = new DataView(wav);
    expect(readString(view, 36, 4)).toBe('data');
  });

  // --- Requirement 4.3: correct byteRate, blockAlign, sub-chunk sizes ---
  it('encodes correct header fields for mono 24kHz 16-bit', () => {
    const data = pcm(480);
    const wav = buildWavBuffer(data, 24000, 1, 16);
    const view = new DataView(wav);

    // File size field: totalSize - 8
    expect(view.getUint32(4, true)).toBe(44 + 480 - 8);
    // fmt sub-chunk size
    expect(view.getUint32(16, true)).toBe(16);
    // Audio format (PCM = 1)
    expect(view.getUint16(20, true)).toBe(1);
    // Num channels
    expect(view.getUint16(22, true)).toBe(1);
    // Sample rate
    expect(view.getUint32(24, true)).toBe(24000);
    // Byte rate: 24000 * 1 * 2 = 48000
    expect(view.getUint32(28, true)).toBe(48000);
    // Block align: 1 * 2 = 2
    expect(view.getUint16(32, true)).toBe(2);
    // Bits per sample
    expect(view.getUint16(34, true)).toBe(16);
    // Data sub-chunk size
    expect(view.getUint32(40, true)).toBe(480);
  });

  it('encodes correct header fields for stereo 44100Hz 16-bit', () => {
    const data = pcm(1000);
    const wav = buildWavBuffer(data, 44100, 2, 16);
    const view = new DataView(wav);

    expect(view.getUint16(22, true)).toBe(2);
    expect(view.getUint32(24, true)).toBe(44100);
    // Byte rate: 44100 * 2 * 2 = 176400
    expect(view.getUint32(28, true)).toBe(176400);
    // Block align: 2 * 2 = 4
    expect(view.getUint16(32, true)).toBe(4);
    expect(view.getUint32(40, true)).toBe(1000);
  });

  // --- PCM payload integrity ---
  it('copies PCM payload bytes after the 44-byte header', () => {
    const data = new ArrayBuffer(4);
    new Uint8Array(data).set([0xDE, 0xAD, 0xBE, 0xEF]);

    const wav = buildWavBuffer(data, 24000, 1, 16);
    const payload = new Uint8Array(wav, 44);

    expect(payload[0]).toBe(0xDE);
    expect(payload[1]).toBe(0xAD);
    expect(payload[2]).toBe(0xBE);
    expect(payload[3]).toBe(0xEF);
  });

  // --- Default parameters ---
  it('uses default parameters (24000Hz, mono, 16-bit) when not specified', () => {
    const data = pcm(100);
    const wav = buildWavBuffer(data);
    const view = new DataView(wav);

    expect(view.getUint16(22, true)).toBe(1);     // mono
    expect(view.getUint32(24, true)).toBe(24000);  // 24kHz
    expect(view.getUint16(34, true)).toBe(16);     // 16-bit
    expect(view.getUint32(28, true)).toBe(48000);  // byteRate
    expect(view.getUint16(32, true)).toBe(2);      // blockAlign
  });
});
