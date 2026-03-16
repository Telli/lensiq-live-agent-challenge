import { describe, expect, it } from 'vitest';
import { buildTimeTravelTimeline } from '../timeTravelTimeline.service';
import type { PlaceDetails } from '../../../types';
import type { SceneInferenceResult } from '../../../types';

const sceneInference: SceneInferenceResult = {
  title: 'Pioneer Square streetscape',
  district: 'Pioneer Square',
  summary: 'Brick storefronts and historic blocks along the square.',
  placeCandidates: [],
  sceneSubjects: ['Historic square'],
  objectCandidates: [],
  environmentType: 'street',
  architecturalClues: ['Romanesque brick facades'],
  streetscapeHints: ['Narrow sidewalks', 'Historic storefronts'],
  materialClues: ['brick', 'stone'],
  technologyEraHints: [],
  eraSuggestions: [2026, 1960, 1910],
  reconstructionHints: ['Preserve the storefront geometry'],
  confidenceNote: 'Scene-led inference based on the streetscape.',
  recoveredFrom: ['vision', 'location'],
};

const workstationScene: SceneInferenceResult = {
  title: 'Creative workstation',
  district: undefined,
  summary: 'A dual-monitor desk setup with visible peripherals and office lighting.',
  placeCandidates: [],
  sceneSubjects: ['workstation'],
  objectCandidates: [
    {
      name: 'desktop monitor setup',
      reason: 'Multiple displays and desk peripherals dominate the scene.',
      confidence: 'high',
    },
  ],
  environmentType: 'workstation',
  architecturalClues: [],
  streetscapeHints: [],
  materialClues: ['brushed aluminum', 'matte plastic', 'laminate desk'],
  technologyEraHints: ['flat panel displays', 'bezel design', 'desk peripherals'],
  eraSuggestions: [2026, 2010, 2000, 1990],
  reconstructionHints: ['Preserve desk geometry and replace visible hardware with era-appropriate equipment.'],
  confidenceNote: 'Scene-led inference based on desk hardware and product design cues.',
  recoveredFrom: ['vision'],
};

const activePlace: PlaceDetails = {
  id: 'place-1',
  providerPlaceId: 'place-1',
  name: 'Pike Place Market',
  category: 'Public Market',
  coordinates: { lat: 47.6097, lng: -122.3425 },
  summary: 'One of Seattle’s oldest public markets.',
  description: 'Historic market district overlooking Elliott Bay.',
  facts: ['Opened in 1907.'],
  verifiedFacts: ['Opened in 1907.'],
  inferredClaims: [],
};

describe('buildTimeTravelTimeline', () => {
  it('builds a scene-led timeline without an active place', () => {
    const result = buildTimeTravelTimeline({
      mode: 'scene-led',
      scene: sceneInference,
      assets: [],
      citations: [],
    });

    expect(result.title).toBe('Pioneer Square streetscape');
    expect(result.timeline.length).toBeGreaterThan(1);
    expect(result.selectedEraId).not.toBe(result.timeline[0]?.id);
  });

  it('keeps place-led history anchored to the active place', () => {
    const result = buildTimeTravelTimeline({
      mode: 'place-led',
      place: activePlace,
      scene: sceneInference,
      assets: [],
      citations: [],
    });

    expect(result.title).toBe('Pike Place Market');
    expect(result.subtitle).toBe('Public Market');
    expect(result.sceneSummary).toContain('Seattle');
  });

  it('builds scene-led technology timelines for non-landmark views', () => {
    const result = buildTimeTravelTimeline({
      mode: 'scene-led',
      scene: workstationScene,
      assets: [],
      citations: [],
    });

    expect(result.title).toBe('Creative workstation');
    expect(result.subtitle).toBe('workstation');
    expect(result.timeline.some((era) => era.year <= 2005)).toBe(true);
    expect(result.timeline[1]?.summary.toLowerCase()).toContain('technology');
  });
});
