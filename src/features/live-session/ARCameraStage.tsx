import React from 'react';
import { CameraView } from '../../components/CameraView';
import type { GroundingDto, Place, PlaceSummary, TrackingState } from '../../types';
import type {
  NearbyViewModel,
  TimeTravelViewModel,
} from '../../services/orchestrator/orchestrator.types';
import { useAROverlayState } from './useAROverlayState';
import { useDetectionOverlay } from '../explain/useDetectionOverlay';
import { useNearbyMarkers } from '../nearby/useNearbyMarkers';
import { useTimeTravelOverlay } from '../time-travel/useTimeTravelOverlay';
import { useTimeTravelTimeline } from '../time-travel/useTimeTravelTimeline';

import { SceneScanOverlay } from '../../components/camera/SceneScanOverlay';
import { LandmarkFocusFrame } from '../../components/camera/LandmarkFocusFrame';
import { SceneAnchorCard } from '../../components/camera/SceneAnchorCard';
import { NearbyDirectionOverlay } from '../../components/camera/NearbyDirectionOverlay';
import { TimeTravelCompareOverlay } from '../../components/camera/TimeTravelCompareOverlay';
import { GroundingOverlayChips } from '../../components/grounding/GroundingOverlayChips';

interface ARCameraStageProps {
  mode: string;
  voiceState: string;
  activePlace: Place | null;
  grounding: GroundingDto | null;
  nearby: NearbyViewModel | null;
  timeTravel: TimeTravelViewModel | null;
  guideDestination: PlaceSummary | null;
  location: { lat: number; lng: number } | null;
  trackingState: TrackingState;
  anchorSecondaryFact?: string;
  onPlaceSelect: (place: PlaceSummary | Place) => void;
  onOpenGrounding: () => void;
  onQuickAction: (action: 'explain' | 'time-travel' | 'guide' | 'nearby') => void;
  onTimeTravelEraChange: (eraId: string) => void;
}

export function ARCameraStage({
  mode,
  voiceState,
  activePlace,
  grounding,
  nearby,
  timeTravel,
  guideDestination,
  location,
  trackingState,
  anchorSecondaryFact,
  onPlaceSelect,
  onOpenGrounding,
  onQuickAction,
  onTimeTravelEraChange,
}: ARCameraStageProps) {
  const {
    showExplainOverlays,
    showNearbyOverlays,
    showTimeTravelOverlays,
    showGroundingChips,
  } = useAROverlayState(mode);

  const { frame, anchor } = useDetectionOverlay(
    activePlace,
    grounding,
    voiceState,
    anchorSecondaryFact,
  );
  const nearbyMarkers = useNearbyMarkers(
    nearby,
    trackingState,
    location,
    guideDestination,
  );
  const timeTravelState = useTimeTravelOverlay(timeTravel);
  const timeTravelTimeline = useTimeTravelTimeline({
    timeTravel,
    onEraChange: onTimeTravelEraChange,
  });
  const { driftOffset, mode: trackingMode, pose } = trackingState;

  return (
    <div className="absolute inset-0 z-0">
      <CameraView />

      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/80 to-transparent pointer-events-none z-10" />

      {showExplainOverlays && <SceneScanOverlay isThinking={voiceState === 'thinking'} />}
      {showExplainOverlays && <LandmarkFocusFrame frame={frame} driftOffset={driftOffset} />}

      {showExplainOverlays && (
        <SceneAnchorCard
          anchor={anchor}
          driftOffset={driftOffset}
          trackingMode={trackingMode}
          pose={pose}
          onExplain={() => onQuickAction('explain')}
          onTimeTravel={() => onQuickAction('time-travel')}
          onGuide={() => onQuickAction('guide')}
        />
      )}

      {showNearbyOverlays && nearby ? (
        <NearbyDirectionOverlay
          markers={nearbyMarkers}
          driftOffset={driftOffset}
          onMarkerClick={(id) => {
            const place = nearby.places.find((candidate) => candidate.id === id);
            if (place) onPlaceSelect(place);
          }}
        />
      ) : null}

      {showGroundingChips && grounding ? (
        <GroundingOverlayChips grounding={grounding} onOpenGrounding={onOpenGrounding} />
      ) : null}

      {showTimeTravelOverlays ? (
        <TimeTravelCompareOverlay
          overlay={timeTravelState.viewModel.overlay}
          eraLabel={timeTravelState.viewModel.activeEra?.label || null}
          source={timeTravelState.viewModel.sourceLabel}
          callouts={timeTravelState.viewModel.callouts}
          compareReveal={timeTravelState.compareReveal}
          onCompareRevealChange={timeTravelState.handleCompareRevealChange}
          mode={timeTravel?.mode || null}
          timelineSteps={timeTravelTimeline.steps.map((step) => ({
            id: step.id,
            label: step.label,
            year: step.year,
            hasVisual: Boolean(step.overlay?.imageUrl || step.asset?.imageUrl),
            statusLabel:
              timeTravel?.status === 'loading' && timeTravel?.selectedEra === step.id
                ? 'preparing'
                : step.overlay?.imageUrl || step.asset?.imageUrl
                  ? 'visual ready'
                  : 'summary ready',
          }))}
          timelineValue={timeTravelTimeline.value}
          timelineMax={timeTravelTimeline.max}
          onTimelineChange={timeTravelTimeline.handleValueChange}
          trackingMode={trackingMode}
          pose={pose}
        />
      ) : null}
    </div>
  );
}
