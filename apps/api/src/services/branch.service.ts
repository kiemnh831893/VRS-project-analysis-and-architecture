import { prisma } from '../lib/prisma.js';
import { HttpError } from '../lib/httpError.js';

// Re-export inferred types via zod would be better; keep simple manual types.
export type CreateBranchData = {
  code: string;
  name: string;
  address: string;
  phone?: string;
  email?: string;
  openingTime?: string;
  closingTime?: string;
  timezone?: string;
};

export type UpdateBranchData = Partial<CreateBranchData> & { status?: 'ACTIVE' | 'INACTIVE' };

function toTime(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  // Store as a Date on 1970-01-01 so Prisma can write to a time column.
  const [h, m, s] = value.split(':').map((x) => Number(x));
  const d = new Date(Date.UTC(1970, 0, 1, h ?? 0, m ?? 0, s ?? 0));
  return d;
}

export async function createBranch(input: CreateBranchData) {
  const existing = await prisma.branch.findUnique({ where: { code: input.code } });
  if (existing) {
    throw new HttpError(409, 'Branch code already exists', 'BRANCH_CODE_TAKEN');
  }

  return prisma.branch.create({
    data: {
      code: input.code,
      name: input.name,
      address: input.address,
      phone: input.phone ?? null,
      email: input.email ?? null,
      openingTime: toTime(input.openingTime),
      closingTime: toTime(input.closingTime),
      timezone: input.timezone ?? 'Asia/Ho_Chi_Minh',
    },
  });
}

export async function updateBranch(id: string, input: UpdateBranchData) {
  const branch = await prisma.branch.findUnique({ where: { branchId: id } });
  if (!branch) throw new HttpError(404, 'Branch not found', 'BRANCH_NOT_FOUND');

  const data: Record<string, unknown> = {};
  if (input.code !== undefined) data.code = input.code;
  if (input.name !== undefined) data.name = input.name;
  if (input.address !== undefined) data.address = input.address;
  if (input.phone !== undefined) data.phone = input.phone;
  if (input.email !== undefined) data.email = input.email;
  if (input.openingTime !== undefined) data.openingTime = toTime(input.openingTime);
  if (input.closingTime !== undefined) data.closingTime = toTime(input.closingTime);
  if (input.timezone !== undefined) data.timezone = input.timezone;
  if (input.status !== undefined) data.status = input.status;

  if (input.code && input.code !== branch.code) {
    const dup = await prisma.branch.findUnique({ where: { code: input.code } });
    if (dup) throw new HttpError(409, 'Branch code already exists', 'BRANCH_CODE_TAKEN');
  }

  return prisma.branch.update({ where: { branchId: id }, data });
}

export async function listBranches(filters: { status?: 'ACTIVE' | 'INACTIVE'; search?: string }) {
  const where: Record<string, unknown> = {};
  if (filters.status) where.status = filters.status;
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { code: { contains: filters.search, mode: 'insensitive' } },
    ];
  }
  return prisma.branch.findMany({ where, orderBy: { name: 'asc' } });
}

export async function getBranch(id: string) {
  const branch = await prisma.branch.findUnique({
    where: { branchId: id },
    include: {
      parkingLocations: true,
      staffProfiles: { include: { user: { select: { fullName: true, email: true } } } },
    },
  });
  if (!branch) throw new HttpError(404, 'Branch not found', 'BRANCH_NOT_FOUND');
  return branch;
}

export async function setBranchStatus(id: string, status: 'ACTIVE' | 'INACTIVE') {
  const branch = await prisma.branch.findUnique({ where: { branchId: id } });
  if (!branch) throw new HttpError(404, 'Branch not found', 'BRANCH_NOT_FOUND');
  return prisma.branch.update({ where: { branchId: id }, data: { status } });
}
