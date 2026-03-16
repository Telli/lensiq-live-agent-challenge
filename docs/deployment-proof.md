# Deployment Proof

## Cloud Run

- Project: `gen-lang-client-0442373131`
- Region: `us-central1`
- Service: `lensiq`
- Public URL: [https://lensiq-839783328958.us-central1.run.app](https://lensiq-839783328958.us-central1.run.app)
- Latest ready revision: `lensiq-00009-jxf`

## Build

- Cloud Build ID: `40e2d750-e9d4-4961-9cc5-5180affd3966`
- Build logs:
  [https://console.cloud.google.com/cloud-build/builds;region=us-central1/40e2d750-e9d4-4961-9cc5-5180affd3966?project=839783328958](https://console.cloud.google.com/cloud-build/builds;region=us-central1/40e2d750-e9d4-4961-9cc5-5180affd3966?project=839783328958)

## Verification

- Health endpoint: [https://lensiq-839783328958.us-central1.run.app/api/health](https://lensiq-839783328958.us-central1.run.app/api/health)
- Capabilities endpoint:
  [https://lensiq-839783328958.us-central1.run.app/api/capabilities](https://lensiq-839783328958.us-central1.run.app/api/capabilities)

Live smoke checks on the deployed service:

- Nearby search returns 5 real places with route guidance.
- Chat responds successfully from Gemini.
- Image generation returns a stored asset URL.
- Video generation returns a stored asset URL from Veo after the async operation completes.

Current capability state on the deployed service:

- `gemini=true`
- `places=true`
- `routes=true`
- `live=true`
- `media=true`
- `historical=true`
- `database=true`
- `auth=true`
- `storage=true`

## Notes

- The Cloud Run service is live and reachable.
- Secret Manager is now attached for:
  - `GEMINI_API_KEY`
  - `GOOGLE_MAPS_API_KEY`
  - `SESSION_SECRET`
  - `GOOGLE_CLIENT_SECRET`
  - `DATABASE_URL`
- Google OAuth is configured for the deployed Cloud Run URL.
- Cloud Storage is configured with bucket-level IAM for public asset reads and runtime service-account writes.
- Cloud SQL PostgreSQL is attached to Cloud Run over the Unix socket mount.
- The deployed startup logs confirm Postgres connectivity and schema initialization.
