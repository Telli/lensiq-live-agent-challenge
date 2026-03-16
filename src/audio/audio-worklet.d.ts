/**
 * Type declarations for the AudioWorklet global scope.
 *
 * These APIs are available inside AudioWorklet processors but are not
 * part of the standard DOM lib typings shipped with TypeScript.
 */

declare class AudioWorkletProcessor {
  readonly port: MessagePort;
  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ): boolean;
}

declare function registerProcessor(
  name: string,
  processorCtor: new () => AudioWorkletProcessor
): void;
