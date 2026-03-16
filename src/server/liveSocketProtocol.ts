import {
  CLIENT_AUDIO_OPCODE,
  SERVER_AUDIO_OPCODE,
  buildBinaryAudioFrame,
  parseBinaryAudioFrame,
} from '../services/live/liveAudioProtocol';

export interface LiveTurnState {
  aiTurnActive: boolean;
  bargeInSentForTurn: boolean;
}

export function createLiveTurnState(): LiveTurnState {
  return {
    aiTurnActive: false,
    bargeInSentForTurn: false,
  };
}

export function markAiTurnStarted(state: LiveTurnState): void {
  state.aiTurnActive = true;
}

export function resetBargeInGate(state: LiveTurnState): void {
  state.bargeInSentForTurn = false;
}

export function completeAiTurn(state: LiveTurnState): void {
  state.aiTurnActive = false;
  state.bargeInSentForTurn = false;
}

export function shouldSendBargeIn(state: LiveTurnState): boolean {
  if (!state.aiTurnActive || state.bargeInSentForTurn) {
    return false;
  }

  state.bargeInSentForTurn = true;
  return true;
}

export function parseClientAudioFrame(data: ArrayBuffer | ArrayBufferView): ArrayBuffer {
  return parseBinaryAudioFrame(data, CLIENT_AUDIO_OPCODE);
}

export function buildServerAudioFrame(base64Data: string): Uint8Array {
  const pcm = Uint8Array.from(Buffer.from(base64Data, 'base64'));
  return buildBinaryAudioFrame(SERVER_AUDIO_OPCODE, pcm);
}
