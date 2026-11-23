import { prisma } from '../lib/prisma.js';
import { HttpError } from '../lib/httpError.js';

export type CreateVehicleCategoryData = {
  name: string;
  depositRate: number;
  description?: string;
  isActive?: boolean;
};

export type UpdateVehicleCategoryData = Partial<CreateVehicleCategoryData>;

export async function createVehicleCategory(input: CreateVehicleCategoryData) {
  const existing = await prisma.vehicleCategory.findUnique({ where: { name: input.name } });
  if (existing) {
    throw new HttpError(409, 'Category name already exists', 'CATEGORY_NAME_TAKEN');
  }
  return prisma.vehicleCategory.create({
    data: {
      name: input.name,
      depositRate: input.depositRate,
      description: input.description ?? null,
      isActive: input.isActive ?? true,
    },
  });
}

export async function updateVehicleCategory(id: number, input: UpdateVehicleCategoryData) {
  const category = await prisma.vehicleCategory.findUnique({ where: { categoryId: id } });
  if (!category) throw new HttpError(404, 'Vehicle category not found', 'CATEGORY_NOT_FOUND');

  if (input.name && input.name !== category.name) {
    const dup = await prisma.vehicleCategory.findUnique({ where: { name: input.name } });
    if (dup) throw new HttpError(409, 'Category name already exists', 'CATEGORY_NAME_TAKEN');
  }

  return prisma.vehicleCategory.update({
    where: { categoryId: id },
    data: {
      name: input.name,
      depositRate: input.depositRate,
      description: input.description,
      isActive: input.isActive,
    },
  });
}

export async function listVehicleCategories(filters: { isActive?: boolean }) {
  const where: Record<string, unknown> = {};
  if (filters.isActive !== undefined) where.isActive = filters.isActive;
  return prisma.vehicleCategory.findMany({ where, orderBy: { name: 'asc' } });
}

export async function getVehicleCategory(id: number) {
  const category = await prisma.vehicleCategory.findUnique({ where: { categoryId: id } });
  if (!category) throw new HttpError(404, 'Vehicle category not found', 'CATEGORY_NOT_FOUND');
  return category;
}
