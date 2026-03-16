import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { parse as parseCookie, serialize as serializeCookie } from 'cookie';
import { getPool } from './db.js';
import { env, requireEnv } from './env.js';
import type { AuthSession, UserProfile } from '../types/index.js';

const SESSION_COOKIE = 'lensiq_session';
const GOOGLE_SCOPES = ['openid', 'email'];

interface SessionPayload {
  user: UserProfile;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      user: UserProfile | null;
    }
  }
}

function createOAuthClient() {
  if (!env.googleClientId || !env.googleClientSecret || !env.googleAuthRedirectUri) {
    return null;
  }

  return new OAuth2Client(
    env.googleClientId,
    env.googleClientSecret,
    env.googleAuthRedirectUri,
  );
}

function sign(value: string) {
  return crypto.createHmac('sha256', requireEnv(env.sessionSecret, 'SESSION_SECRET')).update(value).digest('hex');
}

function encodeSession(payload: SessionPayload) {
  const json = JSON.stringify(payload);
  const encoded = Buffer.from(json, 'utf8').toString('base64url');
  return `${encoded}.${sign(encoded)}`;
}

function decodeSession(rawCookie: string | undefined): SessionPayload | null {
  if (!rawCookie) return null;
  const [encoded, signature] = rawCookie.split('.');
  if (!encoded || !signature || sign(encoded) !== signature) return null;

  const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as SessionPayload;
  if (parsed.exp < Date.now()) return null;
  return parsed;
}

async function upsertUser(user: UserProfile) {
  const pool = getPool();
  if (!pool) return;

  await pool.query(
    `
      INSERT INTO users (id, email, name, picture)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id)
      DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name, picture = EXCLUDED.picture
    `,
    [user.id, user.email, user.name, user.picture || null],
  );
}

export function authAvailable() {
  return Boolean(
    env.googleClientId && env.googleClientSecret && env.googleAuthRedirectUri && env.sessionSecret,
  );
}

export function attachSession(req: Request, _res: Response, next: NextFunction) {
  const cookies = parseCookie(req.headers.cookie || '');
  const session = decodeSession(cookies[SESSION_COOKIE]);
  req.user = session?.user || null;
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

export function getAuthSession(req: Request): AuthSession {
  return {
    authenticated: Boolean(req.user),
    user: req.user,
  };
}

export async function startGoogleAuth(req: Request, res: Response) {
  const oauthClient = createOAuthClient();
  if (!oauthClient) {
    return res.status(503).json({ error: 'Google authentication is not configured' });
  }

  const state = Buffer.from(
    JSON.stringify({
      returnTo: typeof req.query.returnTo === 'string' ? req.query.returnTo : '/profile',
    }),
  ).toString('base64url');

  const url = oauthClient.generateAuthUrl({
    access_type: 'offline',
    scope: GOOGLE_SCOPES,
    prompt: 'consent',
    state,
  });

  res.redirect(url);
}

export async function handleGoogleCallback(req: Request, res: Response) {
  const oauthClient = createOAuthClient();
  if (!oauthClient) {
    return res.status(503).send('Google authentication is not configured');
  }

  const code = typeof req.query.code === 'string' ? req.query.code : '';
  if (!code) {
    return res.status(400).send('Missing authorization code');
  }

  const { tokens } = await oauthClient.getToken(code);
  oauthClient.setCredentials(tokens);

  const ticket = await oauthClient.verifyIdToken({
    idToken: tokens.id_token || '',
    audience: env.googleClientId,
  });

  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email) {
    return res.status(400).send('Google profile information was incomplete');
  }

  const fallbackName = payload.name || payload.email.split('@')[0] || 'LensIQ user';

  const user: UserProfile = {
    id: payload.sub,
    email: payload.email,
    name: fallbackName,
    picture: payload.picture,
  };

  await upsertUser(user);

  res.setHeader(
    'Set-Cookie',
    serializeCookie(
      SESSION_COOKIE,
      encodeSession({
        user,
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
      }),
      {
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        path: '/',
        maxAge: 7 * 24 * 60 * 60,
      },
    ),
  );

  const state = typeof req.query.state === 'string' ? req.query.state : '';
  let returnTo = '/profile';
  if (state) {
    try {
      const parsed = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
      if (parsed.returnTo) {
        returnTo = parsed.returnTo;
      }
    } catch {
      returnTo = '/profile';
    }
  }

  res.redirect(new URL(returnTo, env.appUrl).toString());
}

export function logout(req: Request, res: Response) {
  req.user = null;
  res.setHeader(
    'Set-Cookie',
    serializeCookie(SESSION_COOKIE, '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
      maxAge: 0,
    }),
  );
  res.status(204).send();
}
