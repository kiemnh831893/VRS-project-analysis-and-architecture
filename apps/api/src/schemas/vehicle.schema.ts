import { z } from 'zod';

const vehicleStatusEnum = z.enum(['AVAILABLE', 'RENTED', 'MAINTENANCE', 'RETIRED']);

export const createVehicleSchema = z.object({
  categoryId: z.number().int().positive(),
  branchId: z.string().uuid(),
  parkingLocationId: z.string().uuid().nullable().optional(),
  licensePlate: z.string().trim().min(1).max(20),
  vin: z.string().trim().length(17).nullable().optional(),
  brand: z.string().trim().min(1).max(50),
  model: z.string().trim().min(1).max(50),
  manufactureYear: z.number().int().min(1900).max(2100),
  transmission: z.enum(['AUTO', 'MANUAL']),
  fuelType: z.enum(['PETROL', 'DIESEL', 'ELECTRIC', 'HYBRID']),
  seats: z.number().int().positive(),
  dailyRate: z.number().positive(),
  currentMileage: z.number().int().min(0).optional(),
});

export const updateVehicleSchema = createVehicleSchema.partial().extend({
  status: vehicleStatusEnum.optional(),
});

export const vehicleStatusSchema = z.object({
  status: vehicleStatusEnum,
});

export const vehicleCatalogQuerySchema = z.object({
  categoryId: z.coerce.number().int().positive().optional(),
  brand: z.string().trim().optional(),
  search: z.string().trim().optional(),
  transmission: z.enum(['AUTO', 'MANUAL']).optional(),
  minSeats: z.coerce.number().int().positive().optional(),
  maxDailyRate: z.coerce.number().positive().optional(),
  status: vehicleStatusEnum.optional(),
  pickupDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  expectedReturnDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['dailyRate', 'brand', 'createdAt', 'manufactureYear']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
