import { useCallback, useMemo, useState } from 'react';
import type { TimeTravelViewModel } from '../../services/orchestrator/orchestrator.types';
import { buildTimeTravelOverlayViewModel } from './timeTravel.view-model';

export function useTimeTravelOverlay(timeTravel: TimeTravelViewModel | null) {
  const [compareReveal, setCompareReveal] = useState(68);

  const handleCompareRevealChange = useCallback((value: number) => {
    setCompareReveal(Math.max(0, Math.min(100, value)));
  }, []);

  const viewModel = useMemo(
    () => buildTimeTravelOverlayViewModel(timeTravel, compareReveal),
    [compareReveal, timeTravel],
  );

  return {
    isActive: Boolean(viewModel.overlay?.imageUrl),
    compareReveal,
    handleCompareRevealChange,
    viewModel,
  };
}
