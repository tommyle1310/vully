import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.API_PORT || '3001', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
}));

export const databaseConfig = registerAs('database', () => ({
  url: process.env.DATABASE_URL,
}));

export const redisConfig = registerAs('redis', () => ({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
}));

export const jwtConfig = registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET || 'jwt-secret-change-me',
  accessSecret: process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'access-secret-change-me',
  refreshSecret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'refresh-secret-change-me',
  accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
}));

export const s3Config = registerAs('s3', () => ({
  endpoint: process.env.S3_ENDPOINT,
  accessKey: process.env.S3_ACCESS_KEY,
  secretKey: process.env.S3_SECRET_KEY,
  bucket: process.env.S3_BUCKET || 'vully-uploads',
  region: process.env.S3_REGION || 'us-east-1',
}));

export const clamavConfig = registerAs('clamav', () => ({
  host: process.env.CLAMAV_HOST || 'localhost',
  port: parseInt(process.env.CLAMAV_PORT || '3310', 10),
  enabled: process.env.CLAMAV_ENABLED === 'true',
}));

export const openaiConfig = registerAs('openai', () => ({
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
}));
