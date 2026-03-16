export const CLIENT_AUDIO_OPCODE = 0x01;
export const SERVER_AUDIO_OPCODE = 0x11;

export const VIDEO_BACKPRESSURE_THRESHOLD_BYTES = 256 * 1024;
export const AUDIO_BACKPRESSURE_THRESHOLD_BYTES = 512 * 1024;

export interface SocketBackpressureState {
  audioPaused: boolean;
  allowAudio: boolean;
  allowVideo: boolean;
  statusMessage: string | null;
}

export function buildBinaryAudioFrame(
  opcode: number,
  payload: ArrayBuffer | Uint8Array,
): Uint8Array {
  const audioBytes = payload instanceof Uint8Array ? payload : new Uint8Array(payload);
  const packet = new Uint8Array(audioBytes.byteLength + 1);
  packet[0] = opcode;
  packet.set(audioBytes, 1);
  return packet;
}

export function parseBinaryAudioFrame(
  data: ArrayBuffer | ArrayBufferView,
  expectedOpcode: number,
): ArrayBuffer {
  const bytes =
    data instanceof ArrayBuffer
      ? new Uint8Array(data)
      : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);

  if (bytes.byteLength < 2) {
    throw new Error('Malformed binary audio frame');
  }

  if (bytes[0] !== expectedOpcode) {
    throw new Error(`Unexpected binary audio opcode: ${bytes[0]}`);
  }

  const payload = bytes.slice(1);
  if (payload.byteLength === 0 || payload.byteLength % Int16Array.BYTES_PER_ELEMENT !== 0) {
    throw new Error('Invalid PCM payload length');
  }

  return payload.buffer.slice(
    payload.byteOffset,
    payload.byteOffset + payload.byteLength,
  );
}

export function evaluateSocketBackpressure(
  bufferedAmount: number,
  audioPaused: boolean,
): SocketBackpressureState {
  if (audioPaused) {
    if (bufferedAmount <= VIDEO_BACKPRESSURE_THRESHOLD_BYTES) {
      return {
        audioPaused: false,
        allowAudio: true,
        allowVideo: true,
        statusMessage: null,
      };
    }

    return {
      audioPaused: true,
      allowAudio: false,
      allowVideo: false,
      statusMessage: 'Recovering audio link…',
    };
  }

  if (bufferedAmount > AUDIO_BACKPRESSURE_THRESHOLD_BYTES) {
    return {
      audioPaused: true,
      allowAudio: false,
      allowVideo: false,
      statusMessage: 'Recovering audio link…',
    };
  }

  if (bufferedAmount > VIDEO_BACKPRESSURE_THRESHOLD_BYTES) {
    return {
      audioPaused: false,
      allowAudio: true,
      allowVideo: false,
      statusMessage: null,
    };
  }

  return {
    audioPaused: false,
    allowAudio: true,
    allowVideo: true,
    statusMessage: null,
  };
}
