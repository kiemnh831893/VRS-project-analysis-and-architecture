import { Router } from 'express';
import { z } from 'zod';

import { authenticate, requireRole } from '../middleware/auth.js';
import { confirmDeposit } from '../services/payment.service.js';

const depositSchema = z
  .object({
    bookingId: z.string().uuid().optional(),
    bookingCode: z.string().optional(),
    amount: z.number().positive(),
    method: z.enum(['CASH', 'SIMULATED_ONLINE']),
    provider: z.string().optional(),
    idempotencyKey: z.string().min(1),
  })
  .refine((d) => d.bookingId || d.bookingCode, { message: 'bookingId or bookingCode required' });

export const paymentRouter = Router();

paymentRouter.post(
  '/deposit',
  authenticate,
  requireRole('STAFF', 'ADMIN'),
  async (request, response, next) => {
    try {
      const input = depositSchema.parse(request.body);
      const result = await confirmDeposit({ ...input, confirmedBy: request.user!.userId });
      response.status(201).json(result);
    } catch (error) {
      next(error);
    }
  },
);
