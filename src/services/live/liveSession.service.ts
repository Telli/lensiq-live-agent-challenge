import { LiveSessionState, LiveSessionEvent, TranscriptMessage, AgentMode } from '../../types';

class LiveSessionService {
  private listeners: Set<(state: LiveSessionState) => void> = new Set();
  private eventListeners: Set<(event: LiveSessionEvent) => void> = new Set();
  
  private _currentState: LiveSessionState = 'idle';
  private _transcript: TranscriptMessage[] = [];
  
  get currentState() { return this._currentState; }
  get transcript() { return this._transcript; }

  setState(newState: LiveSessionState) {
    this._currentState = newState;
    this.listeners.forEach(l => l(newState));
  }

  addTranscriptMessage(msg: Omit<TranscriptMessage, 'id' | 'timestamp'>) {
    const newMsg: TranscriptMessage = {
      ...msg,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString()
    };
    this._transcript = [...this._transcript, newMsg];
  }

  emitEvent(eventConfig: Omit<LiveSessionEvent, 'id' | 'timestamp'>) {
    const event: LiveSessionEvent = {
        ...eventConfig,
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now()
    };
    this.eventListeners.forEach(l => l(event));
  }

  subscribeState(listener: (state: LiveSessionState) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  subscribeEvents(listener: (event: LiveSessionEvent) => void) {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }
}

export const liveSessionService = new LiveSessionService();
