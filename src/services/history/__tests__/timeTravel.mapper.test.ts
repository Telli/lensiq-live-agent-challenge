import { describe, expect, it } from 'vitest';
import { buildTimeTravelCallouts, buildTimeTravelGrounding } from '../timeTravel.mapper';
import type { SceneInferenceResult } from '../../../types';

const sceneInference: SceneInferenceResult = {
  title: 'Current scene',
  district: 'Waterfront',
  summary: 'Historic waterfront corridor.',
  placeCandidates: [],
  sceneSubjects: ['waterfront corridor'],
  objectCandidates: [],
  environmentType: 'street',
  architecturalClues: [],
  streetscapeHints: [],
  materialClues: [],
  technologyEraHints: [],
  eraSuggestions: [2026, 1950, 1910],
  reconstructionHints: [],
  confidenceNote: 'Scene-led inference.',
  recoveredFrom: ['vision'],
};

describe('timeTravel.mapper', () => {
  it('does not create historical callouts without source-backed content', () => {
    const callouts = buildTimeTravelCallouts({});
    expect(callouts).toEqual([]);
  });

  it('keeps verified facts separate from reconstructed elements', () => {
    const grounding = buildTimeTravelGrounding({
      mode: 'scene-led',
      scene: sceneInference,
      citations: [],
      verifiedFacts: ['A streetcar line once ran through the district.'],
      inferredClaims: ['Shopfront colors likely changed over time.'],
      reconstructedElements: ['Period signage overlay'],
      source: {
        label: 'AI reconstruction based on historical context',
        isReconstruction: true,
      },
    });

    expect(grounding.verifiedFacts).toEqual([
      'A streetcar line once ran through the district.',
    ]);
    expect(grounding.reconstructedElements).toEqual(['Period signage overlay']);
    expect(grounding.disclaimer).toContain('AI reconstruction');
  });
});
