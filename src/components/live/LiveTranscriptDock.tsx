import React from 'react';
import { MessageSquareMore, Mic, Sparkles, X } from 'lucide-react';
import { Button } from '../ui/Button';
import type { TranscriptMessage } from '../../types';

export function LiveTranscriptDock({
  voiceState,
  transcript,
  partialUserTranscript,
  partialAiTranscript,
  onOpenFollowUp,
  onClose,
}: {
  voiceState: string;
  transcript: TranscriptMessage[];
  partialUserTranscript?: string | null;
  partialAiTranscript?: string | null;
  onOpenFollowUp: () => void;
  onClose?: () => void;
}) {
  const items = transcript.slice(-3);
  const stateLabel =
    voiceState === 'thinking'
      ? 'LensIQ is thinking…'
      : voiceState === 'speaking'
        ? 'LensIQ is speaking…'
        : voiceState === 'interrupted'
          ? 'Interrupted — listening again'
          : voiceState === 'connecting'
            ? 'Connecting live voice…'
            : voiceState === 'listening'
              ? 'Listening…'
              : 'Ready';

  return (
    <div className="absolute inset-x-4 bottom-28 z-30 rounded-3xl border border-white/10 bg-black/74 p-4 backdrop-blur-xl shadow-2xl">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-black">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <p className="font-semibold">LensIQ Live</p>
            <p className="text-xs text-zinc-400">{stateLabel}</p>
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="rounded-full bg-white/10 px-3 text-white hover:bg-white/20"
          onClick={onOpenFollowUp}
        >
          <MessageSquareMore className="mr-2 h-4 w-4" />
          Chat
        </Button>
        {onClose ? (
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={onClose}
            aria-label="Hide transcript"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <div className="max-h-[24vh] space-y-2 overflow-y-auto pr-1">
        {items.map((message) => (
          <div
            key={message.id}
            className={`rounded-2xl px-3 py-2 text-sm ${
              message.role === 'user'
                ? 'ml-8 bg-white text-black'
                : 'mr-8 bg-zinc-900 text-zinc-100'
            }`}
          >
            <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-zinc-500">
              {message.role === 'user' ? 'You' : 'LensIQ'}
            </p>
            <p className="leading-relaxed">{message.text}</p>
          </div>
        ))}

        {partialUserTranscript ? (
          <div className="ml-8 rounded-2xl border border-white/10 bg-white/90 px-3 py-2 text-sm text-black">
            <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-zinc-500">
              <Mic className="h-3 w-3" />
              You
            </div>
            <p>{partialUserTranscript}</p>
          </div>
        ) : null}

        {partialAiTranscript ? (
          <div className="mr-8 rounded-2xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-100">
            <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-zinc-500">
              <Sparkles className="h-3 w-3" />
              LensIQ
            </div>
            <p>{partialAiTranscript}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
