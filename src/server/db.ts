import { Pool } from 'pg';
import { env } from './env.js';

const schemaSql = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    picture TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    thumbnail_url TEXT,
    transcript_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    places_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    citations_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    generated_assets_json JSONB NOT NULL DEFAULT '[]'::jsonb
  );

  CREATE TABLE IF NOT EXISTS saved_places (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    place_id TEXT NOT NULL,
    snapshot_json JSONB NOT NULL,
    notes TEXT,
    collection_name TEXT,
    saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS historical_assets (
    id TEXT PRIMARY KEY,
    place_id TEXT NOT NULL,
    asset_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS generated_assets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    asset_type TEXT NOT NULL,
    asset_url TEXT NOT NULL,
    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS place_feedback (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    place_id TEXT,
    session_id TEXT,
    issue_type TEXT NOT NULL,
    details TEXT NOT NULL,
    context_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS sessions_user_created_idx ON sessions (user_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS saved_places_user_saved_idx ON saved_places (user_id, saved_at DESC);
  CREATE INDEX IF NOT EXISTS place_feedback_user_created_idx ON place_feedback (user_id, created_at DESC);
`;

let pool: Pool | null = null;

export function hasDatabase() {
  return Boolean(env.databaseUrl);
}

export function getPool() {
  if (!env.databaseUrl) {
    return null;
  }

  if (!pool) {
    pool = new Pool({
      connectionString: env.databaseUrl,
      ssl: env.databaseUrl.includes('sslmode=disable')
        ? false
        : env.databaseUrl.includes('localhost')
          ? false
          : { rejectUnauthorized: false },
    });
  }

  return pool;
}

export async function initDatabase() {
  const clientPool = getPool();
  if (!clientPool) {
    return false;
  }

  await clientPool.query(schemaSql);
  return true;
}
