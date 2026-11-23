import { prisma } from '../lib/prisma.js';
import { HttpError } from '../lib/httpError.js';

export interface CreateInspectionInput {
  contractId: string;
  inspectionType: 'PICKUP' | 'RETURN';
  mileage: number;
  fuelLevelPercent: number;
  condition: 'INTACT' | 'SCRATCHED' | 'DAMAGED';
  notes?: string;
  inspectedBy: string;
  inspectedAt?: string;
  photos?: string[];
}

export async function createInspection(input: CreateInspectionInput) {
  const contract = await prisma.rentalContract.findUnique({
    where: { contractId: input.contractId },
  });
  if (!contract) throw new HttpError(404, 'Contract not found', 'CONTRACT_NOT_FOUND');

  const existing = await prisma.vehicleInspection.findUnique({
    where: {
      contractId_inspectionType: {
        contractId: input.contractId,
        inspectionType: input.inspectionType,
      },
    },
  });
  if (existing) {
    throw new HttpError(409, 'Inspection already recorded', 'INSPECTION_EXISTS');
  }

  if (input.inspectionType === 'RETURN') {
    const pickup = await prisma.vehicleInspection.findUnique({
      where: {
        contractId_inspectionType: { contractId: input.contractId, inspectionType: 'PICKUP' },
      },
    });
    if (!pickup)
      throw new HttpError(400, 'Pickup inspection must exist first', 'PICKUP_INSPECTION_MISSING');
    if (input.mileage < pickup.mileage) {
      throw new HttpError(
        400,
        'Return mileage cannot be less than pickup mileage',
        'INVALID_MILEAGE',
      );
    }
  }

  const inspection = await prisma.vehicleInspection.create({
    data: {
      contractId: input.contractId,
      inspectionType: input.inspectionType,
      mileage: input.mileage,
      fuelLevelPercent: input.fuelLevelPercent,
      condition: input.condition,
      notes: input.notes ?? null,
      inspectedById: input.inspectedBy,
      inspectedAt: input.inspectedAt ? new Date(input.inspectedAt) : new Date(),
      photos: input.photos
        ? {
            create: input.photos.map((key, idx) => ({ storageKey: key, sortOrder: idx })),
          }
        : undefined,
    },
    include: { photos: true },
  });

  return inspection;
}

export async function getPickupInspection(contractId: string) {
  return prisma.vehicleInspection.findUnique({
    where: { contractId_inspectionType: { contractId, inspectionType: 'PICKUP' } },
    include: { photos: true },
  });
}
