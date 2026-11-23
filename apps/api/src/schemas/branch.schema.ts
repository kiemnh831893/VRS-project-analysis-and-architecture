import { z } from 'zod';

export const createBranchSchema = z.object({
  code: z.string().trim().min(1).max(20),
  name: z.string().trim().min(1).max(100),
  address: z.string().trim().min(1),
  phone: z.string().trim().max(20).optional(),
  email: z.string().trim().email().max(254).optional(),
  openingTime: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/)
    .optional(),
  closingTime: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/)
    .optional(),
  timezone: z.string().trim().max(50).optional(),
});

export const updateBranchSchema = createBranchSchema.partial().extend({
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const branchStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE']),
});
