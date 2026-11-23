import { z } from 'zod';

export const createVehicleCategorySchema = z.object({
  name: z.string().trim().min(1).max(50),
  depositRate: z.number().min(0).max(100),
  description: z.string().trim().max(2000).optional(),
  isActive: z.boolean().optional(),
});

export const updateVehicleCategorySchema = createVehicleCategorySchema.partial();
