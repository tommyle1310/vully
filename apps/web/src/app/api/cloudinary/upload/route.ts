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

  const formData = await request.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'File is required.' }, { status: 400 });
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const folder = 'vully/avatars';
  const paramsToSign = {
    folder,
    timestamp,
  };
  const signature = signParams(paramsToSign, apiSecret);

  const cloudinaryData = new FormData();
  cloudinaryData.append('file', file);
  cloudinaryData.append('api_key', apiKey);
  cloudinaryData.append('timestamp', timestamp);
  cloudinaryData.append('folder', folder);
  cloudinaryData.append('signature', signature);

  const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: cloudinaryData,
  });

  if (!uploadRes.ok) {
    const uploadErr = await uploadRes.json().catch(() => ({}));
    return NextResponse.json(
      { error: uploadErr?.error?.message || 'Avatar upload failed.' },
      { status: 400 }
    );
  }

  const uploaded = await uploadRes.json();
  return NextResponse.json({
    secureUrl: uploaded.secure_url as string,
    publicId: uploaded.public_id as string,
  });
}
