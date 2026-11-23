import { Router } from 'express';
import { z } from 'zod';

import { authenticate, requireRole } from '../middleware/auth.js';
import { createInspection } from '../services/inspection.service.js';

const inspectionSchema = z.object({
  contractId: z.string().uuid(),
  inspectionType: z.enum(['PICKUP', 'RETURN']),
  mileage: z.number().int().min(0),
  fuelLevelPercent: z.number().int().min(0).max(100),
  condition: z.enum(['INTACT', 'SCRATCHED', 'DAMAGED']),
  notes: z.string().optional(),
  inspectedAt: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid datetime')
    .optional(),
  photos: z.array(z.string()).optional(),
});

export const inspectionRouter = Router();

inspectionRouter.post(
  '/',
  authenticate,
  requireRole('STAFF', 'ADMIN'),
  async (request, response, next) => {
    try {
      const input = inspectionSchema.parse(request.body);
      const inspection = await createInspection({
        contractId: input.contractId,
        inspectionType: input.inspectionType,
        mileage: input.mileage,
        fuelLevelPercent: input.fuelLevelPercent,
        condition: input.condition,
        notes: input.notes,
        inspectedBy: request.user!.userId,
        inspectedAt: input.inspectedAt,
        photos: input.photos,
      });
      response.status(201).json({ inspection });
    } catch (error) {
      next(error);
    }
  },
);
