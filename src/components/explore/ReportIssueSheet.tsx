import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Flag } from 'lucide-react';
import { BottomSheet } from '../ui/BottomSheet';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { useAppShell } from '../../hooks/useAppShell';
import { usePlaceFeedback } from '../../hooks/usePlaceFeedback';
import type { Place, PlaceFeedbackIssueType, PlaceSummary } from '../../types';

interface ReportIssueSheetProps {
  isOpen: boolean;
  onClose: () => void;
  place?: PlaceSummary | Place | null;
  sessionId?: string;
  sessionTitle?: string;
  onSubmitted?: () => void;
}

const ISSUE_OPTIONS: Array<{ id: PlaceFeedbackIssueType; label: string; description: string }> = [
  {
    id: 'wrong_place',
    label: 'Wrong place',
    description: 'The landmark match is incorrect or too broad.',
  },
  {
    id: 'bad_fact',
    label: 'Bad fact',
    description: 'A summary or factual claim is wrong.',
  },
  {
    id: 'bad_history',
    label: 'Bad history',
    description: 'Historical context or imagery is misleading.',
  },
  {
    id: 'bad_route',
    label: 'Bad route',
    description: 'Distance, timing, or guide links are off.',
  },
  {
    id: 'other',
    label: 'Other',
    description: 'Anything else worth reviewing.',
  },
];

export function ReportIssueSheet({
  isOpen,
  onClose,
  place,
  sessionId,
  sessionTitle,
  onSubmitted,
}: ReportIssueSheetProps) {
  const { authSession } = useAppShell();
  const { submitFeedback, isSubmitting, error, reset } = usePlaceFeedback();
  const [issueType, setIssueType] = useState<PlaceFeedbackIssueType>('wrong_place');
  const [details, setDetails] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIssueType('wrong_place');
      setDetails('');
      setSubmitted(false);
      reset();
    }
  }, [isOpen, reset]);

  const targetLabel = useMemo(() => {
    if (place?.name) return place.name;
    if (sessionTitle) return sessionTitle;
    return 'this result';
  }, [place?.name, sessionTitle]);

  const handleSubmit = async () => {
    const trimmedDetails = details.trim();
    if (!trimmedDetails) return;

    await submitFeedback({
      issueType,
      details: trimmedDetails,
      placeId: place?.providerPlaceId || place?.id,
      sessionId,
      context: {
        placeName: place?.name,
        placeCategory: place?.category,
        sessionTitle,
        path: typeof window !== 'undefined' ? window.location.pathname : undefined,
      },
    });

    setSubmitted(true);
    onSubmitted?.();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} className="max-h-[82vh]">
      <div className="flex flex-col gap-5 overflow-y-auto">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-zinc-300">
            <Flag className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-semibold uppercase tracking-[0.2em]">Quality Review</span>
          </div>
          <h2 className="text-2xl font-bold text-white">Report an issue</h2>
          <p className="text-sm text-zinc-400">
            LensIQ will log this report against {targetLabel} for follow-up.
          </p>
        </div>

        {place?.category ? (
          <div className="flex items-center gap-2">
            <Badge variant="outline">{place.category}</Badge>
            {sessionTitle ? <Badge variant="secondary">{sessionTitle}</Badge> : null}
          </div>
        ) : null}

        {!authSession.authenticated ? (
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/80 p-5 text-center space-y-4">
            <AlertTriangle className="mx-auto h-10 w-10 text-amber-400" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-white">Sign in to submit reports</h3>
              <p className="text-sm text-zinc-400">
                Reports are attached to your account so LensIQ can review them with session context.
              </p>
            </div>
            <Button
              onClick={() =>
                (window.location.href = `/api/auth/google/start?returnTo=${encodeURIComponent(window.location.pathname)}`)
              }
            >
              Continue with Google
            </Button>
          </div>
        ) : submitted ? (
          <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-6 text-center space-y-4">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-white">Report submitted</h3>
              <p className="text-sm text-zinc-300">
                Thanks. The report is now stored with the related place and session context.
              </p>
            </div>
            <Button onClick={onClose}>Close</Button>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <p className="text-sm font-semibold text-zinc-300">What needs correction?</p>
              <div className="grid grid-cols-1 gap-3">
                {ISSUE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setIssueType(option.id)}
                    className={`rounded-2xl border p-4 text-left transition-colors ${
                      issueType === option.id
                        ? 'border-white/30 bg-white/10'
                        : 'border-zinc-800 bg-zinc-900/70 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-white">{option.label}</span>
                      {issueType === option.id ? <Badge variant="default">Selected</Badge> : null}
                    </div>
                    <p className="mt-2 text-sm text-zinc-400">{option.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label htmlFor="report-details" className="text-sm font-semibold text-zinc-300">
                What should LensIQ know?
              </label>
              <textarea
                id="report-details"
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                placeholder="Describe what is wrong, what you expected, or what the app should show instead."
                rows={5}
                className="w-full rounded-3xl border border-zinc-800 bg-zinc-900/80 px-4 py-3 text-sm text-white outline-none transition focus:border-white/30"
              />
              {error ? <p className="text-sm text-rose-300">{error}</p> : null}
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleSubmit} disabled={!details.trim() || isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit report'}
              </Button>
            </div>
          </>
        )}
      </div>
    </BottomSheet>
  );
}
