import { prisma } from '../lib/prisma.js';
import { HttpError } from '../lib/httpError.js';
import { hashPassword } from './auth.service.js';
import type { CreateStaffInput, UpdateStaffInput } from '../schemas/user.schema.js';

// Never expose passwordHash or authentication internals through the staff API.
const staffSelect = {
  userId: true,
  fullName: true,
  email: true,
  phone: true,
  nationalId: true,
  role: true,
  accountStatus: true,
  address: true,
  createdAt: true,
  rentalStaff: { include: { branch: true } },
} as const;

export async function listStaff() {
  return prisma.user.findMany({
    where: { role: 'STAFF' },
    select: staffSelect,
    orderBy: { createdAt: 'desc' },
  });
}

export async function getStaff(id: string) {
  const user = await prisma.user.findUnique({
    where: { userId: id },
    select: staffSelect,
  });
  if (!user || user.role !== 'STAFF')
    throw new HttpError(404, 'Staff not found', 'STAFF_NOT_FOUND');
  return user;
}

export async function createStaff(input: CreateStaffInput) {
  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { equals: input.email, mode: 'insensitive' } },
        { phone: input.phone },
        { nationalId: input.nationalId },
      ],
    },
  });
  if (existing) throw new HttpError(409, 'User already exists', 'USER_EXISTS');

  const branch = await prisma.branch.findUnique({ where: { branchId: input.branchId } });
  if (!branch) throw new HttpError(404, 'Branch not found', 'BRANCH_NOT_FOUND');

  const dupCode = await prisma.rentalStaff.findUnique({
    where: { employeeCode: input.employeeCode },
  });
  if (dupCode) throw new HttpError(409, 'Employee code already exists', 'EMPLOYEE_CODE_TAKEN');

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      fullName: input.fullName,
      email: input.email.trim().toLowerCase(),
      phone: input.phone,
      nationalId: input.nationalId,
      passwordHash,
      role: 'STAFF',
      address: input.address ?? null,
      rentalStaff: { create: { employeeCode: input.employeeCode, branchId: input.branchId } },
    },
    select: staffSelect,
  });
  return user;
}

export async function updateStaff(id: string, input: UpdateStaffInput) {
  const user = await prisma.user.findUnique({
    where: { userId: id },
    include: { rentalStaff: true },
  });
  if (!user || user.role !== 'STAFF')
    throw new HttpError(404, 'Staff not found', 'STAFF_NOT_FOUND');

  if (input.email && input.email.toLowerCase() !== user.email.toLowerCase()) {
    const dup = await prisma.user.findFirst({
      where: { email: { equals: input.email, mode: 'insensitive' }, userId: { not: id } },
    });
    if (dup) throw new HttpError(409, 'Email already in use', 'EMAIL_TAKEN');
  }
  if (input.phone && input.phone !== user.phone) {
    const dup = await prisma.user.findFirst({ where: { phone: input.phone, userId: { not: id } } });
    if (dup) throw new HttpError(409, 'Phone already in use', 'PHONE_TAKEN');
  }
  if (input.nationalId && input.nationalId !== user.nationalId) {
    const dup = await prisma.user.findFirst({
      where: { nationalId: input.nationalId, userId: { not: id } },
    });
    if (dup) throw new HttpError(409, 'National ID already in use', 'NATIONAL_ID_TAKEN');
  }
  if (input.employeeCode && input.employeeCode !== user.rentalStaff?.employeeCode) {
    const dup = await prisma.rentalStaff.findUnique({
      where: { employeeCode: input.employeeCode },
    });
    if (dup) throw new HttpError(409, 'Employee code already in use', 'EMPLOYEE_CODE_TAKEN');
  }
  if (input.branchId) {
    const branch = await prisma.branch.findUnique({ where: { branchId: input.branchId } });
    if (!branch) throw new HttpError(404, 'Branch not found', 'BRANCH_NOT_FOUND');
  }

  const userData: Record<string, unknown> = {};
  if (input.fullName !== undefined) userData.fullName = input.fullName;
  if (input.email !== undefined) userData.email = input.email.trim().toLowerCase();
  if (input.phone !== undefined) userData.phone = input.phone;
  if (input.nationalId !== undefined) userData.nationalId = input.nationalId;
  if (input.address !== undefined) userData.address = input.address;

  const staffData: Record<string, unknown> = {};
  if (input.employeeCode !== undefined) staffData.employeeCode = input.employeeCode;
  if (input.branchId !== undefined) staffData.branchId = input.branchId;

  return prisma.user.update({
    where: { userId: id },
    data: {
      ...userData,
      ...(Object.keys(staffData).length ? { rentalStaff: { update: staffData } } : {}),
    },
    select: staffSelect,
  });
}

export async function setAccountStatus(id: string, status: 'ACTIVE' | 'LOCKED', actorId: string) {
  const user = await prisma.user.findUnique({ where: { userId: id } });
  if (!user) throw new HttpError(404, 'User not found', 'USER_NOT_FOUND');
  if (user.role === 'ADMIN')
    throw new HttpError(400, 'Cannot lock admin accounts', 'CANNOT_LOCK_ADMIN');

  const updated = await prisma.user.update({
    where: { userId: id },
    data: { accountStatus: status },
    select: { userId: true, accountStatus: true },
  });
  await prisma.auditLog.create({
    data: {
      actorUserId: actorId,
      actorRole: 'ADMIN',
      action: status === 'LOCKED' ? 'ACCOUNT_LOCKED' : 'ACCOUNT_UNLOCKED',
      entityType: 'users',
      entityId: id,
      outcome: 'SUCCESS',
    },
  });
  return updated;
}
