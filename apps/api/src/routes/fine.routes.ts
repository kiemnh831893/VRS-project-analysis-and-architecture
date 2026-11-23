import { Router } from 'express';
import { z } from 'zod';

import { authenticate, requireRole } from '../middleware/auth.js';
import { assessFine, settleFine } from '../services/fine.service.js';

const assessFineSchema = z.object({
  contractId: z.string().uuid(),
  violationType: z.enum(['LATE_RETURN', 'FUEL_SHORTAGE', 'EXTERIOR_DAMAGE']),
  quantity: z.number().positive().optional(),
  description: z.string().optional(),
  fineRuleId: z.string().uuid().optional(),
});

const settleFineSchema = z.object({
  settlementType: z.enum(['PAYMENT', 'DEPOSIT', 'WAIVER']),
  waiverReason: z.string().optional(),
});

export const fineRouter = Router();

fineRouter.post(
  '/',
  authenticate,
  requireRole('STAFF', 'ADMIN'),
  async (request, response, next) => {
    try {
      const input = assessFineSchema.parse(request.body);
      const fine = await assessFine({ ...input, assessedBy: request.user!.userId });
      response.status(201).json({ fine });
    } catch (error) {
      next(error);
    }
  },
);

fineRouter.post(
  '/:id/settle',
  authenticate,
  requireRole('STAFF', 'ADMIN'),
  async (request, response, next) => {
    try {
      const input = settleFineSchema.parse(request.body);
      const fine = await settleFine(
        String(request.params.id),
        input.settlementType,
        request.user!.userId,
        input.waiverReason,
      );
      response.json({ fine });
    } catch (error) {
      next(error);
    }
  },
);
