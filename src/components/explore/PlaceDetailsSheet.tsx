import React from 'react';
import { Bookmark, Share, Play, Sparkles, Flag } from 'lucide-react';
import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Place } from '../../types';
import { GroundingBadgeRow } from '../grounding/GroundingBadgeRow';

interface PlaceDetailsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  place: Place;
  isSaved: boolean;
  onToggleSave: () => void;
  onShare: () => void;
  onOpenGrounding: () => void;
  onReportIssue: () => void;
}

export function PlaceDetailsSheet({
  isOpen,
  onClose,
  place,
  isSaved,
  onToggleSave,
  onShare,
  onOpenGrounding,
  onReportIssue,
}: PlaceDetailsSheetProps) {
  const facts = place.facts.length ? place.facts : place.verifiedFacts || [];
  const summary = place.audioSummary || place.summary || place.description;

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col h-[60vh]">
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Badge variant="success">
                {place.grounding ? `${Math.round(place.grounding.placeConfidenceScore * 100)}% Match` : 'Provider Match'}
              </Badge>
              <Badge variant="outline">{place.category}</Badge>
            </div>
            <h2 className="text-2xl font-bold text-white">{place.name}</h2>
            {place.address && <p className="text-sm text-zinc-400 mt-1">{place.address}</p>}
          </div>
          <div className="flex space-x-2">
            <Button 
              variant={isSaved ? "default" : "secondary"} 
              size="icon" 
              className={`w-10 h-10 rounded-full transition-colors ${isSaved ? 'text-black' : ''}`}
              onClick={onToggleSave}
            >
              <Bookmark className="w-4 h-4" fill={isSaved ? "currentColor" : "none"} />
            </Button>
            <Button variant="secondary" size="icon" className="w-10 h-10 rounded-full" onClick={onShare}>
              <Share className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {place.grounding && (
          <div className="mb-4">
            <GroundingBadgeRow grounding={place.grounding} onClick={onOpenGrounding} />
          </div>
        )}

        <div className="flex-1 overflow-y-auto pr-2 space-y-6 scrollbar-hide">
          {/* Audio Summary Card */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-start space-x-4">
            <Button size="icon" className="w-10 h-10 rounded-full shrink-0">
              <Play className="w-4 h-4 ml-0.5" />
            </Button>
            <p className="text-sm text-zinc-200 leading-relaxed">
              {summary || 'No provider summary available for this place.'}
            </p>
          </div>

          {/* Key Facts */}
          <div>
            <h4 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Key Facts</h4>
            <ul className="space-y-2">
              {facts.map((fact, i) => (
                <li key={i} className="flex items-start space-x-3 text-sm text-zinc-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/50 mt-1.5 shrink-0" />
                  <span>{fact}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Did you know */}
          <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800">
            <h4 className="flex items-center text-sm font-semibold text-amber-400 mb-2">
              <Sparkles className="w-4 h-4 mr-2" />
              Why this place?
            </h4>
            <p className="text-sm text-zinc-300 leading-relaxed">
              {place.didYouKnow || place.summary || 'LensIQ enriched this place using real provider and public knowledge sources.'}
            </p>
          </div>

          {place.citations?.length ? (
            <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800">
              <h4 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Sources</h4>
              <div className="space-y-3">
                {place.citations.slice(0, 3).map((citation) => (
                  <a
                    key={citation.id}
                    href={citation.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-sm text-zinc-300 hover:text-white transition-colors"
                  >
                    <p className="font-medium">{citation.provider}</p>
                    <p className="text-xs text-zinc-500 line-clamp-2">{citation.title}</p>
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          <Button variant="outline" className="w-full" onClick={onReportIssue}>
            <Flag className="mr-2 h-4 w-4" />
            Report issue
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
