import type { LiveSessionEvent } from '../../types';
import type { OrchestratorEvent, QuickAction } from './orchestrator.types';

export function buildQuickActionEvent(action: QuickAction): OrchestratorEvent {
  return { type: 'QUICK_ACTION', action };
}

export function buildLiveTransportEvent(event: LiveSessionEvent): OrchestratorEvent | null {
  switch (event.type) {
    case 'connected':
      return { type: 'LIVE_CONNECTED' };
    case 'disconnected':
      return { type: 'LIVE_DISCONNECTED' };
    case 'transcript_partial':
      return { type: 'LIVE_PARTIAL_TRANSCRIPT', text: String(event.payload || '') };
    case 'transcript_final':
      return { type: 'LIVE_FINAL_TRANSCRIPT', text: String(event.payload || '') };
    case 'agent_response_partial':
      return { type: 'LIVE_AI_PARTIAL', text: String(event.payload || '') };
    case 'agent_response_final':
      return { type: 'LIVE_AI_FINAL', text: String(event.payload || '') };
    case 'interrupted':
      return { type: 'LIVE_INTERRUPTED' };
    case 'error':
      return { type: 'ERROR', message: String(event.payload || 'Live session failed') };
    default:
      return null;
  }
}
