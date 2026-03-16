# LensIQ

LensIQ is a multimodal mobile web app that uses Gemini to understand the world through a live camera feed. It combines live audio/video interaction, place lookup, grounding, nearby exploration, historical context, and creative media generation behind a backend-proxied Express API.

The Explore experience is coordinated by a centralized multimodal orchestrator. Camera frames, tracking, live voice, grounding, nearby guidance, and time travel all flow through a single event-driven state machine instead of separate feature hooks making independent decisions.

## Submission Criteria

- `Gemini model`: used throughout explain, chat, live audio, image generation, and video analysis.
- `Google GenAI SDK or ADK`: implemented with [`@google/genai`](./package.json).
- `Google Cloud service`: deployable on Cloud Run from this repo, with optional GCS object storage integration.

## What It Does

- `Explain`: send the current frame and optional query to Gemini, then enrich the result with Google Places, Wikidata, and Wikipedia.
- `Live Agent`: stream microphone PCM and camera JPEG frames to a server-owned Gemini Live session over WebSocket.
- `Nearby`: fetch real places plus walking distance/duration through Google Places and Routes.
- `Time Travel`: run both place-led and scene-led historical reconstruction. LensIQ can time-travel a known landmark or infer the current streetscape from the live frame, location, heading, and nearby candidates, then render a camera-native compare overlay with a multi-era timeline scrubber, source labels, grounding, and optional live narration.
- `Creative Lab`: generate images, generate videos, and analyze uploaded videos.
- `History + Saved`: persist sessions, saved places, notes, collections, citations, and generated assets in Postgres.

## Architecture

```mermaid
flowchart LR
    U["Mobile Browser"] --> FE["React + Vite SPA"]
    FE -->|HTTPS / WS| API["Express Backend"]
    FE --> ORCH["LensIQ Multimodal Orchestrator"]
    ORCH --> FE
    API --> GENAI["Gemini API via @google/genai"]
    API --> PLACES["Google Places + Routes"]
    API --> KNOW["Wikipedia + Wikidata"]
    API --> HIST["Library of Congress + Internet Archive"]
    API --> PG["Postgres"]
    API --> GCS["Google Cloud Storage (optional)"]
    API --> CR["Cloud Run"]
```

## Stack

- `Frontend`: React 19, Vite 6, Tailwind CSS, motion, React Router
- `Backend`: Express, WebSocket (`ws`), TypeScript
- `AI`: Gemini Live, Gemini Flash/Pro, Gemini image generation, Veo video generation
- `Orchestration`: centralized multimodal reducer/effects loop for Explore
- `Data`: Google Places API, Google Routes API, Wikidata, Wikipedia, Library of Congress, Internet Archive
- `Persistence`: Postgres
- `Auth`: Google OAuth via `google-auth-library`
- `Storage`: Google Cloud Storage via `@google-cloud/storage`

## Time Travel Hero Interaction

- `Place-led time travel`: if LensIQ has a confident active place, history is anchored to landmark-specific archival assets and citations.
- `Scene-led time travel`: if LensIQ does not yet have a strong place lock, it still accepts "time travel this view" and infers the most likely district, streetscape, and era anchors from the current frame, location, heading, and nearby places.
- `Structure-aware overlay`: the live camera stays visible underneath the historical layer. LensIQ overlays archival imagery or a clearly labeled AI reconstruction as a ghosted scene compare, rather than replacing the camera with a separate static screen.
- `Continuous timeline`: users can scrub across multiple eras instead of a single now-vs-then state.
- `Trust metadata`: source labels, verified facts, inferred claims, reconstructed elements, and confidence notes are separated and surfaced in grounding.
- `Voice integration`: when live voice is active, the orchestrator can narrate how the scene changed over time and keep the transcript dock synchronized.

## Local Development

### Prerequisites

- Node.js 20+
- npm
- A Gemini API key
- A Google Maps API key for Places/Routes
- Postgres if you want persistence enabled

### Environment

Copy `.env.example` to `.env` and configure:

```env
APP_URL="http://localhost:3000"
PORT="3001"

GEMINI_API_KEY=""
GOOGLE_MAPS_API_KEY=""

DATABASE_URL="postgresql://postgres:postgres@localhost:5432/lensiq"

GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GOOGLE_AUTH_REDIRECT_URI="http://localhost:3001/api/auth/google/callback"
SESSION_SECRET=""

GCS_BUCKET=""
GCS_PROJECT_ID=""

VITE_ENABLE_CREATIVE_TOOLS="true"
```

### Run

```bash
npm install
npm run dev
```

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001`
- Health check: `http://localhost:3001/api/health`

## Production Build

```bash
npm install
npm run build
npm run start
```

The production server serves the built SPA from `dist/` and handles `/api/*` plus `/api/live`.

## Cloud Run Deployment

This repo is set up to deploy as a single Cloud Run service that serves both the SPA and the Express backend.

### One-time API enablement

```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com
```

### Deploy from source

```bash
PROJECT_ID="$(gcloud config get-value project)"
REGION="us-central1"
SERVICE_NAME="lensiq"

gcloud run deploy "${SERVICE_NAME}" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --source . \
  --allow-unauthenticated \
  --set-env-vars "PORT=8080" \
  --set-env-vars "APP_URL=https://${SERVICE_NAME}-REPLACE_WITH_URL.a.run.app" \
  --set-env-vars "GEMINI_API_KEY=REPLACE_ME" \
  --set-env-vars "GOOGLE_MAPS_API_KEY=REPLACE_ME" \
  --set-env-vars "SESSION_SECRET=REPLACE_ME"
```

You can also use the helper script:

```bash
chmod +x scripts/deploy-cloud-run.sh
SERVICE_NAME=lensiq REGION=us-central1 PROJECT_ID="$(gcloud config get-value project)" ./scripts/deploy-cloud-run.sh
```

### Post-deploy updates

- Replace `APP_URL` with the actual Cloud Run URL returned by deploy.
- If Google OAuth is enabled, set `GOOGLE_AUTH_REDIRECT_URI` to:
  `https://YOUR_CLOUD_RUN_URL/api/auth/google/callback`
- If Postgres is deployed separately, set `DATABASE_URL`.
- If GCS is enabled, set `GCS_BUCKET` and `GCS_PROJECT_ID`.

## Proof for Judges

Fastest proof path:

1. Open the Google Cloud Console on the Cloud Run service.
2. Show the service overview and logs.
3. Open the deployed URL and demonstrate live multimodal interaction.

Code proof path:

- Gemini SDK usage: [src/server/providers.ts](./src/server/providers.ts)
- Live session setup: [src/server/providers.ts](./src/server/providers.ts)
- Cloud Storage integration: [src/server/storage.ts](./src/server/storage.ts)
- Container deployment: [Dockerfile](./Dockerfile)
- Cloud Run deploy helper: [scripts/deploy-cloud-run.sh](./scripts/deploy-cloud-run.sh)
- Deployment proof: [docs/deployment-proof.md](./docs/deployment-proof.md)

## Live Barge-In

Live mode now supports explicit activity signals for interruption:

- The client detects speech onset from PCM amplitude.
- Speech start sends `activity_start` to the backend.
- The backend forwards `activityStart` to Gemini Live with interruption handling enabled.
- Local playback is interrupted immediately so the user can cut in naturally.

Implementation references:

- Client live hook: [src/hooks/useLiveExplore.ts](./src/hooks/useLiveExplore.ts)
- Playback interruption: [src/audio/playbackService.ts](./src/audio/playbackService.ts)
- Gemini Live config: [src/server/providers.ts](./src/server/providers.ts)
- WebSocket relay: [src/server/index.ts](./src/server/index.ts)

## Verification

Current verification commands:

```bash
npm run lint
npx vitest run
npm run build
```

## Repo Notes

- Provider keys are backend-owned; the browser does not need a Gemini API key.
- If `DATABASE_URL` is unset, persistence endpoints degrade truthfully instead of using mocks.
- If `GCS_BUCKET` is unset, generated assets fall back to data URLs rather than fake cloud storage paths.
- MCP and GenMedia adapters are optional. The current web demo works without them, but the service layer is prepared for future Google Cloud MCP or media-tool integration.
