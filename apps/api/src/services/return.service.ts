import { prisma } from '../lib/prisma.js';
import { HttpError } from '../lib/httpError.js';
import { assessFine } from './fine.service.js';
import { generateInvoice } from './invoice.service.js';
import { generateAndStoreDocument } from './document.service.js';

export interface ProcessReturnInput {
  contractId: string;
  staffReturnId: string;
  actualReturnAt?: string;
  returnInspection: {
    mileage: number;
    fuelLevelPercent: number;
    condition: 'INTACT' | 'SCRATCHED' | 'DAMAGED';
    notes?: string;
    photos?: string[];
  };
  fuelShortageLitres?: number;
  exteriorDamage?: boolean;
  damageDescription?: string;
  discountAmount?: number;
}

export async function processReturn(input: ProcessReturnInput) {
  const contract = await prisma.rentalContract.findUnique({
    where: { contractId: input.contractId },
    include: {
      booking: { include: { vehicle: { include: { category: true, branch: true } } } },
      inspections: true,
    },
  });
  if (!contract) throw new HttpError(404, 'Contract not found', 'CONTRACT_NOT_FOUND');
  if (contract.contractStatus === 'COMPLETED') {
    throw new HttpError(400, 'Contract already completed', 'CONTRACT_COMPLETED');
  }

  const pickupInspection = contract.inspections.find((i) => i.inspectionType === 'PICKUP');
  if (!pickupInspection)
    throw new HttpError(400, 'Pickup inspection missing', 'PICKUP_INSPECTION_MISSING');

  if (input.returnInspection.mileage < pickupInspection.mileage) {
    throw new HttpError(
      400,
      'Return mileage cannot be less than pickup mileage',
      'INVALID_MILEAGE',
    );
  }

  const actualReturnAt = input.actualReturnAt ? new Date(input.actualReturnAt) : new Date();

  // Create return inspection.
  await prisma.vehicleInspection.create({
    data: {
      contractId: input.contractId,
      inspectionType: 'RETURN',
      mileage: input.returnInspection.mileage,
      fuelLevelPercent: input.returnInspection.fuelLevelPercent,
      condition: input.returnInspection.condition,
      notes: input.returnInspection.notes ?? null,
      inspectedById: input.staffReturnId,
      inspectedAt: actualReturnAt,
      photos: input.returnInspection.photos
        ? { create: input.returnInspection.photos.map((k, i) => ({ storageKey: k, sortOrder: i })) }
        : undefined,
    },
  });

  // Update contract.
  await prisma.rentalContract.update({
    where: { contractId: input.contractId },
    data: {
      actualReturnAt,
      contractStatus: 'COMPLETED',
      completedAt: new Date(),
      staffReturnId: input.staffReturnId,
    },
  });

  // Release booking availability.
  await prisma.booking.update({
    where: { bookingId: contract.bookingId },
    data: { availabilityReleasedAt: new Date() },
  });

  // Assess fines.
  const dueAt = new Date(
    `${contract.expectedReturnDate.toISOString().slice(0, 10)}T18:00:00+07:00`,
  );
  if (actualReturnAt > dueAt) {
    try {
      await assessFine({
        contractId: input.contractId,
        violationType: 'LATE_RETURN',
        quantity: Math.ceil((actualReturnAt.getTime() - dueAt.getTime()) / (60 * 60 * 1000)),
        description: 'Late return',
        assessedBy: input.staffReturnId,
      });
    } catch {
      // Ignore duplicate.
    }
  }

  if (input.fuelShortageLitres && input.fuelShortageLitres > 0) {
    try {
      await assessFine({
        contractId: input.contractId,
        violationType: 'FUEL_SHORTAGE',
        quantity: input.fuelShortageLitres,
        description: `Fuel shortage: ${input.fuelShortageLitres} litres`,
        assessedBy: input.staffReturnId,
      });
    } catch {
      // Ignore duplicate.
    }
  }

  if (input.exteriorDamage || input.returnInspection.condition === 'DAMAGED') {
    try {
      await assessFine({
        contractId: input.contractId,
        violationType: 'EXTERIOR_DAMAGE',
        quantity: 1,
        description: input.damageDescription ?? 'Exterior damage',
        assessedBy: input.staffReturnId,
      });
    } catch {
      // Ignore duplicate.
    }
  }

  // Update vehicle status.
  const newStatus = input.returnInspection.condition === 'DAMAGED' ? 'MAINTENANCE' : 'AVAILABLE';
  await prisma.vehicle.update({
    where: { vehicleId: contract.booking.vehicleId },
    data: { status: newStatus, currentMileage: input.returnInspection.mileage },
  });

  // Generate invoice.
  const invoice = await generateInvoice({
    contractId: input.contractId,
    discountAmount: input.discountAmount ?? 0,
    issuedBy: input.staffReturnId,
  });

  // Apply deposit: if deposit covers total, mark paid with DEPOSIT settlement.
  if (Number(invoice.finalAmountDue) <= 0) {
    await prisma.invoice.update({
      where: { invoiceId: invoice.invoiceId },
      data: { status: 'PAID', amountPaid: invoice.totalAmount, paidAt: new Date() },
    });
    await prisma.fineRecord.updateMany({
      where: { invoiceId: invoice.invoiceId },
      data: { status: 'PAID', settledAt: new Date(), settlementType: 'DEPOSIT' },
    });
  }

  // Generate receipt PDF metadata.
  try {
    await generateAndStoreDocument(input.contractId, 'RECEIPT', input.staffReturnId);
  } catch {
    // Non-fatal.
  }

  await prisma.auditLog.create({
    data: {
      actorUserId: input.staffReturnId,
      actorRole: 'STAFF',
      action: 'CONTRACT_COMPLETED',
      entityType: 'rental_contracts',
      entityId: input.contractId,
      outcome: 'SUCCESS',
    },
  });

  const updated = await prisma.rentalContract.findUnique({
    where: { contractId: input.contractId },
    include: {
      booking: {
        include: {
          customer: { include: { user: { select: { fullName: true, email: true } } } },
          vehicle: { include: { category: true, branch: true } },
        },
      },
      inspections: { include: { photos: true } },
      fines: { include: { fineRule: true } },
      invoice: { include: { lines: true } },
      documents: true,
    },
  });

  return updated!;
}
