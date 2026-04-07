import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

let fileEnvCache: Record<string, string> | null = null;

function parseEnvFile(fileContent: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rawLine of fileContent.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const idx = line.indexOf('=');
    if (idx <= 0) continue;

    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
    out[key] = value;
  }
  return out;
}

function loadFileEnv(): Record<string, string> {
  if (fileEnvCache) return fileEnvCache;

  const collected: Record<string, string> = {};
  const rootsToTry = [process.cwd(), path.resolve(process.cwd(), '..'), path.resolve(process.cwd(), '../..')];
  const envRelativePaths = ['.env.local', '.env', 'apps/api/.env.local', 'apps/api/.env'];

  for (const root of rootsToTry) {
    for (const relativePath of envRelativePaths) {
      const fullPath = path.join(root, relativePath);
      if (!fs.existsSync(fullPath)) continue;

      const parsed = parseEnvFile(fs.readFileSync(fullPath, 'utf8'));
      Object.assign(collected, parsed);
    }
  }

  fileEnvCache = collected;
  return collected;
}

function getEnvValue(key: string): string | undefined {
  return process.env[key] || loadFileEnv()[key];
}

function signParams(params: Record<string, string>, apiSecret: string): string {
  const serialized = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');

  return crypto
    .createHash('sha1')
    .update(`${serialized}${apiSecret}`)
    .digest('hex');
}

export async function POST(request: Request) {
  const cloudName = getEnvValue('CLOUDINARY_CLOUD_NAME');
  const apiKey = getEnvValue('CLOUDINARY_API_KEY');
  const apiSecret = getEnvValue('CLOUDINARY_API_SECRET');

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json(
      {
        error: 'Cloudinary is not configured.',
        missing: {
          CLOUDINARY_CLOUD_NAME: !cloudName,
          CLOUDINARY_API_KEY: !apiKey,
          CLOUDINARY_API_SECRET: !apiSecret,
        },
      },
      { status: 500 }
    );
  }

  const { publicId } = (await request.json()) as { publicId?: string };
  if (!publicId) {
    return NextResponse.json({ error: 'Public id is required.' }, { status: 400 });
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = signParams({ public_id: publicId, timestamp }, apiSecret);

  const payload = new URLSearchParams();
  payload.set('public_id', publicId);
  payload.set('timestamp', timestamp);
  payload.set('api_key', apiKey);
  payload.set('signature', signature);

  const destroyRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: payload.toString(),
  });

  if (!destroyRes.ok) {
    const destroyErr = await destroyRes.json().catch(() => ({}));
    return NextResponse.json(
      { error: destroyErr?.error?.message || 'Avatar delete failed.' },
      { status: 400 }
    );
  }

  const result = await destroyRes.json();
  return NextResponse.json({ result: result.result as string });
}
