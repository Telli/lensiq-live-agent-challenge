import { useCallback, useEffect, useState } from 'react';
import type { TimeTravelViewModel } from '../../services/orchestrator/orchestrator.types';
import { findTimelineIndex } from './timeTravel.view-model';

interface UseTimeTravelTimelineParams {
  timeTravel: TimeTravelViewModel | null;
  onEraChange: (eraId: string) => void;
}

export function useTimeTravelTimeline({
  timeTravel,
  onEraChange,
}: UseTimeTravelTimelineParams) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    setValue(findTimelineIndex(timeTravel, timeTravel?.selectedEra || null));
  }, [timeTravel]);

  const handleValueChange = useCallback(
    (nextValue: number) => {
      setValue(nextValue);
      const nextEra = timeTravel?.timeline[Math.round(nextValue)];
      if (nextEra && nextEra.id !== timeTravel?.selectedEra) {
        onEraChange(nextEra.id);
      }
    },
    [onEraChange, timeTravel],
  );

  return {
    value,
    max: Math.max((timeTravel?.timeline.length || 1) - 1, 0),
    steps: timeTravel?.timeline || [],
    handleValueChange,
  };
}
