/**
 * WAV Header Builder
 *
 * Constructs a valid 44-byte RIFF/WAVE header and prepends it to raw PCM data
 * so that AudioContext.decodeAudioData works reliably on all browsers including Safari.
 */

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/**
 * Builds a complete WAV file buffer from raw PCM data.
 *
 * @param pcmData - Raw PCM audio data as an ArrayBuffer
 * @param sampleRate - Sample rate in Hz (default: 24000 for Gemini playback)
 * @param numChannels - Number of audio channels (default: 1 for mono)
 * @param bitsPerSample - Bits per sample (default: 16)
 * @returns A complete WAV file as an ArrayBuffer (44-byte header + PCM payload)
 */
export function buildWavBuffer(
  pcmData: ArrayBuffer,
  sampleRate: number = 24000,
  numChannels: number = 1,
  bitsPerSample: number = 16
): ArrayBuffer {
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmData.byteLength;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, totalSize - 8, true); // file size minus RIFF header (8 bytes)
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);           // sub-chunk size (16 for PCM)
  view.setUint16(20, 1, true);            // audio format (1 = PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Copy PCM payload after header
  new Uint8Array(buffer, headerSize).set(new Uint8Array(pcmData));

  return buffer;
}
