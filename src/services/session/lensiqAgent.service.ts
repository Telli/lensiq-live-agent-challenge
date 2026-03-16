import { explainService } from '../ai/explain.service';
import { timeTravelService } from '../history/timeTravel.service';
import { nearbyService } from '../places/nearby.service';
import { liveSessionService } from '../live/liveSession.service';
import { frameStore } from './frameStore';
import { placeMatcher } from '../places/placeMatcher';
export const lensiqAgentService = {
  // Central dispatcher for intention routing
  async processUserIntent(intent: 'explain' | 'time-travel' | 'nearby' | 'chat', params?: any) {
    liveSessionService.setState('thinking');
    try {
      if (intent === 'explain') {
        const frame = frameStore.getLatestFrame();
        if (frame) {
          const res = await explainService.explainImage(frame.data);
          liveSessionService.emitEvent({ type: 'agent_response_final', payload: { mode: 'explain', response: res } });
          liveSessionService.addTranscriptMessage({ role: 'ai', text: typeof res === 'string' ? res : JSON.stringify(res) });
        }
      } 
      // Other intents...
    } catch (e) {
      liveSessionService.emitEvent({ type: 'error', payload: e });
      liveSessionService.setState('error');
    } finally {
      liveSessionService.setState('idle');
    }
  }
};
