import { prisma } from '../lib/prisma.js';
import { HttpError } from '../lib/httpError.js';

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  AVAILABLE: ['RENTED', 'MAINTENANCE', 'RETIRED'],
  RENTED: ['AVAILABLE', 'MAINTENANCE'],
  MAINTENANCE: ['AVAILABLE', 'RETIRED'],
  RETIRED: [],
};

export type CreateVehicleData = {
  categoryId: number;
  branchId: string;
  parkingLocationId?: string | null;
  licensePlate: string;
  vin?: string | null;
  brand: string;
  model: string;
  manufactureYear: number;
  transmission: 'AUTO' | 'MANUAL';
  fuelType: 'PETROL' | 'DIESEL' | 'ELECTRIC' | 'HYBRID';
  seats: number;
  dailyRate: number;
  currentMileage?: number;
};

export type UpdateVehicleData = Partial<CreateVehicleData> & { status?: string };

function mapPrismaError(err: unknown): never {
  const e = err as { code?: string; meta?: { target?: string[] } };
  if (e?.code === 'P2002') {
    throw new HttpError(409, 'License plate or VIN already exists', 'DUPLICATE_VEHICLE');
  }
  throw err as Error;
}

export async function createVehicle(input: CreateVehicleData) {
  const category = await prisma.vehicleCategory.findUnique({
    where: { categoryId: input.categoryId },
  });
  if (!category) throw new HttpError(404, 'Vehicle category not found', 'CATEGORY_NOT_FOUND');

  const branch = await prisma.branch.findUnique({ where: { branchId: input.branchId } });
  if (!branch) throw new HttpError(404, 'Branch not found', 'BRANCH_NOT_FOUND');

  if (input.parkingLocationId) {
    const pl = await prisma.parkingLocation.findUnique({
      where: { parkingLocationId: input.parkingLocationId },
    });
    if (!pl || pl.branchId !== input.branchId) {
      throw new HttpError(
        400,
        'Parking location does not belong to the branch',
        'INVALID_PARKING_LOCATION',
      );
    }
  }

  try {
    return await prisma.vehicle.create({
      data: {
        categoryId: input.categoryId,
        branchId: input.branchId,
        parkingLocationId: input.parkingLocationId ?? null,
        licensePlate: input.licensePlate,
        vin: input.vin ?? null,
        brand: input.brand,
        model: input.model,
        manufactureYear: input.manufactureYear,
        transmission: input.transmission,
        fuelType: input.fuelType,
        seats: input.seats,
        dailyRate: input.dailyRate,
        currentMileage: input.currentMileage ?? 0,
      },
    });
  } catch (err) {
    mapPrismaError(err);
  }
}

export async function updateVehicle(id: string, input: UpdateVehicleData) {
  const vehicle = await prisma.vehicle.findUnique({ where: { vehicleId: id } });
  if (!vehicle) throw new HttpError(404, 'Vehicle not found', 'VEHICLE_NOT_FOUND');

  if (input.categoryId !== undefined) {
    const c = await prisma.vehicleCategory.findUnique({ where: { categoryId: input.categoryId } });
    if (!c) throw new HttpError(404, 'Vehicle category not found', 'CATEGORY_NOT_FOUND');
  }
  if (input.branchId !== undefined) {
    const b = await prisma.branch.findUnique({ where: { branchId: input.branchId } });
    if (!b) throw new HttpError(404, 'Branch not found', 'BRANCH_NOT_FOUND');
  }
  const branchId = input.branchId ?? vehicle.branchId;
  if (input.parkingLocationId) {
    const pl = await prisma.parkingLocation.findUnique({
      where: { parkingLocationId: input.parkingLocationId },
    });
    if (!pl || pl.branchId !== branchId) {
      throw new HttpError(
        400,
        'Parking location does not belong to the branch',
        'INVALID_PARKING_LOCATION',
      );
    }
  }

  const data: Record<string, unknown> = {};
  if (input.categoryId !== undefined) data.categoryId = input.categoryId;
  if (input.branchId !== undefined) data.branchId = input.branchId;
  if (input.parkingLocationId !== undefined) data.parkingLocationId = input.parkingLocationId;
  if (input.licensePlate !== undefined) data.licensePlate = input.licensePlate;
  if (input.vin !== undefined) data.vin = input.vin;
  if (input.brand !== undefined) data.brand = input.brand;
  if (input.model !== undefined) data.model = input.model;
  if (input.manufactureYear !== undefined) data.manufactureYear = input.manufactureYear;
  if (input.transmission !== undefined) data.transmission = input.transmission;
  if (input.fuelType !== undefined) data.fuelType = input.fuelType;
  if (input.seats !== undefined) data.seats = input.seats;
  if (input.dailyRate !== undefined) data.dailyRate = input.dailyRate;
  if (input.currentMileage !== undefined) data.currentMileage = input.currentMileage;
  if (input.status !== undefined) {
    const allowed = ALLOWED_TRANSITIONS[vehicle.status] ?? [];
    if (!allowed.includes(input.status as never)) {
      throw new HttpError(
        400,
        `Cannot transition vehicle from ${vehicle.status} to ${input.status}`,
        'INVALID_STATUS_TRANSITION',
      );
    }
    data.status = input.status;
    if (input.status === 'RETIRED') data.retiredAt = new Date();
    else if (vehicle.retiredAt) data.retiredAt = null;
  }

  try {
    return await prisma.vehicle.update({ where: { vehicleId: id }, data });
  } catch (err) {
    mapPrismaError(err);
  }
}

export async function getVehicle(id: string) {
  const vehicle = await prisma.vehicle.findUnique({
    where: { vehicleId: id },
    include: { category: true, branch: true, parkingLocation: true, images: true },
  });
  if (!vehicle) throw new HttpError(404, 'Vehicle not found', 'VEHICLE_NOT_FOUND');
  return vehicle;
}

export async function setVehicleStatus(id: string, status: string) {
  const vehicle = await prisma.vehicle.findUnique({ where: { vehicleId: id } });
  if (!vehicle) throw new HttpError(404, 'Vehicle not found', 'VEHICLE_NOT_FOUND');

  const allowed = ALLOWED_TRANSITIONS[vehicle.status] ?? [];
  if (!allowed.includes(status as never)) {
    throw new HttpError(
      400,
      `Cannot transition vehicle from ${vehicle.status} to ${status}`,
      'INVALID_STATUS_TRANSITION',
    );
  }

  const data: Record<string, unknown> = { status };
  if (status === 'RETIRED') data.retiredAt = new Date();
  if (status !== 'RETIRED' && vehicle.retiredAt) data.retiredAt = null;

  return prisma.vehicle.update({ where: { vehicleId: id }, data });
}

export async function listVehicles(filters: {
  categoryId?: number;
  branchId?: string;
  status?: string;
  brand?: string;
  transmission?: string;
  minSeats?: number;
  maxDailyRate?: number;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const where: Record<string, unknown> = {};
  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.branchId) where.branchId = filters.branchId;
  if (filters.status) where.status = filters.status;
  if (filters.brand) where.brand = { contains: filters.brand, mode: 'insensitive' };
  if (filters.search) {
    where.OR = [
      { brand: { contains: filters.search, mode: 'insensitive' } },
      { model: { contains: filters.search, mode: 'insensitive' } },
      { licensePlate: { contains: filters.search, mode: 'insensitive' } },
    ];
  }
  if (filters.transmission) where.transmission = filters.transmission;
  if (filters.minSeats) where.seats = { gte: filters.minSeats };
  if (filters.maxDailyRate) where.dailyRate = { lte: filters.maxDailyRate };

  const orderBy: Record<string, 'asc' | 'desc'> = {};
  const sortField = filters.sortBy ?? 'createdAt';
  orderBy[sortField] = filters.sortOrder ?? 'desc';

  const [items, total] = await Promise.all([
    prisma.vehicle.findMany({
      where,
      include: { category: true, branch: true, parkingLocation: true },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.vehicle.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

export async function searchCatalog(filters: {
  categoryId?: number;
  brand?: string;
  search?: string;
  transmission?: 'AUTO' | 'MANUAL';
  minSeats?: number;
  maxDailyRate?: number;
  status?: string;
  pickupDate?: string;
  expectedReturnDate?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;

  const where: Record<string, unknown> = {};
  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.brand) where.brand = { contains: filters.brand, mode: 'insensitive' };
  if (filters.search) {
    where.OR = [
      { brand: { contains: filters.search, mode: 'insensitive' } },
      { model: { contains: filters.search, mode: 'insensitive' } },
      { licensePlate: { contains: filters.search, mode: 'insensitive' } },
    ];
  }
  if (filters.transmission) where.transmission = filters.transmission;
  if (filters.minSeats) where.seats = { gte: filters.minSeats };
  if (filters.maxDailyRate) where.dailyRate = { lte: filters.maxDailyRate };
  if (filters.status) where.status = filters.status;

  const vehicles = await prisma.vehicle.findMany({
    where,
    include: {
      category: true,
      branch: true,
      parkingLocation: true,
      bookings: {
        where: {
          availabilityReleasedAt: null,
          OR: [
            { bookingStatus: 'PENDING_PAYMENT', holdExpiresAt: { gt: new Date() } },
            { bookingStatus: { in: ['CONFIRMED', 'CONVERTED_TO_CONTRACT'] } },
          ],
        },
        select: { pickupDate: true, expectedReturnDate: true },
      },
    },
  });

  let filtered = vehicles;
  if (filters.pickupDate && filters.expectedReturnDate) {
    const start = new Date(filters.pickupDate);
    const end = new Date(filters.expectedReturnDate);
    filtered = vehicles.filter((v) => {
      return !v.bookings.some((b) => b.pickupDate < end && b.expectedReturnDate > start);
    });
  }

  const sortField = filters.sortBy ?? 'createdAt';
  const sortOrder = filters.sortOrder ?? 'desc';
  filtered.sort((a, b) => {
    const av = (a as Record<string, unknown>)[sortField];
    const bv = (b as Record<string, unknown>)[sortField];
    if (av === bv) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    const cmp = av < bv ? -1 : 1;
    return sortOrder === 'asc' ? cmp : -cmp;
  });

  const total = filtered.length;
  const items = filtered.slice((page - 1) * pageSize, page * pageSize);

  return { items, total, page, pageSize };
}
