import { env } from '../config/env.js';

type LogLevel = 'info' | 'warn' | 'error';
type LogFields = Record<string, unknown>;

const REDACTED_KEYS = /password|token|secret|authorization|cookie|database_url|connectionstring/i;

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[truncated]';
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitize(item, depth + 1));
  if (value instanceof Error) {
    return { name: value.name, message: value.message };
  }
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        REDACTED_KEYS.test(key) ? '[redacted]' : sanitize(item, depth + 1),
      ]),
    );
  }
  return value;
}

function write(level: LogLevel, event: string, fields: LogFields = {}): void {
  if (env.nodeEnv === 'test') return;

  const payload = {
    timestamp: new Date().toISOString(),
    level,
    service: 'vrs-api',
    environment: env.nodeEnv,
    event,
    ...(sanitize(fields) as LogFields),
  };
  const line = JSON.stringify(payload);

  if (level === 'error') process.stderr.write(`${line}\n`);
  else process.stdout.write(`${line}\n`);
}

export const logger = {
  info: (event: string, fields?: LogFields) => write('info', event, fields),
  warn: (event: string, fields?: LogFields) => write('warn', event, fields),
  error: (event: string, fields?: LogFields) => write('error', event, fields),
};
