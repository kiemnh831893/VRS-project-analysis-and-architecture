import { z } from 'zod';

export const createStaffSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(8).max(20),
  nationalId: z.string().trim().min(5).max(20),
  password: z.string().min(8).max(128),
  employeeCode: z.string().trim().min(1).max(20),
  branchId: z.string().uuid(),
  address: z.string().trim().max(500).optional(),
});

export const updateStaffSchema = z.object({
  fullName: z.string().trim().min(2).max(100).optional(),
  email: z.string().trim().email().max(254).optional(),
  phone: z.string().trim().min(8).max(20).optional(),
  nationalId: z.string().trim().min(5).max(20).optional(),
  employeeCode: z.string().trim().min(1).max(20).optional(),
  branchId: z.string().uuid().optional(),
  address: z.string().trim().max(500).optional(),
});

export const userStatusSchema = z.object({
  accountStatus: z.enum(['ACTIVE', 'LOCKED']),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
