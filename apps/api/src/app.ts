import { randomUUID } from 'node:crypto';

import cors from 'cors';
import express, { type Express, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { logger } from './lib/logger.js';
import { authRouter } from './routes/auth.routes.js';
import { branchRouter } from './routes/branch.routes.js';
import { vehicleCategoryRouter } from './routes/vehicleCategory.routes.js';
import { vehicleRouter } from './routes/vehicle.routes.js';
import { bookingRouter } from './routes/booking.routes.js';
import { paymentRouter } from './routes/payment.routes.js';
import { contractRouter } from './routes/contract.routes.js';
import { inspectionRouter } from './routes/inspection.routes.js';
import { fineRouter } from './routes/fine.routes.js';
import { invoiceRouter } from './routes/invoice.routes.js';
import { userRouter } from './routes/user.routes.js';
import { systemConfigRouter } from './routes/systemConfig.routes.js';
import { fineRuleRouter } from './routes/fineRule.routes.js';
import { reportRouter } from './routes/report.routes.js';
import { auditLogRouter } from './routes/auditLog.routes.js';
import { adminRouter } from './routes/admin.routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/auth.js';
import { toPlain } from './lib/serialize.js';

function tooManyRequests(_request: Request, response: Response): void {
  response.status(429).json({ error: 'Too many requests', code: 'RATE_LIMITED' });
}

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', env.trustProxy);
  app.use(
    helmet({
      hsts: env.isProductionLike ? { maxAge: 15552000, includeSubDomains: true } : false,
      referrerPolicy: { policy: 'no-referrer' },
    }),
  );
  app.use(cors({ origin: env.corsOrigins, credentials: true }));
  app.use(express.json({ limit: '1mb' }));

  // Serialize Prisma Decimal/BigInt values to plain JSON numbers.
  app.use((request, response, next) => {
    const originalJson = response.json.bind(response);
    response.json = (body: unknown) => originalJson(toPlain(body));
    next();
  });

  // Request correlation and structured access logs. Never log bodies, headers or tokens.
  app.use((request, response, next) => {
    const incoming = request.headers['x-request-id'];
    const requestId = typeof incoming === 'string' ? incoming.slice(0, 64) : randomUUID();
    response.setHeader('X-Request-Id', requestId);
    response.locals.requestId = requestId;

    const startedAt = Date.now();
    response.on('finish', () => {
      logger.info('http_request', {
        requestId,
        method: request.method,
        path: request.path,
        status: response.statusCode,
        durationMs: Date.now() - startedAt,
      });
    });
    next();
  });

  const live = (_request: Request, response: Response): void => {
    response.status(200).json({
      status: 'ok',
      service: 'vrs-api',
      timestamp: new Date().toISOString(),
    });
  };
  app.get('/api/health', live);
  app.get('/api/health/live', live);

  app.get('/api/health/ready', async (_request, response) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      response.status(200).json({
        status: 'ready',
        service: 'vrs-api',
        database: 'connected',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('readiness_failed', { error });
      response.status(503).json({
        status: 'unavailable',
        service: 'vrs-api',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
      });
    }
  });

  const apiLimiter = rateLimit({
    windowMs: env.rateLimitWindowMs,
    limit: env.rateLimitMax,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: tooManyRequests,
  });
  const authLimiter = rateLimit({
    windowMs: env.rateLimitWindowMs,
    limit: env.authRateLimitMax,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: tooManyRequests,
  });

  app.use('/api', apiLimiter);
  app.use('/api/auth', authLimiter);

  app.use('/api/auth', authRouter);
  app.use('/api/branches', branchRouter);
  app.use('/api/vehicle-categories', vehicleCategoryRouter);
  app.use('/api/vehicles', vehicleRouter);
  app.use('/api/bookings', bookingRouter);
  app.use('/api/payments', paymentRouter);
  app.use('/api/contracts', contractRouter);
  app.use('/api/inspections', inspectionRouter);
  app.use('/api/fines', fineRouter);
  app.use('/api/invoices', invoiceRouter);
  app.use('/api/users', userRouter);
  app.use('/api/system-configs', systemConfigRouter);
  app.use('/api/fine-rules', fineRuleRouter);
  app.use('/api/reports', reportRouter);
  app.use('/api/audit-logs', auditLogRouter);
  app.use('/api/admin', adminRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
