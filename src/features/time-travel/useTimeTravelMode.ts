import { useMemo } from 'react';
import type { TimeTravelViewModel } from '../../services/orchestrator/orchestrator.types';

export function useTimeTravelMode(timeTravel: TimeTravelViewModel | null) {
  return useMemo(() => {
    if (!timeTravel) {
      return {
        status: 'idle' as const,
        heading: 'Time travel this view',
        message:
          'Point the camera at a landmark, room, object, or setup. LensIQ will reconstruct how this scene looked in the past.',
        summary: null,
      };
    }

    if (timeTravel.status === 'loading') {
      return {
        status: 'loading' as const,
        heading: timeTravel.title || 'Reconstructing this view',
        message: 'LensIQ is reconstructing this view through time…',
        summary: timeTravel.sceneSummary,
      };
    }

    if (timeTravel.status === 'error') {
      return {
        status: 'error' as const,
        heading: timeTravel.title || 'Time travel unavailable',
        message:
          timeTravel.error ||
          'Point the camera at a landmark, room, object, or setup. LensIQ will reconstruct how this scene looked in the past.',
        summary: timeTravel.sceneSummary,
      };
    }

    return {
      status: timeTravel.status,
      heading: timeTravel.title,
      message:
        timeTravel.mode === 'place-led'
          ? 'Landmark-specific history is active.'
          : 'Scene-led historical reconstruction is active.',
      summary: timeTravel.sceneSummary,
    };
  }, [timeTravel]);
}
