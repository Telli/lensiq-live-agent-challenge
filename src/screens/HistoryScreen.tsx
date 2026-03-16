import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Clock, MapPin, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSession } from '@/src/hooks/useSession';
import { useAppShell } from '@/src/hooks/useAppShell';
import { LoadingOverlay } from '@/src/components/ui/LoadingOverlay';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { ErrorState } from '@/src/components/ui/ErrorState';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';

export function HistoryScreen() {
  const { authSession } = useAppShell();
  const { sessions, isLoading, error, refresh } = useSession(authSession.authenticated);

  if (!authSession.authenticated) {
    return (
      <EmptyState
        icon={Clock}
        title="Sign in to keep history"
        description="LensIQ stores real exploration sessions under your account."
        action={
          <Button onClick={() => (window.location.href = '/api/auth/google/start?returnTo=/history')}>
            Continue with Google
          </Button>
        }
      />
    );
  }

  if (isLoading) return <LoadingOverlay message="Loading history..." />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;
  if (sessions.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="No history yet"
        description="Completed live sessions and saved explain flows will appear here."
      />
    );
  }

  return (
    <div className="flex h-screen flex-col bg-zinc-950 pb-24 text-zinc-50">
      <div className="shrink-0 border-b border-zinc-800 bg-zinc-900/50 px-6 pt-12 pb-6 backdrop-blur-xl">
        <h1 className="text-3xl font-bold tracking-tight">Exploration History</h1>
        <p className="mt-2 text-sm text-zinc-400">Open any session for transcript, places, sources, and generated media.</p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-6">
        {sessions.map((session, index) => {
          const firstPlace = session.placesExplored[0];
          const firstMessage = session.transcript.find((message) => !message.isPartial) || session.transcript[0];

          return (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link
                to={`/history/${session.id}`}
                className="block overflow-hidden rounded-[2rem] border border-zinc-800 bg-zinc-900/80 shadow-lg transition hover:border-zinc-700"
              >
                <div className="flex min-h-52 flex-col md:flex-row">
                  <div className="relative md:w-72 shrink-0 border-b border-zinc-800 md:border-b-0 md:border-r">
                    {session.thumbnailUrl ? (
                      <img
                        src={session.thumbnailUrl}
                        alt={session.title || 'Session thumbnail'}
                        className="h-52 w-full object-cover md:h-full"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex h-52 items-center justify-center bg-zinc-800 text-zinc-500 md:h-full">
                        <MapPin className="h-8 w-8" />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col justify-between gap-6 p-5">
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2">
                            {firstPlace ? <Badge variant="outline">{firstPlace.category}</Badge> : null}
                            <Badge variant="secondary">{session.transcript.length} messages</Badge>
                            <Badge variant="secondary">{session.placesExplored.length} places</Badge>
                          </div>
                          <h2 className="text-2xl font-bold text-white">{session.title || firstPlace?.name || 'Session summary'}</h2>
                          <p className="text-sm text-zinc-400">
                            {session.createdAt ? new Date(session.createdAt).toLocaleString() : 'Unknown time'}
                          </p>
                        </div>
                        <ArrowRight className="h-5 w-5 shrink-0 text-zinc-500" />
                      </div>

                      <p className="text-sm leading-6 text-zinc-300">
                        {firstPlace?.summary || firstPlace?.address || 'Open the session to review the stored transcript and sources.'}
                      </p>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-3xl border border-zinc-800 bg-black/20 p-4">
                        <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-zinc-500">
                          <MessageSquare className="h-3.5 w-3.5" />
                          Transcript
                        </div>
                        <p className="text-sm text-zinc-300">
                          {firstMessage ? `${firstMessage.role === 'user' ? 'You' : 'LensIQ'}: ${firstMessage.text}` : 'No transcript stored.'}
                        </p>
                      </div>

                      <div className="rounded-3xl border border-zinc-800 bg-black/20 p-4">
                        <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-zinc-500">
                          <MapPin className="h-3.5 w-3.5" />
                          Places
                        </div>
                        <p className="text-sm text-zinc-300">
                          {session.placesExplored.length
                            ? session.placesExplored.map((place) => place.name).join(', ')
                            : 'No matched places stored.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
