import React from 'react';
import { Mic, ChevronUp, MessageSquareMore } from 'lucide-react';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';

interface ExploreActionBarProps {
  isLiveActive: boolean;
  voiceAvailable?: boolean;
  voiceState?: string;
  onPrimaryVoiceAction: () => void;
  onOpenChat: () => void;
  transcriptAvailable?: boolean;
  transcriptVisible?: boolean;
  onToggleTranscript?: () => void;
  showExpandDetails?: boolean;
  onExpandDetails?: () => void;
  onSuggestionClick?: (action: 'explain' | 'time-travel' | 'guide' | 'nearby') => void;
}

export function ExploreActionBar({
  isLiveActive,
  voiceAvailable = true,
  voiceState,
  onPrimaryVoiceAction,
  onOpenChat,
  transcriptAvailable = false,
  transcriptVisible = false,
  onToggleTranscript,
  showExpandDetails,
  onExpandDetails,
  onSuggestionClick
}: ExploreActionBarProps) {
  const statusHeadline = !voiceAvailable
    ? 'Live voice unavailable'
    : voiceState === 'connecting'
      ? 'Connecting…'
      : voiceState === 'speaking'
        ? 'LensIQ is talking'
        : voiceState === 'thinking'
          ? 'LensIQ is gathering context'
          : isLiveActive
            ? 'Live conversation is on'
            : 'Start live conversation';
  const statusDetail = !voiceAvailable
    ? 'Voice mode is not available on this device right now.'
    : voiceState === 'speaking'
      ? 'Speak naturally to interrupt. No extra tap needed.'
      : voiceState === 'thinking'
        ? 'Keep talking while LensIQ listens and works in the background.'
        : isLiveActive
          ? 'Audio first. Chat stays secondary until you open it.'
          : 'Point the camera anywhere and start talking.';

  return (
    <div className="relative z-30 bg-gradient-to-t from-black via-black/85 to-transparent pb-20 pt-8">
      <div className="px-5 pb-5">
        <div className="mb-3 flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
          <Chip onClick={() => onSuggestionClick?.('explain')}>Explain</Chip>
          <Chip onClick={() => onSuggestionClick?.('time-travel')}>Time travel</Chip>
          <Chip onClick={() => onSuggestionClick?.('guide')}>Guide me</Chip>
          <Chip onClick={() => onSuggestionClick?.('nearby')}>Show nearby</Chip>
        </div>

        <div className="rounded-[28px] border border-zinc-800 bg-zinc-950/88 p-3 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <Button 
              size="icon" 
              className={`h-14 w-14 shrink-0 rounded-full transition-colors ${
              isLiveActive ? 'bg-red-500 hover:bg-red-600 text-white' : ''
            }`}
            onClick={onPrimaryVoiceAction}
            disabled={!voiceAvailable}
            aria-label={
              !voiceAvailable
                ? 'Live voice unavailable'
                : isLiveActive
                    ? 'End live conversation'
                    : 'Start live conversation'
            }
          >
            <Mic className="w-6 h-6" />
            </Button>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-tight text-white">
                {statusHeadline}
              </p>
              <p className="mt-1 text-xs leading-snug text-zinc-400">
                {statusDetail}
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-end gap-2">
            {transcriptAvailable ? (
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full px-3 text-xs"
                onClick={onToggleTranscript}
              >
                {transcriptVisible ? 'Hide transcript' : 'Review transcript'}
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={onOpenChat}
              aria-label="Open chat"
            >
              <MessageSquareMore className="w-5 h-5" />
            </Button>
            {showExpandDetails ? (
              <Button variant="ghost" size="icon" className="rounded-full" onClick={onExpandDetails}>
                <ChevronUp className="w-6 h-6 text-zinc-400" />
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
