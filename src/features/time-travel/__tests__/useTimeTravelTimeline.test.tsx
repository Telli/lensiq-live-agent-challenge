/**
 * @vitest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useTimeTravelTimeline } from '../useTimeTravelTimeline';
import type { TimeTravelViewModel } from '../../../services/orchestrator/orchestrator.types';

const timeTravel: TimeTravelViewModel = {
  status: 'ready',
  mode: 'scene-led',
  title: 'Time travel this view',
  subtitle: 'Scene-led reconstruction',
  sceneSummary: 'Historic corridor.',
  sceneInference: null,
  selectedEra: 'era-1950',
  timeline: [
    {
      id: 'era-2026',
      label: 'Today',
      year: 2026,
      summary: 'Today',
      asset: null,
      overlay: null,
      source: null,
      callouts: [],
      whatChanged: [],
      verifiedFacts: [],
      inferredClaims: [],
      reconstructedElements: [],
      citations: [],
      reconstructionMode: null,
    },
    {
      id: 'era-1950',
      label: '1950',
      year: 1950,
      summary: '1950',
      asset: null,
      overlay: null,
      source: null,
      callouts: [],
      whatChanged: [],
      verifiedFacts: [],
      inferredClaims: [],
      reconstructedElements: [],
      citations: [],
      reconstructionMode: null,
    },
  ],
  activeOverlay: null,
  sourceLabel: null,
  callouts: [],
  whatChanged: [],
  confidenceNote: null,
  grounding: null,
  citations: [],
  verifiedFacts: [],
  inferredClaims: [],
  reconstructedElements: [],
  reconstructionMode: null,
  historicalImage: null,
  assets: [],
  canNarrate: false,
  error: null,
};

describe('useTimeTravelTimeline', () => {
  it('dispatches the selected era when the scrubber value changes', () => {
    const onEraChange = vi.fn();
    const { result } = renderHook(() =>
      useTimeTravelTimeline({
        timeTravel,
        onEraChange,
      }),
    );

    act(() => {
      result.current.handleValueChange(0);
    });

    expect(onEraChange).toHaveBeenCalledWith('era-2026');
  });
});
