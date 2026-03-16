import 'dotenv/config';

const parseBoolean = (value: string | undefined) => value === 'true';

export const env = {
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  apiPort: Number(process.env.PORT || 3001),
  databaseUrl: process.env.DATABASE_URL || '',
  geminiApiKey: process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '',
  geminiChatModel: process.env.GEMINI_CHAT_MODEL || '',
  geminiReasoningModel: process.env.GEMINI_REASONING_MODEL || '',
  geminiLiveModel: process.env.GEMINI_LIVE_MODEL || '',
  geminiImageModel: process.env.GEMINI_IMAGE_MODEL || '',
  geminiVideoModel: process.env.GEMINI_VIDEO_MODEL || '',
  googleMapsApiKey:
    process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY || '',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  googleAuthRedirectUri: process.env.GOOGLE_AUTH_REDIRECT_URI || '',
  sessionSecret: process.env.SESSION_SECRET || '',
  gcsBucket: process.env.GCS_BUCKET || '',
  gcsProjectId: process.env.GCS_PROJECT_ID || '',
  enableCreativeTools: parseBoolean(process.env.VITE_ENABLE_CREATIVE_TOOLS),
};

export function requireEnv(value: string, label: string) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${label}`);
  }
  return value;
}
