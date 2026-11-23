import type { NextFunction, Request, Response } from 'express';

import { HttpError } from '../lib/httpError.js';
import { verifyToken } from '../services/auth.service.js';
import { prisma } from '../lib/prisma.js';
import type { UserRole } from '../generated/prisma/enums.js';

export async function authenticate(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const header = request.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    response.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = header.slice('Bearer '.length).trim();
  let payload: ReturnType<typeof verifyToken>;
  try {
    payload = verifyToken(token);
  } catch {
    response.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  try {
    // A token issued before an account is locked must not keep working.
    const user = await prisma.user.findUnique({
      where: { userId: payload.sub },
      select: { accountStatus: true },
    });
    if (!user) {
      response.status(401).json({ error: 'Invalid or expired token' });
      return;
    }
    if (user.accountStatus !== 'ACTIVE') {
      response.status(403).json({ error: 'Account is locked', code: 'ACCOUNT_LOCKED' });
      return;
    }
    request.user = { userId: payload.sub, role: payload.role };
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(...roles: UserRole[]) {
  return (request: Request, response: Response, next: NextFunction): void => {
    if (!request.user) {
      response.status(401).json({ error: 'Unauthenticated' });
      return;
    }
    if (!roles.includes(request.user.role)) {
      response.status(403).json({ error: 'Forbidden' });
      return;
    }
    next();
  };
}

export function notFound(request: Request, response: Response): void {
  response.status(404).json({ error: 'Not Found', path: request.path });
}

export { HttpError };
