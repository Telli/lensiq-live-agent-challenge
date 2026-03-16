export type VadState =
  | 'warming'
  | 'quiet'
  | 'speech-candidate'
  | 'speaking'
  | 'echo-suppressed';

export interface VadChunkResult {
  shouldStart: boolean;
  shouldEnd: boolean;
  isActive: boolean;
  state: VadState;
  rms: number;
  threshold: number;
  noiseFloor: number;
}

export interface AdaptiveVadOptions {
  warmupMs?: number;
  speechStartMs?: number;
  speechEndMs?: number;
  absoluteFloor?: number;
  noiseMultiplier?: number;
  echoSuppressMs?: number;
  playbackOverrideStartMs?: number;
  playbackOverrideFloor?: number;
  playbackOverrideMultiplier?: number;
}

export function calculatePcmRms(pcmBuffer: ArrayBuffer): number {
  const samples = new Int16Array(pcmBuffer);
  if (samples.length === 0) {
    return 0;
  }

  let sumSquares = 0;
  for (let i = 0; i < samples.length; i += 1) {
    sumSquares += samples[i] * samples[i];
  }

  return Math.sqrt(sumSquares / samples.length);
}

export class AdaptiveVad {
  private readonly warmupMs: number;
  private readonly speechStartMs: number;
  private readonly speechEndMs: number;
  private readonly absoluteFloor: number;
  private readonly noiseMultiplier: number;
  private readonly echoSuppressMs: number;
  private readonly playbackOverrideStartMs: number;
  private readonly playbackOverrideFloor: number;
  private readonly playbackOverrideMultiplier: number;

  private accumulatedWarmupMs = 0;
  private noiseFloor: number;
  private speechCandidateMs = 0;
  private warmupSpeechMs = 0;
  private silenceMs = 0;
  private active = false;
  private echoSuppressUntilMs = 0;

  constructor(options: AdaptiveVadOptions = {}) {
    this.warmupMs = options.warmupMs ?? 500;
    this.speechStartMs = options.speechStartMs ?? 150;
    this.speechEndMs = options.speechEndMs ?? 600;
    this.absoluteFloor = options.absoluteFloor ?? 180;
    this.noiseMultiplier = options.noiseMultiplier ?? 2;
    this.echoSuppressMs = options.echoSuppressMs ?? 250;
    this.playbackOverrideStartMs = options.playbackOverrideStartMs ?? 120;
    this.playbackOverrideFloor = options.playbackOverrideFloor ?? 360;
    this.playbackOverrideMultiplier = options.playbackOverrideMultiplier ?? 1.35;
    this.noiseFloor = this.absoluteFloor / this.noiseMultiplier;
  }

  registerPlayback(nowMs: number): void {
    this.echoSuppressUntilMs = Math.max(
      this.echoSuppressUntilMs,
      nowMs + this.echoSuppressMs,
    );
  }

  processChunk(
    pcmBuffer: ArrayBuffer,
    chunkDurationMs: number,
    nowMs: number,
  ): VadChunkResult {
    const rms = calculatePcmRms(pcmBuffer);
    const isEchoSuppressed = !this.active && nowMs < this.echoSuppressUntilMs;
    if (!isEchoSuppressed) {
      this.updateNoiseFloor(rms);
    }
    const threshold = this.currentThreshold;
    const warming = this.accumulatedWarmupMs < this.warmupMs;
    if (warming) {
      this.accumulatedWarmupMs += chunkDurationMs;
    }

    if (isEchoSuppressed) {
      const playbackOverrideThreshold = Math.max(
        threshold * this.playbackOverrideMultiplier,
        this.playbackOverrideFloor,
      );

      if (rms >= playbackOverrideThreshold) {
        this.speechCandidateMs += chunkDurationMs;
        this.silenceMs = 0;

        if (this.speechCandidateMs >= this.playbackOverrideStartMs) {
          this.active = true;
          this.echoSuppressUntilMs = 0;
          return {
            shouldStart: true,
            shouldEnd: false,
            isActive: true,
            state: 'speaking',
            rms,
            threshold,
            noiseFloor: this.noiseFloor,
          };
        }

        return {
          shouldStart: false,
          shouldEnd: false,
          isActive: false,
          state: 'speech-candidate',
          rms,
          threshold,
          noiseFloor: this.noiseFloor,
        };
      }

      this.speechCandidateMs = 0;
      this.warmupSpeechMs = 0;
      this.silenceMs = 0;
      return {
        shouldStart: false,
        shouldEnd: false,
        isActive: false,
        state: 'echo-suppressed',
        rms,
        threshold,
        noiseFloor: this.noiseFloor,
      };
    }

    if (rms >= threshold) {
      this.speechCandidateMs += chunkDurationMs;
      this.warmupSpeechMs = warming
        ? this.warmupSpeechMs + chunkDurationMs
        : this.warmupSpeechMs;
      this.silenceMs = 0;

      const canStartDuringWarmup =
        !warming ||
        this.warmupSpeechMs >= Math.min(this.speechStartMs, this.warmupMs / 2);

      if (
        !this.active &&
        this.speechCandidateMs >= this.speechStartMs &&
        canStartDuringWarmup
      ) {
        this.active = true;
        return {
          shouldStart: true,
          shouldEnd: false,
          isActive: true,
          state: 'speaking',
          rms,
          threshold,
          noiseFloor: this.noiseFloor,
        };
      }

      return {
        shouldStart: false,
        shouldEnd: false,
        isActive: this.active,
        state: this.active
          ? 'speaking'
          : warming
            ? 'warming'
            : 'speech-candidate',
        rms,
        threshold,
        noiseFloor: this.noiseFloor,
      };
    }

    this.warmupSpeechMs = 0;

    if (!this.active) {
      this.speechCandidateMs = 0;
      return {
        shouldStart: false,
        shouldEnd: false,
        isActive: false,
        state: warming ? 'warming' : 'quiet',
        rms,
        threshold,
        noiseFloor: this.noiseFloor,
      };
    }

    this.silenceMs += chunkDurationMs;
    if (this.silenceMs >= this.speechEndMs) {
      this.active = false;
      this.speechCandidateMs = 0;
      this.silenceMs = 0;
      return {
        shouldStart: false,
        shouldEnd: true,
        isActive: false,
        state: 'quiet',
        rms,
        threshold,
        noiseFloor: this.noiseFloor,
      };
    }

    return {
      shouldStart: false,
      shouldEnd: false,
      isActive: true,
      state: 'speaking',
      rms,
      threshold,
      noiseFloor: this.noiseFloor,
    };
  }

  reset(): void {
    this.accumulatedWarmupMs = 0;
    this.noiseFloor = this.absoluteFloor / this.noiseMultiplier;
    this.speechCandidateMs = 0;
    this.warmupSpeechMs = 0;
    this.silenceMs = 0;
    this.active = false;
    this.echoSuppressUntilMs = 0;
  }

  private get currentThreshold(): number {
    return Math.max(this.noiseFloor * this.noiseMultiplier, this.absoluteFloor);
  }

  private updateNoiseFloor(rms: number): void {
    if (!this.active) {
      const alpha = rms <= this.currentThreshold ? 0.08 : 0.02;
      this.noiseFloor = this.noiseFloor * (1 - alpha) + rms * alpha;
    }
  }
}
