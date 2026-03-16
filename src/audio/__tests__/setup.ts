/**
 * Test setup: stub AudioWorklet globals that don't exist in Node.
 */
const globalWithWorklet = globalThis as typeof globalThis & {
  AudioWorkletProcessor?: typeof AudioWorkletProcessor;
  registerProcessor?: typeof registerProcessor;
};

if (typeof globalWithWorklet.AudioWorkletProcessor === 'undefined') {
  (globalThis as any).AudioWorkletProcessor = class AudioWorkletProcessor {
    port: any = { postMessage: () => {} };
  };
}

if (typeof globalWithWorklet.registerProcessor === 'undefined') {
  (globalThis as any).registerProcessor = () => {};
}
