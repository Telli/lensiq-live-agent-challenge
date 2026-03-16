import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  ExternalLink,
  Flag,
  Images,
  MapPin,
  MessageSquare,
} from 'lucide-react';
import { useAppShell } from '@/src/hooks/useAppShell';
import { apiRequest } from '@/src/services/api/client';
import type { PlaceSummary, Session } from '@/src/types';
import { LoadingOverlay } from '@/src/components/ui/LoadingOverlay';
import { ErrorState } from '@/src/components/ui/ErrorState';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { ReportIssueSheet } from '@/src/components/explore/ReportIssueSheet';

function isVideoAsset(url: string) {
  return /^data:video\//.test(url) || /\.(mp4|mov|webm)(\?|$)/i.test(url);
}

export function SessionSummaryScreen() {
  const navigate = useNavigate();
  const { sessionId = '' } = useParams();
  const { authSession } = useAppShell();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportPlace, setReportPlace] = useState<PlaceSummary | null>(null);

  const loadSession = useCallback(async () => {
    if (!authSession.authenticated || !sessionId) {
      setSession(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await apiRequest<Session>(`/api/sessions/${sessionId}`);
      setSession(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load session');
    } finally {
      setIsLoading(false);
    }
  }, [authSession.authenticated, sessionId]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const transcriptPreview = useMemo(
    () => session?.transcript.filter((message) => !message.isPartial) || [],
    [session],
  );

  if (!authSession.authenticated) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="Sign in to view session summaries"
        description="LensIQ keeps detailed transcripts, places, and citations under your account."
        action={
          <Button onClick={() => (window.location.href = `/api/auth/google/start?returnTo=/history/${sessionId}`)}>
            Continue with Google
          </Button>
        }
      />
    );
  }

  if (isLoading) return <LoadingOverlay message="Loading session summary..." />;
  if (error) return <ErrorState message={error} onRetry={loadSession} />;
  if (!session) {
    return <ErrorState title="Session unavailable" message="LensIQ could not find this session." onRetry={loadSession} />;
  }

  return (
    <>
      <div className="h-screen overflow-y-auto bg-zinc-950 text-zinc-50 pb-8">
        <div className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/90 px-6 pt-10 pb-5 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <Button variant="ghost" onClick={() => navigate('/history')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setReportPlace(null);
                setIsReportOpen(true);
              }}
            >
              <Flag className="mr-2 h-4 w-4" />
              Report issue
            </Button>
          </div>
          <div className="mt-5 flex items-start justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-white">{session.title || 'Session summary'}</h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-400">
                <span className="inline-flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {session.createdAt ? new Date(session.createdAt).toLocaleString() : 'Unknown time'}
                </span>
                <Badge variant="secondary">{transcriptPreview.length} messages</Badge>
                <Badge variant="outline">{session.placesExplored.length} places</Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8 p-6">
          {session.thumbnailUrl ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="overflow-hidden rounded-[2rem] border border-zinc-800 bg-zinc-900 shadow-2xl"
            >
              <img
                src={session.thumbnailUrl}
                alt={session.title || 'Session thumbnail'}
                className="h-72 w-full object-cover"
                referrerPolicy="no-referrer"
              />
            </motion.div>
          ) : null}

          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.03 }}
            className="rounded-[2rem] border border-zinc-800 bg-zinc-900/80 p-5"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-white">Places explored</h2>
                <p className="text-sm text-zinc-400">Every place LensIQ attached to this session.</p>
              </div>
              <Badge variant="secondary">{session.placesExplored.length || 0}</Badge>
            </div>
            {session.placesExplored.length ? (
              <div className="space-y-4">
                {session.placesExplored.map((place) => (
                  <div key={`${session.id}-${place.id}`} className="rounded-3xl border border-zinc-800 bg-black/20 p-4">
                    <div className="flex gap-4">
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-800">
                        {place.imageUrl ? (
                          <img
                            src={place.imageUrl}
                            alt={place.name}
                            className="h-full w-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-white">{place.name}</h3>
                          <Badge variant="outline">{place.category}</Badge>
                          {place.durationText || place.distance ? (
                            <Badge variant="secondary">{place.durationText || place.distance}</Badge>
                          ) : null}
                        </div>
                        <p className="text-sm text-zinc-400">
                          {place.summary || place.shortSummary || place.address || 'No provider summary was captured.'}
                        </p>
                        {place.address ? (
                          <div className="flex items-center gap-2 text-xs text-zinc-500">
                            <MapPin className="h-3.5 w-3.5" />
                            <span>{place.address}</span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      {place.guide?.deepLinkUrl || place.mapsUrl ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => window.open(place.guide?.deepLinkUrl || place.mapsUrl, '_blank', 'noopener,noreferrer')}
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Open map
                        </Button>
                      ) : null}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setReportPlace(place);
                          setIsReportOpen(true);
                        }}
                      >
                        <Flag className="mr-2 h-4 w-4" />
                        Report place
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-400">This session was saved before LensIQ matched a place.</p>
            )}
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            className="rounded-[2rem] border border-zinc-800 bg-zinc-900/80 p-5"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-white">Transcript</h2>
                <p className="text-sm text-zinc-400">Captured user and LensIQ messages for this run.</p>
              </div>
              <Badge variant="secondary">{transcriptPreview.length}</Badge>
            </div>
            {transcriptPreview.length ? (
              <div className="space-y-3">
                {transcriptPreview.map((message) => (
                  <div
                    key={message.id}
                    className={`rounded-3xl border p-4 ${
                      message.role === 'user'
                        ? 'border-indigo-500/20 bg-indigo-500/10'
                        : 'border-zinc-800 bg-black/20'
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <Badge variant={message.role === 'user' ? 'default' : 'outline'}>
                        {message.role === 'user' ? 'You' : 'LensIQ'}
                      </Badge>
                      <span className="text-xs text-zinc-500">{new Date(message.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-sm leading-6 text-zinc-200">{message.text}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-400">No final transcript entries were stored for this session.</p>
            )}
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.09 }}
            className="rounded-[2rem] border border-zinc-800 bg-zinc-900/80 p-5"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-white">Sources</h2>
                <p className="text-sm text-zinc-400">Citations captured during explain and history flows.</p>
              </div>
              <Badge variant="secondary">{session.citations?.length || 0}</Badge>
            </div>
            {session.citations?.length ? (
              <div className="space-y-3">
                {session.citations.map((citation) => (
                  <a
                    key={citation.id}
                    href={citation.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-3xl border border-zinc-800 bg-black/20 p-4 transition hover:border-zinc-700"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-white">{citation.provider}</p>
                      <Badge variant="outline">{citation.kind}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-zinc-300">{citation.title}</p>
                    {citation.snippet ? <p className="mt-2 text-sm text-zinc-500">{citation.snippet}</p> : null}
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-400">No citations were stored with this session.</p>
            )}
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="rounded-[2rem] border border-zinc-800 bg-zinc-900/80 p-5"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-white">Generated media</h2>
                <p className="text-sm text-zinc-400">Images or videos attached to this session.</p>
              </div>
              <Badge variant="secondary">{session.generatedAssetUrls?.length || 0}</Badge>
            </div>
            {session.generatedAssetUrls?.length ? (
              <div className="grid grid-cols-1 gap-4">
                {session.generatedAssetUrls.map((assetUrl, index) => (
                  <div key={`${assetUrl}-${index}`} className="overflow-hidden rounded-3xl border border-zinc-800 bg-black/20">
                    {isVideoAsset(assetUrl) ? (
                      <video src={assetUrl} controls className="h-64 w-full bg-black object-cover" />
                    ) : (
                      <img
                        src={assetUrl}
                        alt={`Generated asset ${index + 1}`}
                        className="h-64 w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <div className="flex items-center justify-between gap-3 p-4">
                      <div className="flex items-center gap-2 text-sm text-zinc-300">
                        <Images className="h-4 w-4 text-indigo-400" />
                        <span>Generated asset {index + 1}</span>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => window.open(assetUrl, '_blank', 'noopener,noreferrer')}
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Open
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-400">No generated assets were stored with this session.</p>
            )}
          </motion.section>
        </div>
      </div>

      <ReportIssueSheet
        isOpen={isReportOpen}
        onClose={() => {
          setIsReportOpen(false);
          setReportPlace(null);
        }}
        place={reportPlace}
        sessionId={session.id}
        sessionTitle={session.title}
      />
    </>
  );
}
