export type AgentMode = 'explain' | 'time-travel' | 'nearby' | 'chat';

export type LiveSessionState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'interrupted' | 'error';

export interface LiveSessionEvent {
  id: string;
  type:
    | 'speech_start'
    | 'speech_end'
    | 'transcript_partial'
    | 'transcript_final'
    | 'agent_response_partial'
    | 'agent_response_final'
    | 'interrupted'
    | 'connected'
    | 'disconnected'
    | 'error';
  payload?: unknown;
  timestamp: number;
}

export interface TranscriptMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp: string;
  isPartial?: boolean;
}
