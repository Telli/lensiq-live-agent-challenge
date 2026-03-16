import express from 'express';
import { createServer } from 'http';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { WebSocketServer } from 'ws';
import type { WebSocket } from 'ws';
import { attachSession, getAuthSession, handleGoogleCallback, logout, requireAuth, startGoogleAuth } from './auth.js';
import { getPool, initDatabase } from './db.js';
import { env } from './env.js';
import {
  analyzeVideo,
  chatWithLensIQ,
  createLiveSession,
  explainScene,
  fetchHistoricalAssets,
  fetchNearbyPlaces,
  fetchPlaceDetails,
  generateImageFromPrompt,
  generateVideoFromImage,
  getCapabilities,
  reconstructHistoricalView,
  resolvePlaceByQuery,
} from './providers.js';
import {
  buildServerAudioFrame,
  completeAiTurn,
  createLiveTurnState,
  markAiTurnStarted,
  parseClientAudioFrame,
  resetBargeInGate,
  shouldSendBargeIn,
  type LiveTurnState,
} from './liveSocketProtocol.js';
import type { Citation, PlaceFeedbackPayload, PlaceFeedbackIssueType, PlaceSummary, TranscriptMessage } from '../types/index.js';

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(attachSession);
const distPath = path.resolve(process.cwd(), 'dist');

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

function requireDatabase(res: express.Response) {
  const pool = getPool();
  if (!pool) {
    res.status(503).json({ error: 'Postgres is not configured' });
    return null;
  }
  return pool;
}

function summarizeTitle(transcript: TranscriptMessage[], places: PlaceSummary[]) {
  if (places[0]?.name) {
    return places[0].name;
  }
  const firstUser = transcript.find((message) => message.role === 'user');
  return firstUser?.text.slice(0, 60) || 'LensIQ session';
}

const FEEDBACK_ISSUE_TYPES: PlaceFeedbackIssueType[] = [
  'wrong_place',
  'bad_fact',
  'bad_history',
  'bad_route',
  'other',
];

app.get('/api/capabilities', (_req, res) => {
  res.json(getCapabilities());
});

app.get('/api/auth/session', (req, res) => {
  res.json(getAuthSession(req));
});

app.get('/api/auth/google/start', startGoogleAuth);
app.get('/api/auth/google/callback', (req, res) => {
  handleGoogleCallback(req, res).catch((error) => {
    console.error('Google auth callback failed', error);
    res.status(500).send('Authentication failed');
  });
});
app.post('/api/auth/logout', logout);

app.post('/api/explore/explain', async (req, res) => {
  try {
    const result = await explainScene({
      imageBase64: req.body.imageBase64,
      query: req.body.query,
      origin: req.body.coordinates,
    });
    res.json(result);
  } catch (error: any) {
    console.error('Explain request failed', error);
    res.status(500).json({ error: error.message || 'Failed to explain scene' });
  }
});

app.post('/api/places/resolve', async (req, res) => {
  try {
    const place = await resolvePlaceByQuery(req.body.query, req.body.coordinates);
    if (!place) {
      return res.status(404).json({ error: 'No place matched the query' });
    }
    const details = place.providerPlaceId
      ? await fetchPlaceDetails(place.providerPlaceId, req.body.coordinates)
      : null;
    res.json(details || place);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to resolve place' });
  }
});

app.get('/api/places/nearby', async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return res.status(400).json({ error: 'lat and lng query params are required' });
  }

  try {
    const nearby = await fetchNearbyPlaces({ lat, lng });
    res.json(nearby);
  } catch (error: any) {
    console.error('Nearby places request failed', error);
    res.status(500).json({ error: error.message || 'Failed to load nearby places' });
  }
});

app.get('/api/places/:id', async (req, res) => {
  try {
    const place = await fetchPlaceDetails(
      req.params.id,
      req.query.lat && req.query.lng
        ? { lat: Number(req.query.lat), lng: Number(req.query.lng) }
        : undefined,
    );
    if (!place) {
      return res.status(404).json({ error: 'Place not found' });
    }
    res.json(place);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load place details' });
  }
});

app.get('/api/places/:id/history', async (req, res) => {
  try {
    const place = await fetchPlaceDetails(req.params.id);
    if (!place) {
      return res.status(404).json({ error: 'Place not found' });
    }
    const history = await fetchHistoricalAssets(place);
    res.json({
      place,
      summary: history.summary,
      facts: history.facts,
      citations: history.citations,
      assets: history.assets,
      canReconstruct: history.citations.length > 0,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load place history' });
  }
});

app.post('/api/places/:id/history/reconstruct', async (req, res) => {
  try {
    const place = await fetchPlaceDetails(req.params.id);
    if (!place) {
      return res.status(404).json({ error: 'Place not found' });
    }
    const history = await fetchHistoricalAssets(place);
    const asset = await reconstructHistoricalView({
      imageBase64: req.body.imageBase64,
      place,
      citations: history.citations,
    });
    res.json(asset);
  } catch (error: any) {
    res
      .status(typeof error?.status === 'number' ? error.status : 500)
      .json({ error: error.message || 'Failed to reconstruct historical view' });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const response = await chatWithLensIQ({
      message: req.body.message,
      useSearch: req.body.useSearch,
      useThinking: req.body.useThinking,
      imageBase64: req.body.imageBase64,
      place: req.body.place,
    });
    res.json({ text: response });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to complete chat request' });
  }
});

app.post('/api/media/image', async (req, res) => {
  try {
    const url = await generateImageFromPrompt(req.body.prompt, req.body.size || '1K');
    res.json({ url });
  } catch (error: any) {
    console.error('Image generation failed', error);
    res
      .status(typeof error?.status === 'number' ? error.status : 500)
      .json({ error: error.message || 'Failed to generate image' });
  }
});

app.post('/api/media/video', async (req, res) => {
  try {
    const url = await generateVideoFromImage(req.body.imageBase64, req.body.prompt || 'Animate this scene');
    res.json({ url });
  } catch (error: any) {
    console.error('Video generation failed', error);
    res.status(500).json({ error: error.message || 'Failed to generate video' });
  }
});

app.post('/api/media/video-analysis', async (req, res) => {
  try {
    const text = await analyzeVideo(req.body.videoBase64, req.body.mimeType, req.body.prompt);
    res.json({ text });
  } catch (error: any) {
    console.error('Video analysis failed', error);
    res.status(500).json({ error: error.message || 'Failed to analyze video' });
  }
});

app.get('/api/saved-places', requireAuth, async (req, res) => {
  const pool = requireDatabase(res);
  if (!pool || !req.user) return;

  const { rows } = await pool.query(
    `
      SELECT id, place_id, snapshot_json, notes, collection_name, saved_at
      FROM saved_places
      WHERE user_id = $1
      ORDER BY saved_at DESC
    `,
    [req.user.id],
  );

  res.json(
    rows.map((row) => ({
      ...(row.snapshot_json as PlaceSummary),
      id: row.id,
      providerPlaceId: (row.snapshot_json as PlaceSummary).providerPlaceId || row.place_id,
      savedAt: row.saved_at,
      notes: row.notes || undefined,
      collection: row.collection_name || undefined,
    })),
  );
});

app.post('/api/saved-places', requireAuth, async (req, res) => {
  const pool = requireDatabase(res);
  if (!pool || !req.user) return;

  const payload = req.body.place as PlaceSummary;
  if (!payload?.id || !payload.name) {
    return res.status(400).json({ error: 'place payload is required' });
  }

  const id = crypto.randomUUID();
  await pool.query(
    `
      INSERT INTO saved_places (id, user_id, place_id, snapshot_json, notes, collection_name, saved_at)
      VALUES ($1, $2, $3, $4::jsonb, $5, $6, NOW())
    `,
    [
      id,
      req.user.id,
      payload.providerPlaceId || payload.id,
      JSON.stringify(payload),
      req.body.notes || null,
      req.body.collection || null,
    ],
  );

  res.status(201).json({ id });
});

app.patch('/api/saved-places/:id', requireAuth, async (req, res) => {
  const pool = requireDatabase(res);
  if (!pool || !req.user) return;

  const notes = typeof req.body.notes === 'string' ? req.body.notes.trim() : null;
  const collection = typeof req.body.collection === 'string' ? req.body.collection.trim() : null;

  const result = await pool.query(
    `
      UPDATE saved_places
      SET
        notes = $1,
        collection_name = $2
      WHERE id = $3 AND user_id = $4
      RETURNING id
    `,
    [notes || null, collection || null, req.params.id, req.user.id],
  );

  if (!result.rowCount) {
    return res.status(404).json({ error: 'Saved place not found' });
  }

  res.json({ id: result.rows[0].id });
});

app.delete('/api/saved-places/:id', requireAuth, async (req, res) => {
  const pool = requireDatabase(res);
  if (!pool || !req.user) return;

  await pool.query('DELETE FROM saved_places WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  res.status(204).send();
});

app.get('/api/sessions', requireAuth, async (req, res) => {
  const pool = requireDatabase(res);
  if (!pool || !req.user) return;

  const { rows } = await pool.query(
    `
      SELECT id, title, created_at, thumbnail_url, transcript_json, places_json, citations_json, generated_assets_json
      FROM sessions
      WHERE user_id = $1
      ORDER BY created_at DESC
    `,
    [req.user.id],
  );

  res.json(
    rows.map((row) => ({
      id: row.id,
      title: row.title,
      createdAt: row.created_at,
      thumbnailUrl: row.thumbnail_url || undefined,
      transcript: row.transcript_json,
      placesExplored: row.places_json,
      citations: row.citations_json,
      generatedAssetUrls: row.generated_assets_json,
    })),
  );
});

app.get('/api/sessions/:id', requireAuth, async (req, res) => {
  const pool = requireDatabase(res);
  if (!pool || !req.user) return;

  const { rows } = await pool.query(
    `
      SELECT id, title, created_at, thumbnail_url, transcript_json, places_json, citations_json, generated_assets_json
      FROM sessions
      WHERE id = $1 AND user_id = $2
      LIMIT 1
    `,
    [req.params.id, req.user.id],
  );
  const row = rows[0];
  if (!row) {
    return res.status(404).json({ error: 'Session not found' });
  }

  res.json({
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    thumbnailUrl: row.thumbnail_url || undefined,
    transcript: row.transcript_json,
    placesExplored: row.places_json,
    citations: row.citations_json,
    generatedAssetUrls: row.generated_assets_json,
  });
});

app.post('/api/sessions', requireAuth, async (req, res) => {
  const pool = requireDatabase(res);
  if (!pool || !req.user) return;

  const transcript = (req.body.transcript || []) as TranscriptMessage[];
  const placesExplored = (req.body.placesExplored || []) as PlaceSummary[];
  const citations = (req.body.citations || []) as Citation[];
  const generatedAssetUrls = (req.body.generatedAssetUrls || []) as string[];
  const id = req.body.id || crypto.randomUUID();

  await pool.query(
    `
      INSERT INTO sessions (id, user_id, title, created_at, thumbnail_url, transcript_json, places_json, citations_json, generated_assets_json)
      VALUES ($1, $2, $3, COALESCE($4, NOW()), $5, $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb)
      ON CONFLICT (id)
      DO UPDATE SET
        title = EXCLUDED.title,
        thumbnail_url = EXCLUDED.thumbnail_url,
        transcript_json = EXCLUDED.transcript_json,
        places_json = EXCLUDED.places_json,
        citations_json = EXCLUDED.citations_json,
        generated_assets_json = EXCLUDED.generated_assets_json
    `,
    [
      id,
      req.user.id,
      req.body.title || summarizeTitle(transcript, placesExplored),
      req.body.createdAt || null,
      req.body.thumbnailUrl || null,
      JSON.stringify(transcript),
      JSON.stringify(placesExplored),
      JSON.stringify(citations),
      JSON.stringify(generatedAssetUrls),
    ],
  );

  res.status(201).json({ id });
});

app.post('/api/place-feedback', requireAuth, async (req, res) => {
  const pool = requireDatabase(res);
  if (!pool || !req.user) return;

  const payload = req.body as PlaceFeedbackPayload;
  const details = payload.details?.trim();

  if (!payload.issueType || !FEEDBACK_ISSUE_TYPES.includes(payload.issueType)) {
    return res.status(400).json({ error: 'A valid issue type is required' });
  }

  if (!details) {
    return res.status(400).json({ error: 'Feedback details are required' });
  }

  if (!payload.placeId && !payload.sessionId) {
    return res.status(400).json({ error: 'placeId or sessionId is required' });
  }

  if (payload.sessionId) {
    const sessionResult = await pool.query(
      'SELECT 1 FROM sessions WHERE id = $1 AND user_id = $2 LIMIT 1',
      [payload.sessionId, req.user.id],
    );
    if (!sessionResult.rowCount) {
      return res.status(404).json({ error: 'Session not found' });
    }
  }

  const id = crypto.randomUUID();
  await pool.query(
    `
      INSERT INTO place_feedback (id, user_id, place_id, session_id, issue_type, details, context_json, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, NOW())
    `,
    [
      id,
      req.user.id,
      payload.placeId || null,
      payload.sessionId || null,
      payload.issueType,
      details,
      JSON.stringify(payload.context || {}),
    ],
  );

  res.status(201).json({ id });
});

const httpServer = createServer(app);
const liveSocketServer = new WebSocketServer({ noServer: true });

type LiveSocketWithSession = WebSocket & {
  geminiSession?: Awaited<ReturnType<typeof createLiveSession>>;
  turnState?: LiveTurnState;
};

function sendSocket(ws: WebSocket, payload: unknown) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(payload));
  }
}

function sendSocketBinary(ws: WebSocket, payload: Uint8Array) {
  if (ws.readyState === 1) {
    ws.send(payload);
  }
}

liveSocketServer.on('connection', async (ws: LiveSocketWithSession) => {
  ws.turnState = createLiveTurnState();

  try {
    ws.geminiSession = await createLiveSession({
      onMessage: (event) => {
        const turnState = ws.turnState || createLiveTurnState();
        const transcription = event.serverContent?.inputTranscription?.text;
        if (transcription) {
          sendSocket(ws, {
            type: 'user_transcript',
            text: transcription,
            isFinal: Boolean(event.serverContent?.inputTranscription?.finished),
          });
        }

        const outputText = event.serverContent?.outputTranscription?.text || event.text;
        if (outputText) {
          markAiTurnStarted(turnState);
          sendSocket(ws, { type: 'ai_text', text: outputText, isFinal: false });
        }

        const parts = event.serverContent?.modelTurn?.parts || [];
        for (const part of parts) {
          if (part.inlineData?.data && String(part.inlineData.mimeType || '').startsWith('audio/')) {
            markAiTurnStarted(turnState);
            sendSocketBinary(ws, buildServerAudioFrame(part.inlineData.data));
          }
        }

        if (event.serverContent?.turnComplete) {
          completeAiTurn(turnState);
          sendSocket(ws, { type: 'turn_complete' });
        }
      },
      onError: (error) => {
        sendSocket(ws, { type: 'error', error: error.message });
      },
      onClose: () => {
        sendSocket(ws, { type: 'state', state: 'disconnected' });
      },
    });

    sendSocket(ws, { type: 'state', state: 'connected' });
  } catch (error: any) {
    sendSocket(ws, { type: 'error', error: error.message || 'Failed to connect live session' });
    ws.close();
    return;
  }

  ws.on('message', async (data, isBinary) => {
    if (!ws.geminiSession) {
      return;
    }

    try {
      if (isBinary) {
        const pcmBuffer = parseClientAudioFrame(
          data instanceof ArrayBuffer ? data : new Uint8Array(data as Buffer),
        );
        await ws.geminiSession.sendRealtimeInput({
          audio: {
            data: Buffer.from(pcmBuffer).toString('base64'),
            mimeType: 'audio/pcm;rate=16000',
          },
        });
        return;
      }

      const message = JSON.parse(String(data));
      const turnState = ws.turnState || (ws.turnState = createLiveTurnState());

      if (message.type === 'activity_start') {
        await ws.geminiSession.sendRealtimeInput({ activityStart: {} });
        if (shouldSendBargeIn(turnState)) {
          sendSocket(ws, { type: 'barge_in' });
        } else {
          console.info('[LensIQ Live] activity_start suppressed', {
            reason: 'already_barged_or_not_speaking',
          });
        }
      } else if (message.type === 'activity_end') {
        await ws.geminiSession.sendRealtimeInput({ activityEnd: {} });
        resetBargeInGate(turnState);
      } else if (message.type === 'frame') {
        await ws.geminiSession.sendRealtimeInput({
          video: { data: message.data, mimeType: 'image/jpeg' },
        });
      } else if (message.type === 'text') {
        ws.geminiSession.sendClientContent({
          turns: [{ role: 'user', parts: [{ text: message.text }] }],
          turnComplete: true,
        });
      } else if (message.type === 'audio_end') {
        await ws.geminiSession.sendRealtimeInput({ audioStreamEnd: true });
      }
    } catch (error: any) {
      if (isBinary) {
        console.warn('[LensIQ Live] malformed audio frame', {
          error: error.message || 'Invalid binary audio message',
        });
      } else {
        console.error('[LensIQ Live] realtime input failed', {
          type: (() => {
            try {
              return JSON.parse(String(data)).type;
            } catch {
              return 'unknown';
            }
          })(),
          error: error.message || 'Failed to relay live input',
        });
      }
      sendSocket(ws, { type: 'error', error: error.message || 'Invalid live message' });
    }
  });

  ws.on('close', () => {
    ws.geminiSession?.close();
  });
});

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get(/^(?!\/api(?:\/|$)).*/, (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

httpServer.on('upgrade', (request, socket, head) => {
  if (!request.url?.startsWith('/api/live')) {
    socket.destroy();
    return;
  }

  liveSocketServer.handleUpgrade(request, socket, head, (ws) => {
    liveSocketServer.emit('connection', ws, request);
  });
});

initDatabase()
  .then((connected) => {
    if (connected) {
      console.log('Connected to Postgres and ensured schema');
    } else {
      console.warn('DATABASE_URL is not configured; persistence endpoints will be unavailable');
    }
  })
  .catch((error) => {
    console.error('Failed to initialize database', error);
  });

httpServer.listen(env.apiPort, () => {
  console.log(`LensIQ backend listening on http://localhost:${env.apiPort}`);
});
