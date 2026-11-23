import crypto from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../lib/httpError.js';
import { generateAndStoreDocument } from './document.service.js';

// Customer profile fields needed by operational screens; never return license images/numbers.
const safeCustomerSelect = {
  userId: true,
  licenseStatus: true,
  user: { select: { fullName: true, email: true, phone: true } },
} as const;

function generateContractNumber(): string {
  return `CT-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

export interface PickupInspectionInput {
  mileage: number;
  fuelLevelPercent: number;
  condition: 'INTACT' | 'SCRATCHED' | 'DAMAGED';
  notes?: string;
  photos?: string[];
}

export interface CreateContractInput {
  bookingId?: string;
  bookingCode?: string;
  staffHandoverId: string;
  actualPickupAt?: string;
  pickupInspection: PickupInspectionInput;
}

export async function findBookingByCode(code: string) {
  const booking = await prisma.booking.findUnique({
    where: { bookingCode: code },
    include: {
      customer: { select: safeCustomerSelect },
      vehicle: { include: { category: true, branch: true } },
    },
  });
  if (!booking) throw new HttpError(404, 'Booking not found', 'BOOKING_NOT_FOUND');
  return booking;
}

export async function createContract(input: CreateContractInput) {
  let booking;
  if (input.bookingId) {
    booking = await prisma.booking.findUnique({
      where: { bookingId: input.bookingId },
      include: {
        customer: { select: safeCustomerSelect },
        vehicle: { include: { category: true, branch: true } },
      },
    });
  } else if (input.bookingCode) {
    booking = await findBookingByCode(input.bookingCode);
  }
  if (!booking) throw new HttpError(404, 'Booking not found', 'BOOKING_NOT_FOUND');

  const existing = await prisma.rentalContract.findUnique({
    where: { bookingId: booking.bookingId },
  });
  if (existing) {
    throw new HttpError(409, 'Contract already exists for this booking', 'CONTRACT_EXISTS');
  }

  if (booking.bookingStatus !== 'CONFIRMED') {
    throw new HttpError(400, 'Booking must be confirmed before handover', 'BOOKING_NOT_CONFIRMED');
  }

  const actualPickupAt = input.actualPickupAt ? new Date(input.actualPickupAt) : new Date();

  const contract = await prisma.$transaction(async (tx) => {
    const newContract = await tx.rentalContract.create({
      data: {
        contractNumber: generateContractNumber(),
        bookingId: booking!.bookingId,
        staffHandoverId: input.staffHandoverId,
        actualPickupAt,
        expectedReturnDate: booking!.expectedReturnDate,
        contractStatus: 'ACTIVE',
      },
    });

    await tx.vehicleInspection.create({
      data: {
        contractId: newContract.contractId,
        inspectionType: 'PICKUP',
        mileage: input.pickupInspection.mileage,
        fuelLevelPercent: input.pickupInspection.fuelLevelPercent,
        condition: input.pickupInspection.condition,
        notes: input.pickupInspection.notes ?? null,
        inspectedById: input.staffHandoverId,
        inspectedAt: actualPickupAt,
        photos: input.pickupInspection.photos
          ? {
              create: input.pickupInspection.photos.map((k, i) => ({
                storageKey: k,
                sortOrder: i,
              })),
            }
          : undefined,
      },
    });

    await tx.booking.update({
      where: { bookingId: booking!.bookingId },
      data: { bookingStatus: 'CONVERTED_TO_CONTRACT', convertedAt: new Date() },
    });

    await tx.vehicle.update({
      where: { vehicleId: booking!.vehicleId },
      data: { status: 'RENTED' },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: input.staffHandoverId,
        actorRole: 'STAFF',
        action: 'CONTRACT_CREATED',
        entityType: 'rental_contracts',
        entityId: newContract.contractId,
        outcome: 'SUCCESS',
      },
    });

    return newContract;
  });

  // Generate contract PDF metadata (outside transaction; failure shouldn't roll back handover).
  try {
    await generateAndStoreDocument(contract.contractId, 'RENTAL_CONTRACT', input.staffHandoverId);
  } catch {
    // Non-fatal: document can be regenerated.
  }

  const full = await prisma.rentalContract.findUnique({
    where: { contractId: contract.contractId },
    include: {
      booking: {
        include: {
          customer: { select: safeCustomerSelect },
          vehicle: { include: { category: true, branch: true } },
        },
      },
      inspections: { include: { photos: true } },
      documents: true,
    },
  });

  return full!;
}

export async function getContract(
  id: string,
  requesterId: string,
  requesterRole: 'CUSTOMER' | 'STAFF' | 'ADMIN',
) {
  const contract = await prisma.rentalContract.findUnique({
    where: { contractId: id },
    include: {
      booking: {
        include: {
          customer: { select: safeCustomerSelect },
          vehicle: { include: { category: true, branch: true } },
        },
      },
      inspections: { include: { photos: true } },
      extensionRequests: true,
      fines: { include: { fineRule: true } },
      invoice: { include: { lines: true } },
      documents: true,
    },
  });
  if (!contract) throw new HttpError(404, 'Contract not found', 'CONTRACT_NOT_FOUND');
  if (requesterRole === 'CUSTOMER' && contract.booking.customerId !== requesterId) {
    throw new HttpError(403, 'Forbidden', 'FORBIDDEN');
  }
  return contract;
}

export async function listContracts(filters: { status?: string; customerId?: string }) {
  const where: Record<string, unknown> = {};
  if (filters.status) where.contractStatus = filters.status;
  if (filters.customerId) where.booking = { customerId: filters.customerId };
  return prisma.rentalContract.findMany({
    where,
    include: {
      booking: {
        include: {
          customer: { select: safeCustomerSelect },
          vehicle: { select: { brand: true, model: true, licensePlate: true } },
        },
      },
      inspections: {
        select: { inspectionType: true, mileage: true, fuelLevelPercent: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}
