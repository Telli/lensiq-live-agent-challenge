import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runOrchestratorEffects } from '../orchestrator.effects';
import type { OrchestratorEvent, OrchestratorState } from '../orchestrator.types';
import { initialOrchestratorState } from '../orchestrator.reducer';
import { sceneReconstructionService } from '../../history/sceneReconstruction.service';

vi.mock('../../history/sceneInference.service', () => ({
  sceneInferenceService: {
    inferScene: vi.fn(async () => ({
      title: 'Waterfront block',
      district: 'Waterfront',
      summary: 'A historic waterfront block.',
      placeCandidates: [],
      sceneSubjects: ['waterfront block'],
      objectCandidates: [],
      environmentType: 'street',
      architecturalClues: ['Warehouses'],
      streetscapeHints: ['Harbor edge'],
      materialClues: ['brick', 'steel'],
      technologyEraHints: [],
      eraSuggestions: [2026, 1950, 1910],
      reconstructionHints: ['Preserve the pier alignment'],
      confidenceNote: 'Scene-led inference.',
      recoveredFrom: ['vision', 'location'],
    })),
  },
}));

vi.mock('../../history/timeTravel.service', () => ({
  timeTravelService: {
    getHistoricalAssets: vi.fn(async () => ({
      assets: [],
      citations: [],
      facts: [],
      summary: 'Historic waterfront block',
      canReconstruct: false,
      place: null,
    })),
    resolvePlace: vi.fn(async () => {
      throw new Error('No place');
    }),
    generateHistoricalImage: vi.fn(),
  },
}));

vi.mock('../../history/sceneReconstruction.service', () => ({
  sceneReconstructionService: {
    hydrateEra: vi.fn(async ({ era }) => ({
      ...era,
      overlay: {
        id: `${era.id}-overlay`,
        imageUrl: 'https://example.com/history.jpg',
        layers: [],
        style: 'archival',
      },
      source: {
        label: 'Library of Congress',
        isReconstruction: false,
      },
      whatChanged: ['Streetcar tracks once ran through this corridor.'],
      verifiedFacts: ['Streetcar tracks once ran through this corridor.'],
      inferredClaims: [],
      reconstructedElements: [],
      citations: [],
      reconstructionMode: 'archival',
    })),
  },
}));

describe('runOrchestratorEffects time travel', () => {
  let state: OrchestratorState;
  let dispatched: OrchestratorEvent[];

  beforeEach(() => {
    state = {
      ...initialOrchestratorState,
      latestFrame: {
        data: 'frame',
        mimeType: 'image/jpeg',
        timestamp: Date.now(),
      },
      lastKnownLocation: {
        latitude: 47.6,
        longitude: -122.3,
      },
      tracking: {
        mode: '3dof',
        pose: null,
        driftOffset: { x: 0, y: 0 },
        fps: 15,
        headingDegrees: 90,
        pitchDegrees: 0,
        rollDegrees: 0,
        stabilityScore: 0.9,
        isStable: true,
      },
    };
    dispatched = [];
  });

  it('routes scene-led time travel through inference, timeline, and overlay events', async () => {
    const dispatch = vi.fn((event: OrchestratorEvent) => {
      dispatched.push(event);
      if (event.type === 'TIME_TRAVEL_TIMELINE_READY' || event.type === 'TIME_TRAVEL_OVERLAY_READY') {
        state = {
          ...state,
          timeTravel: event.payload,
        };
      }
    });

    await runOrchestratorEffects({
      event: { type: 'TIME_TRAVEL_REQUESTED' },
      state,
      getState: () => state,
      dispatch,
      context: {
        capabilities: {
          database: false,
          gemini: true,
          places: true,
          routes: true,
          live: false,
          historical: true,
          media: false,
          auth: false,
          storage: false,
          limitations: [],
        },
        live: {
          connect: async () => {},
          disconnect: () => {},
          sendTextCommand: () => {},
          interrupt: () => {},
          connectionState: 'idle',
        },
      },
    });

    expect(dispatched.some((event) => event.type === 'TIME_TRAVEL_SCENE_INFERENCE_STARTED')).toBe(true);
    expect(dispatched.some((event) => event.type === 'TIME_TRAVEL_SCENE_INFERENCE_READY')).toBe(true);
    expect(dispatched.some((event) => event.type === 'TIME_TRAVEL_TIMELINE_READY')).toBe(true);
    expect(dispatched.some((event) => event.type === 'TIME_TRAVEL_OVERLAY_READY')).toBe(true);
  });

  it('mode change to time-travel dispatches a single request event instead of recursively requesting', async () => {
    const dispatch = vi.fn((event: OrchestratorEvent) => {
      dispatched.push(event);
    });

    await runOrchestratorEffects({
      event: { type: 'MODE_CHANGED', mode: 'time-travel' },
      state,
      getState: () => state,
      dispatch,
      context: {
        capabilities: {
          database: false,
          gemini: true,
          places: true,
          routes: true,
          live: false,
          historical: true,
          media: false,
          auth: false,
          storage: false,
          limitations: [],
        },
        live: {
          connect: async () => {},
          disconnect: () => {},
          sendTextCommand: () => {},
          interrupt: () => {},
          connectionState: 'idle',
        },
      },
    });

    expect(dispatched).toEqual([{ type: 'TIME_TRAVEL_REQUESTED' }]);
  });

  it('falls back to a ready summary state when overlay hydration fails', async () => {
    vi.mocked(sceneReconstructionService.hydrateEra).mockRejectedValueOnce(
      new Error('hydrate failed'),
    );

    const dispatch = vi.fn((event: OrchestratorEvent) => {
      dispatched.push(event);
      if (event.type === 'TIME_TRAVEL_TIMELINE_READY' || event.type === 'TIME_TRAVEL_OVERLAY_READY') {
        state = {
          ...state,
          timeTravel: event.payload,
        };
      }
    });

    await runOrchestratorEffects({
      event: { type: 'TIME_TRAVEL_REQUESTED' },
      state,
      getState: () => state,
      dispatch,
      context: {
        capabilities: {
          database: false,
          gemini: true,
          places: true,
          routes: true,
          live: false,
          historical: true,
          media: false,
          auth: false,
          storage: false,
          limitations: [],
        },
        live: {
          connect: async () => {},
          disconnect: () => {},
          sendTextCommand: () => {},
          interrupt: () => {},
          connectionState: 'idle',
        },
      },
    });

    const overlayReadyEvent = [...dispatched]
      .reverse()
      .find(
        (event): event is Extract<OrchestratorEvent, { type: 'TIME_TRAVEL_OVERLAY_READY' }> =>
          event.type === 'TIME_TRAVEL_OVERLAY_READY',
      );

    expect(overlayReadyEvent).toBeTruthy();
    expect(overlayReadyEvent?.payload.status).toBe('ready');
  });
});
