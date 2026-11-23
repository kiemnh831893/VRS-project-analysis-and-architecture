import { z } from 'zod';

export const createFineRuleSchema = z.object({
  code: z.string().trim().min(1).max(30),
  name: z.string().trim().min(1).max(100),
  violationType: z.enum([
    'LATE_RETURN',
    'FUEL_SHORTAGE',
    'EXTERIOR_DAMAGE',
    'INTERIOR_DAMAGE',
    'CLEANING',
    'OTHER',
  ]),
  calculationMethod: z.enum(['FIXED', 'PER_HOUR', 'PER_DAY', 'PER_LITER', 'PER_PERCENT']),
  rateAmount: z.number().min(0),
  unitLabel: z.string().trim().max(20).optional(),
  graceMinutes: z.number().int().min(0).optional(),
  maxAmount: z.number().min(0).optional().nullable(),
  isActive: z.boolean().optional(),
  effectiveFrom: z.string().optional(),
  effectiveTo: z.string().optional().nullable(),
});

export const updateFineRuleSchema = createFineRuleSchema.partial();
