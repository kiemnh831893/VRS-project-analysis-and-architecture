import { Router } from 'express';
import { z } from 'zod';

import { authenticate, requireRole } from '../middleware/auth.js';
import { generateInvoice, getInvoice, settleInvoice } from '../services/invoice.service.js';

const generateInvoiceSchema = z.object({
  contractId: z.string().uuid(),
  discountAmount: z.number().min(0).optional(),
});

const settleInvoiceSchema = z.object({
  amount: z.number().positive(),
  method: z.enum(['CASH', 'SIMULATED_ONLINE']),
  provider: z.string().optional(),
  idempotencyKey: z.string().min(1),
});

export const invoiceRouter = Router();

invoiceRouter.get('/:id', authenticate, async (request, response, next) => {
  try {
    const invoice = await getInvoice(
      String(request.params.id),
      request.user!.userId,
      request.user!.role,
    );
    response.json({ invoice });
  } catch (error) {
    next(error);
  }
});

invoiceRouter.post(
  '/',
  authenticate,
  requireRole('STAFF', 'ADMIN'),
  async (request, response, next) => {
    try {
      const input = generateInvoiceSchema.parse(request.body);
      const invoice = await generateInvoice({
        contractId: input.contractId,
        discountAmount: input.discountAmount,
        issuedBy: request.user!.userId,
      });
      response.status(201).json({ invoice });
    } catch (error) {
      next(error);
    }
  },
);

invoiceRouter.post(
  '/:id/settle',
  authenticate,
  requireRole('STAFF', 'ADMIN'),
  async (request, response, next) => {
    try {
      const input = settleInvoiceSchema.parse(request.body);
      const result = await settleInvoice(String(request.params.id), {
        amount: input.amount,
        method: input.method,
        provider: input.provider,
        idempotencyKey: input.idempotencyKey,
        confirmedBy: request.user!.userId,
      });
      response.json(result);
    } catch (error) {
      next(error);
    }
  },
);
