import { describe, expect, it } from 'vitest';
import {
  AUDIO_BACKPRESSURE_THRESHOLD_BYTES,
  CLIENT_AUDIO_OPCODE,
  SERVER_AUDIO_OPCODE,
  VIDEO_BACKPRESSURE_THRESHOLD_BYTES,
  buildBinaryAudioFrame,
  evaluateSocketBackpressure,
  parseBinaryAudioFrame,
} from '../liveAudioProtocol';

describe('liveAudioProtocol', () => {
  it('round-trips a binary client audio frame', () => {
    const pcm = new Int16Array([100, -100, 200]).buffer;
    const packet = buildBinaryAudioFrame(CLIENT_AUDIO_OPCODE, pcm);
    const parsed = parseBinaryAudioFrame(packet, CLIENT_AUDIO_OPCODE);

    expect(Array.from(new Int16Array(parsed))).toEqual([100, -100, 200]);
  });

  it('rejects unexpected opcodes', () => {
    const packet = buildBinaryAudioFrame(SERVER_AUDIO_OPCODE, new Int16Array([1]).buffer);

    expect(() => parseBinaryAudioFrame(packet, CLIENT_AUDIO_OPCODE)).toThrow(
      'Unexpected binary audio opcode',
    );
  });

  it('drops video before audio when websocket pressure rises', () => {
    expect(
      evaluateSocketBackpressure(VIDEO_BACKPRESSURE_THRESHOLD_BYTES + 1, false),
    ).toEqual({
      audioPaused: false,
      allowAudio: true,
      allowVideo: false,
      statusMessage: null,
    });
  });

  it('pauses audio when websocket pressure exceeds the hard threshold', () => {
    expect(
      evaluateSocketBackpressure(AUDIO_BACKPRESSURE_THRESHOLD_BYTES + 1, false),
    ).toEqual({
      audioPaused: true,
      allowAudio: false,
      allowVideo: false,
      statusMessage: 'Recovering audio link…',
    });
  });

  it('recovers audio once the buffer drains below the lower threshold', () => {
    expect(
      evaluateSocketBackpressure(VIDEO_BACKPRESSURE_THRESHOLD_BYTES, true),
    ).toEqual({
      audioPaused: false,
      allowAudio: true,
      allowVideo: true,
      statusMessage: null,
    });
  });
});
