import { ExploreMode } from '../../types';

export function useAROverlayState(currentMode: string) {
  // Returns boolean flags for which major overlay systems should be active
  
  return {
    showExplainOverlays: currentMode === 'explain',
    showTimeTravelOverlays: currentMode === 'time-travel',
    showNearbyOverlays: currentMode === 'nearby',
    showGroundingChips: currentMode === 'explain' || currentMode === 'time-travel'
  };
}
