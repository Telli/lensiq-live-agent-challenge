import { useEffect, useState } from 'react';
import type { GroundingDto, Place } from '../../types';
import type { AnchoredLabel, DetectionFrame } from '../../types/ar';

export function useDetectionOverlay(
  activePlace: Place | null,
  grounding: GroundingDto | null,
  voiceState: string,
  secondaryFact?: string,
) {
  const [frame, setFrame] = useState<DetectionFrame>({
    visible: true,
    x: 15,
    y: 25,
    width: 70,
    height: 50,
    confidence: 'medium',
    state: 'idle',
  });
  const [anchor, setAnchor] = useState<AnchoredLabel | null>(null);

  useEffect(() => {
    if (voiceState === 'thinking' && !activePlace) {
      setFrame({
        visible: true,
        x: 20,
        y: 26,
        width: 60,
        height: 42,
        confidence: 'medium',
        state: 'analyzing',
      });
      setAnchor(null);
      return;
    }

    if (!activePlace) {
      setFrame((prev) => ({ ...prev, state: 'idle', confidence: 'medium' }));
      setAnchor(null);
      return;
    }

    const confidence = grounding?.overallConfidence || 'high';
    setFrame({
      visible: true,
      x: 12,
      y: 18,
      width: 76,
      height: 52,
      confidence,
      state: 'detected',
    });

    setAnchor({
      title: activePlace.name,
      subtitle: activePlace.category,
      confidence,
      distanceText: activePlace.distance || activePlace.durationText,
      secondaryFact,
      x: 50,
      y: 74,
    });
  }, [activePlace, grounding, secondaryFact, voiceState]);

  return { frame, anchor };
}
