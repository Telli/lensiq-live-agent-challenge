import crypto from 'crypto';
import { Storage } from '@google-cloud/storage';
import { env } from './env.js';

interface SaveAssetParams {
  base64Data: string;
  mimeType: string;
  folder: string;
  filenameHint: string;
}

function normalizeMimeType(mimeType: string) {
  if (mimeType === 'image/jpeg') return 'image/jpeg';
  if (mimeType === 'image/png') return 'image/png';
  if (mimeType === 'video/mp4') return 'video/mp4';
  if (mimeType.startsWith('image/')) return 'image/jpeg';
  if (mimeType.startsWith('video/')) return 'video/mp4';
  return 'application/octet-stream';
}

function normalizeExtension(mimeType: string) {
  const normalized = normalizeMimeType(mimeType);
  if (normalized === 'image/jpeg') return 'jpg';
  if (normalized === 'image/png') return 'png';
  if (normalized === 'video/mp4') return 'mp4';
  return 'bin';
}

function sanitizeBase64(base64Data: string) {
  return base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
}

function sanitizeFilenameHint(filenameHint: string) {
  const normalized = filenameHint
    .normalize('NFKD')
    .replace(/[^\x00-\x7F]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return normalized || 'asset';
}

export function storageAvailable() {
  return Boolean(env.gcsBucket);
}

export async function saveBase64Asset({
  base64Data,
  mimeType,
  folder,
  filenameHint,
}: SaveAssetParams) {
  const cleaned = sanitizeBase64(base64Data);
  const safeMimeType = normalizeMimeType(mimeType);

  if (!storageAvailable()) {
    return `data:${safeMimeType};base64,${cleaned}`;
  }

  const storage = new Storage({
    projectId: env.gcsProjectId || undefined,
  });

  const bucket = storage.bucket(env.gcsBucket);
  const extension = normalizeExtension(safeMimeType);
  const filename = `${folder}/${Date.now()}-${sanitizeFilenameHint(filenameHint)}-${crypto.randomUUID()}.${extension}`;
  const file = bucket.file(filename);

  try {
    await file.save(Buffer.from(cleaned, 'base64'), {
      contentType: safeMimeType,
      resumable: false,
    });
  } catch (error) {
    console.error('Failed to persist generated asset to Cloud Storage', {
      bucket: bucket.name,
      filename,
      mimeType: safeMimeType,
      error: error instanceof Error ? error.message : String(error),
    });
    return `data:${safeMimeType};base64,${cleaned}`;
  }

  return `https://storage.googleapis.com/${bucket.name}/${filename}`;
}
