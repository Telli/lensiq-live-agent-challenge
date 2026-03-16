import { initialOrchestratorState, orchestratorReducer } from './orchestrator.reducer';
import { runOrchestratorEffects, type OrchestratorContext } from './orchestrator.effects';
import type { OrchestratorEvent, OrchestratorState } from './orchestrator.types';

type Listener = () => void;

class LensIQOrchestrator {
  private state: OrchestratorState = initialOrchestratorState;
  private listeners = new Set<Listener>();
  private context: OrchestratorContext = {
    capabilities: null,
    live: {
      connect: async () => {},
      disconnect: () => {},
      sendTextCommand: () => {},
      interrupt: () => {},
      connectionState: 'idle',
    },
  };

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getState = () => this.state;

  setContext(context: OrchestratorContext) {
    this.context = context;
  }

  dispatch = (event: OrchestratorEvent) => {
    this.state = orchestratorReducer(this.state, event);
    this.listeners.forEach((listener) => listener());

    void runOrchestratorEffects({
      event,
      state: this.state,
      getState: this.getState,
      dispatch: this.dispatch,
      context: this.context,
    });
  };
}

export function createLensIQOrchestrator() {
  return new LensIQOrchestrator();
}
