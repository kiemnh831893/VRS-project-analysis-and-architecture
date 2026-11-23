import { z } from 'zod';

export const createBookingSchema = z.object({
  vehicleId: z.string().uuid(),
  pickupDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expectedReturnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  pickupBranchId: z.string().uuid().optional(),
  returnBranchId: z.string().uuid().optional(),
  insurancePackageId: z.string().uuid().nullable().optional(),
});
