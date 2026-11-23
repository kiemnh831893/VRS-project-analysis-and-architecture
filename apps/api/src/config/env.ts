import 'dotenv/config';

const nodeEnv = process.env.NODE_ENV ?? 'development';
const productionLike = nodeEnv === 'production' || nodeEnv === 'staging';

function readPort(value: string | undefined): number {
  const port = Number(value ?? 4000);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`PORT must be an integer between 1 and 65535. Received: ${String(value)}`);
  }

  return port;
}

function readPositiveInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;

  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer. Received: ${raw}`);
  }
  return value;
}

function readRequired(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. Copy apps/api/.env.example to apps/api/.env.`,
    );
  }

  return value;
}

function readCorsOrigins(raw: string | undefined, strict: boolean): string[] {
  const origins = (raw ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    throw new Error('CORS_ORIGIN must contain at least one origin.');
  }
  if (strict && origins.includes('*')) {
    throw new Error('CORS_ORIGIN cannot be "*" in staging or production.');
  }
  return origins;
}

function readTrustProxy(raw: string | undefined): boolean | number | string {
  if (!raw) return 1;
  if (raw === 'false') return false;
  if (raw === 'true') return true;

  const value = Number(raw);
  if (Number.isInteger(value) && value >= 0) return value;
  return raw;
}

const jwtSecret = readRequired('JWT_SECRET');
if (
  productionLike &&
  (jwtSecret.length < 32 || /change_me|replace_with|local_only/i.test(jwtSecret))
) {
  throw new Error(
    'JWT_SECRET must be at least 32 characters and must not be a placeholder in staging/production.',
  );
}

export const env = {
  nodeEnv,
  isProductionLike: productionLike,
  port: readPort(process.env.PORT),
  corsOrigins: readCorsOrigins(process.env.CORS_ORIGIN, productionLike),
  trustProxy: readTrustProxy(process.env.TRUST_PROXY),
  databaseUrl: readRequired('DATABASE_URL'),
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
  rateLimitWindowMs: readPositiveInt('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
  rateLimitMax: readPositiveInt('RATE_LIMIT_MAX', 300),
  authRateLimitMax: readPositiveInt('AUTH_RATE_LIMIT_MAX', 30),
} as const;
