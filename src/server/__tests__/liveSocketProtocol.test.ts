import { describe, expect, it } from 'vitest';
import {
  buildServerAudioFrame,
  completeAiTurn,
  createLiveTurnState,
  parseClientAudioFrame,
  resetBargeInGate,
  shouldSendBargeIn,
} from '../liveSocketProtocol';
import { buildBinaryAudioFrame, CLIENT_AUDIO_OPCODE, SERVER_AUDIO_OPCODE } from '../../services/live/liveAudioProtocol';

describe('liveSocketProtocol', () => {
  it('accepts a single barge-in per active ai turn', () => {
    const state = createLiveTurnState();
    state.aiTurnActive = true;

    expect(shouldSendBargeIn(state)).toBe(true);
    expect(shouldSendBargeIn(state)).toBe(false);

    resetBargeInGate(state);
    expect(shouldSendBargeIn(state)).toBe(true);
  });

  it('ends the ai turn and clears barge-in gating on completion', () => {
    const state = createLiveTurnState();
    state.aiTurnActive = true;
    state.bargeInSentForTurn = true;

    completeAiTurn(state);

    expect(state.aiTurnActive).toBe(false);
    expect(state.bargeInSentForTurn).toBe(false);
  });

  it('parses client audio frames and builds server audio frames', () => {
    const clientPacket = buildBinaryAudioFrame(
      CLIENT_AUDIO_OPCODE,
      new Int16Array([10, -10]).buffer,
    );
    const serverPacket = buildServerAudioFrame(
      Buffer.from(new Int16Array([20, -20]).buffer).toString('base64'),
    );

    expect(Array.from(new Int16Array(parseClientAudioFrame(clientPacket)))).toEqual([
      10,
      -10,
    ]);
    expect(serverPacket[0]).toBe(SERVER_AUDIO_OPCODE);
  });
});
