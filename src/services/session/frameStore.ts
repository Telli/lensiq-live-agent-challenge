export interface CapturedFrame {
  mimeType: string;
  data: string; // Base64 data
  timestamp: number;
}

class FrameStore {
  private _latestFrame: CapturedFrame | null = null;
  private _listeners: Set<() => void> = new Set();

  setLatestFrame(frame: CapturedFrame) {
    this._latestFrame = frame;
    this._notify();
  }

  getLatestFrame(): CapturedFrame | null {
    return this._latestFrame;
  }

  clearLatestFrame() {
    this._latestFrame = null;
    this._notify();
  }

  subscribe(listener: () => void) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  private _notify() {
    this._listeners.forEach(l => l());
  }
}

export const frameStore = new FrameStore();
