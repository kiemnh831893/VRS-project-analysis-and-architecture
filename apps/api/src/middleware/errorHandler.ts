import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

import { logger } from '../lib/logger.js';
import { HttpError } from '../lib/httpError.js';

export function errorHandler(
  error: unknown,
  request: Request,
  response: Response,
  _next: NextFunction,
): void {
  if (error instanceof HttpError) {
    response.status(error.status).json({ error: error.message, code: error.code });
    return;
  }

  if (error instanceof z.ZodError) {
    // Do not echo Zod's `received` value: it can contain a submitted password or token.
    const details = error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    response.status(400).json({ error: 'Validation failed', details });
    return;
  }

  logger.error('unhandled_error', {
    requestId: response.locals.requestId,
    method: request.method,
    path: request.path,
    error,
  });
  response.status(500).json({ error: 'Internal server error' });
}
