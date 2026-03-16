import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import type { CapabilityState, ExploreMode } from '../../types';
import { useLiveExplore } from '../../hooks/useLiveExplore';
import { useSceneCapture } from '../live-session/useSceneCapture';
import { useARTracking } from '../../hooks/useARTracking';
import { useAutoExplain } from '../explain/useAutoExplain';
import { buildLiveTransportEvent, buildQuickActionEvent } from '../../services/orchestrator/eventBuilders';
import { createLensIQOrchestrator } from '../../services/orchestrator/lensiqOrchestrator';
import { selectAnchorSecondaryFact, selectGuideDestination } from '../../services/orchestrator/selectors';
import type { PlaceSummary } from '../../types';

export function useExploreDirector(capabilities: CapabilityState | null) {
  const orchestrator = useMemo(() => createLensIQOrchestrator(), []);
  const live = useLiveExplore();
  const { latestFrame } = useSceneCapture();
  const { trackingState, permissionGranted, requestPermission } = useARTracking(true);

  const state = useSyncExternalStore(
    orchestrator.subscribe.bind(orchestrator),
    orchestrator.getState,
    orchestrator.getState,
  );

  const lastTransportEventIdRef = useRef<string | null>(null);
  const bootstrappedRef = useRef(false);

  useEffect(() => {
    orchestrator.setContext({
      capabilities,
      live: {
        connect: live.connect,
        disconnect: live.disconnect,
        sendTextCommand: live.sendTextCommand,
        interrupt: live.interrupt,
        connectionState: live.connectionState,
      },
    });
  }, [
    capabilities,
    live.connect,
    live.connectionState,
    live.disconnect,
    live.interrupt,
    live.sendTextCommand,
    orchestrator,
  ]);

  useEffect(() => {
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;
    orchestrator.dispatch({ type: 'MODE_CHANGED', mode: 'explain' });
    return () => {
      live.disconnect();
    };
  }, [live.disconnect, orchestrator]);

  useEffect(() => {
    if (!latestFrame) return;
    orchestrator.dispatch({
      type: 'FRAME_UPDATED',
      frame: latestFrame,
      capturedAt: latestFrame.timestamp,
    });
  }, [latestFrame, orchestrator]);

  useEffect(() => {
    orchestrator.dispatch({
      type: 'TRACKING_UPDATED',
      tracking: trackingState,
    });
  }, [orchestrator, trackingState]);

  useEffect(() => {
    if (permissionGranted === null) {
      void requestPermission();
    }
  }, [permissionGranted, requestPermission]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        orchestrator.dispatch({
          type: 'LOCATION_UPDATED',
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {},
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 7000,
      },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [orchestrator]);

  useEffect(() => {
    const latestEvent = live.transcriptEvents[live.transcriptEvents.length - 1];
    if (!latestEvent || latestEvent.id === lastTransportEventIdRef.current) {
      return;
    }

    lastTransportEventIdRef.current = latestEvent.id;
    const orchestratorEvent = buildLiveTransportEvent(latestEvent);
    if (orchestratorEvent) {
      orchestrator.dispatch(orchestratorEvent);
    }
  }, [live.transcriptEvents, orchestrator]);

  useAutoExplain({
    mode: state.mode,
    latestFrame: state.latestFrame,
    tracking: state.tracking,
    autoExplain: state.autoExplain,
    activePlaceId: state.activePlace?.providerPlaceId || state.activePlace?.id,
    onTrigger: () => orchestrator.dispatch({ type: 'AUTO_EXPLAIN_TRIGGERED' }),
  });

  const setMode = useCallback(
    (mode: ExploreMode) => {
      orchestrator.dispatch({ type: 'MODE_CHANGED', mode });
    },
    [orchestrator],
  );

  const handleQuickAction = useCallback(
    (action: 'explain' | 'time-travel' | 'guide' | 'nearby') => {
      orchestrator.dispatch(buildQuickActionEvent(action));
    },
    [orchestrator],
  );

  const guidePlace = useCallback(
    (place: PlaceSummary) => {
      orchestrator.dispatch({ type: 'MODE_CHANGED', mode: 'nearby' });
      orchestrator.dispatch({ type: 'GUIDE_DESTINATION_SET', place });
    },
    [orchestrator],
  );

  const clearGuideDestination = useCallback(() => {
    orchestrator.dispatch({ type: 'GUIDE_DESTINATION_SET', place: null });
  }, [orchestrator]);

  const selectTimeTravelEra = useCallback(
    (eraId: string) => {
      orchestrator.dispatch({ type: 'TIME_TRAVEL_ERA_CHANGED', eraId });
    },
    [orchestrator],
  );

  return {
    state,
    mode: state.mode,
    activePlace: state.activePlace,
    grounding: state.grounding,
    transcript: state.transcript,
    partialUserTranscript: state.partialUserTranscript || live.partialUserTranscript,
    partialAiTranscript: state.partialAiTranscript || live.partialAiTranscript,
    voiceState: state.voiceState,
    nearby: state.nearby,
    timeTravel: state.timeTravel,
    guideDestination: state.guideDestination || selectGuideDestination(state),
    statusBanner: state.uiStatusBanner || live.statusMessage,
    error: state.error || live.error,
    liveDiagnostics: live.diagnostics,
    trackingState,
    anchorSecondaryFact: selectAnchorSecondaryFact(state),
    setMode,
    handleQuickAction,
    guidePlace,
    clearGuideDestination,
    selectTimeTravelEra,
    connectLive: live.connect,
    disconnectLive: live.disconnect,
    openFollowUp: live.connect,
    interrupt: live.interrupt,
  };
}
