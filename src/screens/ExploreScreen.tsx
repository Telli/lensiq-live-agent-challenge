import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera as CameraIcon, Sparkles, X } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import { TabSwitcher } from '@/src/components/layout/TabSwitcher';
import { ARCameraStage } from '@/src/features/live-session/ARCameraStage';
import { ExploreActionBar } from '@/src/components/explore/ExploreActionBar';
import { useSavedPlaces } from '@/src/hooks/useSavedPlaces';
import { useSession } from '@/src/hooks/useSession';
import { useAppShell } from '@/src/hooks/useAppShell';
import { useExploreDirector } from '@/src/features/explore/useExploreDirector';
import { LiveTranscriptDock } from '@/src/components/live/LiveTranscriptDock';
import { TimeTravelStateCard } from '@/src/components/time-travel/TimeTravelStateCard';
import { TimeTravelEmptyState } from '@/src/components/time-travel/TimeTravelEmptyState';
import { useTimeTravelMode } from '@/src/features/time-travel/useTimeTravelMode';

const ChatSheet = lazy(() => import('@/src/components/ui/ChatSheet').then((module) => ({ default: module.ChatSheet })));
const GroundingSheet = lazy(() =>
  import('@/src/components/grounding/GroundingSheet').then((module) => ({ default: module.GroundingSheet })),
);
const PlaceDetailsSheet = lazy(() =>
  import('@/src/components/explore/PlaceDetailsSheet').then((module) => ({ default: module.PlaceDetailsSheet })),
);
const ReportIssueSheet = lazy(() =>
  import('@/src/components/explore/ReportIssueSheet').then((module) => ({ default: module.ReportIssueSheet })),
);

function SheetFallback() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-zinc-800 bg-zinc-950/95 p-6 text-center text-sm text-zinc-400 backdrop-blur-xl">
      Loading…
    </div>
  );
}

export function ExploreScreen() {
  const { capabilities, authSession } = useAppShell();
  const director = useExploreDirector(capabilities);
  const [showResponse, setShowResponse] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showTranscriptReview, setShowTranscriptReview] = useState(false);
  const [showTimeTravelPanel, setShowTimeTravelPanel] = useState(false);
  const [showGrounding, setShowGrounding] = useState(false);
  const [showReportIssue, setShowReportIssue] = useState(false);
  const [chatQuery, setChatQuery] = useState('');

  const { savedPlaces, savePlace, unsavePlace } = useSavedPlaces(authSession.authenticated);
  const { endSession } = useSession(authSession.authenticated);
  const timeTravelMode = useTimeTravelMode(director.timeTravel);

  const currentFrame = director.state.latestFrame
    ? `data:${director.state.latestFrame.mimeType};base64,${director.state.latestFrame.data}`
    : null;

  const tabs = useMemo(
    () => [
      { id: 'explain', label: 'Explain' },
      { id: 'time-travel', label: 'Time Travel' },
      { id: 'nearby', label: 'Nearby' },
    ],
    [],
  );

  const isPlaceSaved = director.activePlace
    ? savedPlaces.some(
        (place) =>
          place.providerPlaceId === director.activePlace?.providerPlaceId ||
          place.id === director.activePlace?.id,
      )
    : false;
  const isLiveActive =
    director.voiceState !== 'idle' && director.voiceState !== 'error';
  const transcriptAvailable =
    director.transcript.length > 0 ||
    Boolean(director.partialUserTranscript) ||
    Boolean(director.partialAiTranscript);
  const showTranscriptDock = !showChat && showTranscriptReview && transcriptAvailable;
  const panelBottomClass = showTranscriptDock ? 'bottom-48' : 'bottom-28';

  useEffect(() => {
    if (director.activePlace && director.mode === 'explain') {
      setShowResponse(false);
    }
  }, [director.activePlace, director.mode]);

  useEffect(() => {
    if (!transcriptAvailable && showTranscriptReview) {
      setShowTranscriptReview(false);
    }
  }, [showTranscriptReview, transcriptAvailable]);

  useEffect(() => {
    if (director.mode !== 'time-travel' && showTimeTravelPanel) {
      setShowTimeTravelPanel(false);
    }
  }, [director.mode, showTimeTravelPanel]);

  const handlePrimaryVoiceAction = async () => {
    if (director.voiceState === 'connecting') {
      director.disconnectLive();
      return;
    }

    if (!isLiveActive) {
      await director.connectLive();
      return;
    }

    director.disconnectLive();
    if (!authSession.authenticated || director.transcript.length === 0) {
      return;
    }

    await endSession({
      title: director.activePlace?.name,
      thumbnailUrl: director.activePlace?.imageUrl || currentFrame || undefined,
      transcript: director.transcript,
      placesExplored: director.activePlace ? [director.activePlace] : [],
      citations: director.activePlace?.citations || [],
    });
  };

  const handleToggleSave = async () => {
    if (!director.activePlace || !authSession.authenticated) return;

    if (isPlaceSaved) {
      const saved = savedPlaces.find(
        (place) =>
          place.providerPlaceId === director.activePlace?.providerPlaceId ||
          place.id === director.activePlace?.id,
      );
      if (saved) {
        await unsavePlace(saved.id);
      }
      return;
    }

    await savePlace(director.activePlace, 'Saved from LensIQ Explore');
  };

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-black">
      <ARCameraStage
        mode={director.mode}
        voiceState={director.voiceState}
        activePlace={director.activePlace}
        grounding={director.grounding}
        nearby={director.nearby}
        timeTravel={director.timeTravel}
        guideDestination={director.guideDestination}
        location={
          director.state.lastKnownLocation
            ? {
                lat: director.state.lastKnownLocation.latitude,
                lng: director.state.lastKnownLocation.longitude,
              }
            : null
        }
        trackingState={director.trackingState}
        anchorSecondaryFact={director.anchorSecondaryFact}
        onPlaceSelect={(place) => {
          if (director.mode === 'explain' && place.id === director.activePlace?.id) {
            setShowResponse(true);
          } else {
            director.guidePlace(place as any);
          }
        }}
        onOpenGrounding={() => setShowGrounding(true)}
        onQuickAction={director.handleQuickAction}
        onTimeTravelEraChange={director.selectTimeTravelEra}
      />

      <div className="relative z-10 flex items-center justify-between p-6 pt-12">
        <div className="flex items-center space-x-2 rounded-full border border-white/10 bg-black/40 px-4 py-2 backdrop-blur-md">
          <Sparkles className="h-4 w-4 text-indigo-400" />
          <span className="text-sm font-medium text-white">LensIQ</span>
        </div>
        <Button variant="glass" size="icon" className="h-10 w-10 rounded-full">
          <CameraIcon className="h-5 w-5" />
        </Button>
      </div>

      <div className="relative z-10 mt-4 flex justify-center px-6">
        <TabSwitcher
          tabs={tabs}
          activeTab={director.mode}
          onChange={(mode) => director.setMode(mode as any)}
          className="w-full max-w-xs bg-black/40 border-white/10"
        />
      </div>

      {director.statusBanner ? (
        <div className="relative z-10 mt-4 px-6">
          <div className="mx-auto max-w-md rounded-full border border-white/10 bg-black/55 px-4 py-2 text-center text-sm text-zinc-200 backdrop-blur-md">
            {director.statusBanner}
          </div>
        </div>
      ) : null}

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center p-6">
        <AnimatePresence>
          {!showChat && director.mode === 'time-travel' && showTimeTravelPanel && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`absolute ${panelBottomClass} left-0 right-0 z-20 px-6`}
            >
              <div className="rounded-2xl border border-white/10 bg-black/60 p-6 backdrop-blur-xl">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Hero View</p>
                    <h3 className="text-lg font-semibold text-white">Time Travel</h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                    onClick={() => director.setMode('explain')}
                    aria-label="Close time travel"
                  >
                    <X className="h-5 w-5 text-zinc-300" />
                  </Button>
                </div>
                {director.timeTravel?.status === 'loading' ? (
                  <div className="flex h-32 flex-col items-center justify-center">
                    <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent" />
                    <p className="font-medium text-zinc-300">Preparing the timeline…</p>
                    {director.timeTravel?.sceneSummary ? (
                      <p className="mt-2 max-w-sm text-center text-sm text-zinc-500">
                        {director.timeTravel.sceneSummary}
                      </p>
                    ) : null}
                  </div>
                ) : director.timeTravel?.status === 'ready' ? (
                  <TimeTravelStateCard timeTravel={director.timeTravel} />
                ) : (
                  <TimeTravelEmptyState message={timeTravelMode.message} />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {!showChat && director.mode === 'nearby' && director.nearby && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className={`absolute ${panelBottomClass} left-0 right-0 px-6`}
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Spatial Guide</p>
                  <h3 className="text-lg font-semibold text-white">Nearby Places</h3>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full bg-black/30"
                  onClick={() => {
                    director.clearGuideDestination();
                    director.setMode('explain');
                  }}
                  aria-label="Close nearby panel"
                >
                  <X className="h-5 w-5 text-zinc-300" />
                </Button>
              </div>
              <div className="scrollbar-hide flex snap-x space-x-4 overflow-x-auto pb-4">
                {director.nearby.places.map((place) => {
                  const isGuided = director.guideDestination?.id === place.id;
                  return (
                    <div
                      key={place.id}
                      className={`snap-center shrink-0 w-80 rounded-3xl border p-4 shadow-2xl flex flex-col gap-4 ${
                        isGuided
                          ? 'border-indigo-400/40 bg-indigo-500/10'
                          : 'border-zinc-800 bg-zinc-900/90'
                      } backdrop-blur-xl`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-800">
                          {place.imageUrl ? (
                            <img
                              src={place.imageUrl}
                              alt={place.name}
                              className="h-full w-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex items-center justify-between">
                            <Badge variant="outline" className="max-w-[100px] truncate text-[10px]">
                              {place.category}
                            </Badge>
                            <Badge variant="secondary" className="shrink-0 bg-black/60 text-[10px]">
                              {place.guide?.durationText || place.durationText || place.distance || 'Nearby'}
                            </Badge>
                          </div>
                          <h4 className="truncate text-base font-bold text-white">{place.name}</h4>
                          {place.address ? (
                            <p className="truncate text-[11px] text-zinc-500">{place.address}</p>
                          ) : null}
                        </div>
                      </div>
                      <p className="line-clamp-2 text-xs text-zinc-400">
                        {place.summary || 'No provider summary available.'}
                      </p>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => director.guidePlace(place)}
                        >
                          {isGuided ? 'Talking…' : 'Talk'}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="flex-1"
                          onClick={() => {
                            setChatQuery(`Tell me more about ${place.name}`);
                            setShowChat(true);
                          }}
                        >
                          Chat
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {director.nearby.error ? (
                <p className="mt-3 text-center text-xs text-amber-300">{director.nearby.error}</p>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {showTranscriptDock ? (
        <LiveTranscriptDock
          voiceState={director.voiceState}
          transcript={director.transcript}
          partialUserTranscript={director.partialUserTranscript}
          partialAiTranscript={director.partialAiTranscript}
          onOpenFollowUp={() => setShowChat(true)}
          onClose={() => setShowTranscriptReview(false)}
        />
      ) : null}

      {import.meta.env.DEV ? (
        <div className="pointer-events-none absolute left-4 top-28 z-30 rounded-2xl border border-white/10 bg-black/70 px-3 py-2 text-[10px] text-zinc-300 backdrop-blur-xl">
          <p>In: {director.liveDiagnostics.inputSampleRate ?? 'n/a'} Hz</p>
          <p>Out: {director.liveDiagnostics.outputSampleRate} Hz</p>
          <p>WS: {Math.round(director.liveDiagnostics.bufferedAmount / 1024)} KB</p>
          <p>VAD: {director.liveDiagnostics.vadState}</p>
          <p>Queue: {director.liveDiagnostics.playbackQueueDepth}</p>
          <p>Overflow: {director.liveDiagnostics.overflow ? 'yes' : 'no'}</p>
        </div>
      ) : null}

      {!showChat ? (
        <ExploreActionBar
          isLiveActive={isLiveActive}
          voiceAvailable={Boolean(capabilities?.live)}
          voiceState={director.voiceState}
          onPrimaryVoiceAction={handlePrimaryVoiceAction}
          onOpenChat={() => setShowChat(true)}
          transcriptAvailable={transcriptAvailable}
          transcriptVisible={showTranscriptReview}
          onToggleTranscript={() =>
            setShowTranscriptReview((current) => !current)
          }
          showExpandDetails={Boolean(
            (director.activePlace && director.mode === 'explain' && !showResponse) ||
              (director.mode === 'time-travel' && director.timeTravel),
          )}
          expandDetailsLabel={
            director.mode === 'time-travel'
              ? showTimeTravelPanel
                ? 'Hide time travel'
                : 'View time travel'
              : 'Place details'
          }
          onExpandDetails={() => {
            if (director.mode === 'time-travel') {
              setShowTimeTravelPanel((current) => !current);
              return;
            }
            setShowResponse(true);
          }}
          onSuggestionClick={director.handleQuickAction}
        />
      ) : null}

      {showChat ? (
        <Suspense fallback={<SheetFallback />}>
          <ChatSheet
            isOpen={showChat}
            onClose={() => {
              setShowChat(false);
              setChatQuery('');
            }}
            contextImage={currentFrame || undefined}
            initialQuery={chatQuery}
          />
        </Suspense>
      ) : null}

      {director.activePlace && showResponse ? (
        <Suspense fallback={<SheetFallback />}>
          <PlaceDetailsSheet
            isOpen={showResponse}
            onClose={() => setShowResponse(false)}
            place={director.activePlace}
            isSaved={isPlaceSaved}
            onToggleSave={handleToggleSave}
            onShare={async () => {
              if (navigator.share) {
                await navigator.share({
                  title: `Discover ${director.activePlace?.name} with LensIQ`,
                  text:
                    director.activePlace?.summary ||
                    director.activePlace?.audioSummary ||
                    director.activePlace?.name,
                  url: window.location.href,
                });
              }
            }}
            onOpenGrounding={() => setShowGrounding(true)}
            onReportIssue={() => setShowReportIssue(true)}
          />
        </Suspense>
      ) : null}

      {showReportIssue ? (
        <Suspense fallback={<SheetFallback />}>
          <ReportIssueSheet
            isOpen={showReportIssue}
            onClose={() => setShowReportIssue(false)}
            place={director.activePlace}
            sessionTitle={director.activePlace?.name}
          />
        </Suspense>
      ) : null}

      {showGrounding ? (
        <Suspense fallback={<SheetFallback />}>
          <GroundingSheet
            isOpen={showGrounding}
            onClose={() => setShowGrounding(false)}
            grounding={director.grounding || null}
          />
        </Suspense>
      ) : null}
    </div>
  );
}
