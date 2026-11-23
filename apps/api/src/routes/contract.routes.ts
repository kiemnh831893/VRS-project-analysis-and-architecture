import { Router } from 'express';
import { z } from 'zod';

import { authenticate, requireRole } from '../middleware/auth.js';
import {
  createContract,
  findBookingByCode,
  getContract,
  listContracts,
} from '../services/contract.service.js';
import { processReturn } from '../services/return.service.js';
import { getDocumentBuffer } from '../services/document.service.js';
import { toPlain } from '../lib/serialize.js';

const pickupInspectionSchema = z.object({
  mileage: z.number().int().min(0),
  fuelLevelPercent: z.number().int().min(0).max(100),
  condition: z.enum(['INTACT', 'SCRATCHED', 'DAMAGED']),
  notes: z.string().optional(),
  photos: z.array(z.string()).optional(),
});

const createContractSchema = z
  .object({
    bookingId: z.string().uuid().optional(),
    bookingCode: z.string().optional(),
    actualPickupAt: z
      .string()
      .refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid datetime')
      .optional(),
    pickupInspection: pickupInspectionSchema,
  })
  .refine((d) => d.bookingId || d.bookingCode, { message: 'bookingId or bookingCode required' });

const returnSchema = z.object({
  actualReturnAt: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid datetime')
    .optional(),
  returnInspection: z.object({
    mileage: z.number().int().min(0),
    fuelLevelPercent: z.number().int().min(0).max(100),
    condition: z.enum(['INTACT', 'SCRATCHED', 'DAMAGED']),
    notes: z.string().optional(),
    photos: z.array(z.string()).optional(),
  }),
  fuelShortageLitres: z.number().min(0).optional(),
  exteriorDamage: z.boolean().optional(),
  damageDescription: z.string().optional(),
  discountAmount: z.number().min(0).optional(),
});

export const contractRouter = Router();

contractRouter.get(
  '/',
  authenticate,
  requireRole('STAFF', 'ADMIN'),
  async (request, response, next) => {
    try {
      const status = request.query.status ? String(request.query.status) : undefined;
      const customerId = request.query.customerId ? String(request.query.customerId) : undefined;
      const items = await listContracts({ status, customerId });
      response.json({ items });
    } catch (error) {
      next(error);
    }
  },
);

contractRouter.get(
  '/lookup-booking/:code',
  authenticate,
  requireRole('STAFF', 'ADMIN'),
  async (request, response, next) => {
    try {
      const booking = await findBookingByCode(String(request.params.code));
      response.json({ booking });
    } catch (error) {
      next(error);
    }
  },
);

contractRouter.get('/:id', authenticate, async (request, response, next) => {
  try {
    const contract = await getContract(
      String(request.params.id),
      request.user!.userId,
      request.user!.role,
    );
    response.json({ contract: toPlain(contract) });
  } catch (error) {
    next(error);
  }
});

contractRouter.post(
  '/',
  authenticate,
  requireRole('STAFF', 'ADMIN'),
  async (request, response, next) => {
    try {
      const input = createContractSchema.parse(request.body);
      const contract = await createContract({ ...input, staffHandoverId: request.user!.userId });
      response.status(201).json({ contract });
    } catch (error) {
      next(error);
    }
  },
);

contractRouter.post(
  '/:id/return',
  authenticate,
  requireRole('STAFF', 'ADMIN'),
  async (request, response, next) => {
    try {
      const input = returnSchema.parse(request.body);
      const contract = await processReturn({
        contractId: String(request.params.id),
        staffReturnId: request.user!.userId,
        actualReturnAt: input.actualReturnAt,
        returnInspection: input.returnInspection,
        fuelShortageLitres: input.fuelShortageLitres,
        exteriorDamage: input.exteriorDamage,
        damageDescription: input.damageDescription,
        discountAmount: input.discountAmount,
      });
      response.json({ contract: toPlain(contract) });
    } catch (error) {
      next(error);
    }
  },
);

contractRouter.get(
  '/:id/documents/:documentId/download',
  authenticate,
  async (request, response, next) => {
    try {
      const { buffer, document } = await getDocumentBuffer(
        String(request.params.id),
        String(request.params.documentId),
        request.user!.userId,
        request.user!.role,
      );
      const doc = document as { mimeType: string; storageKey: string };
      response.setHeader('Content-Type', doc.mimeType);
      response.setHeader(
        'Content-Disposition',
        `attachment; filename="${doc.storageKey.split('/').pop()}"`,
      );
      response.setHeader('Content-Length', buffer.length);
      response.send(buffer);
    } catch (error) {
      next(error);
    }
  },
);
