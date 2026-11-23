import { prisma } from '../lib/prisma.js';
import { HttpError } from '../lib/httpError.js';

async function getConfigInt(key: string, fallback: number): Promise<number> {
  const row = await prisma.systemConfig.findUnique({ where: { configKey: key } });
  if (!row) return fallback;
  const n = Number(row.configValue);
  return Number.isFinite(n) ? n : fallback;
}

function generateBookingCode(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `BK-${ts}-${rand}`;
}

function isExclusionViolation(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as {
    code?: string;
    meta?: { constraint?: string; target?: string[] | string };
    message?: string;
  };
  if (e.code === 'P2002') {
    const constraint = e.meta?.constraint ?? '';
    const target = Array.isArray(e.meta?.target)
      ? e.meta.target.join(',')
      : String(e.meta?.target ?? '');
    if (
      constraint.includes('bookings_vehicle_no_overlap') ||
      target.includes('bookings_vehicle_no_overlap')
    ) {
      return true;
    }
  }
  const msg = e.message ?? String(err);
  return (
    msg.includes('exclusion_violation') ||
    msg.includes('bookings_vehicle_no_overlap') ||
    msg.includes('23P01')
  );
}

export interface CreateBookingInput {
  vehicleId: string;
  pickupDate: string;
  expectedReturnDate: string;
  pickupBranchId?: string;
  returnBranchId?: string;
  insurancePackageId?: string | null;
}

export async function createBooking(customerUserId: string, input: CreateBookingInput) {
  const pickup = new Date(`${input.pickupDate}T00:00:00.000Z`);
  const ret = new Date(`${input.expectedReturnDate}T00:00:00.000Z`);

  if (Number.isNaN(pickup.getTime()) || Number.isNaN(ret.getTime())) {
    throw new HttpError(400, 'Invalid date format', 'INVALID_DATE');
  }
  if (!(ret > pickup)) {
    throw new HttpError(400, 'Return date must be after pickup date', 'INVALID_DATE_RANGE');
  }

  const rentalDays = Math.round((ret.getTime() - pickup.getTime()) / (24 * 60 * 60 * 1000));
  if (rentalDays < 1) {
    throw new HttpError(400, 'Rental must be at least 1 day', 'INVALID_RENTAL_DAYS');
  }

  const minDays = await getConfigInt('MIN_RENTAL_DAYS', 1);
  const maxDays = await getConfigInt('MAX_RENTAL_DAYS', 30);
  if (rentalDays < minDays) {
    throw new HttpError(400, `Minimum rental is ${minDays} day(s)`, 'RENTAL_TOO_SHORT');
  }
  if (rentalDays > maxDays) {
    throw new HttpError(400, `Maximum rental is ${maxDays} day(s)`, 'RENTAL_TOO_LONG');
  }

  const customer = await prisma.customer.findUnique({
    where: { userId: customerUserId },
    include: { user: true },
  });
  if (!customer) throw new HttpError(404, 'Customer profile not found', 'CUSTOMER_NOT_FOUND');
  if (customer.user.accountStatus !== 'ACTIVE') {
    throw new HttpError(403, 'Account is not active', 'ACCOUNT_INACTIVE');
  }
  if (customer.licenseStatus !== 'VERIFIED') {
    throw new HttpError(
      403,
      'Driver license must be verified before booking',
      'LICENSE_NOT_VERIFIED',
    );
  }
  if (customer.licenseExpiryDate && customer.licenseExpiryDate < pickup) {
    throw new HttpError(403, 'Driver license expires before pickup date', 'LICENSE_EXPIRED');
  }

  const unpaidFine = await prisma.fineRecord.findFirst({
    where: {
      status: 'UNPAID',
      contract: { booking: { customerId: customerUserId } },
    },
    select: { fineId: true },
  });
  if (unpaidFine) {
    throw new HttpError(409, 'Customer has unpaid fines', 'CUSTOMER_HAS_UNPAID_FINES');
  }

  const vehicle = await prisma.vehicle.findUnique({
    where: { vehicleId: input.vehicleId },
    include: { category: true },
  });
  if (!vehicle) throw new HttpError(404, 'Vehicle not found', 'VEHICLE_NOT_FOUND');
  if (vehicle.status === 'RETIRED' || vehicle.status === 'MAINTENANCE') {
    throw new HttpError(409, 'Vehicle is not available', 'VEHICLE_UNAVAILABLE');
  }

  const pickupBranchId = input.pickupBranchId ?? vehicle.branchId;
  const returnBranchId = input.returnBranchId ?? vehicle.branchId;
  if (pickupBranchId !== returnBranchId) {
    throw new HttpError(400, 'One-way rentals are not allowed in MVP', 'ONE_WAY_NOT_ALLOWED');
  }
  if (pickupBranchId !== vehicle.branchId) {
    throw new HttpError(
      400,
      'Pickup branch must be the vehicle home branch',
      'INVALID_PICKUP_BRANCH',
    );
  }

  let insuranceName: string | null = null;
  let insuranceDailyRate: number | null = null;
  let insuranceFee = 0;
  if (input.insurancePackageId) {
    const pkg = await prisma.insurancePackage.findUnique({
      where: { insurancePackageId: input.insurancePackageId },
    });
    if (!pkg || !pkg.isActive) {
      throw new HttpError(404, 'Insurance package not found', 'INSURANCE_NOT_FOUND');
    }
    insuranceName = pkg.name;
    insuranceDailyRate = Number(pkg.dailyRate);
    insuranceFee = insuranceDailyRate * rentalDays;
  }

  const dailyRate = Number(vehicle.dailyRate);
  const rentalSubtotal = dailyRate * rentalDays;
  const depositRate = Number(vehicle.category.depositRate);
  const depositAmount = Math.round(((rentalSubtotal * depositRate) / 100) * 100) / 100;
  const totalEstimatedCost = rentalSubtotal + insuranceFee;

  const ttlMinutes = await getConfigInt('PENDING_BOOKING_TTL_MINUTES', 30);
  const holdExpiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  const bookingCode = generateBookingCode();

  try {
    const booking = await prisma.$transaction(
      async (tx) => {
        // Lazy expiry for this vehicle.
        await tx.booking.updateMany({
          where: {
            vehicleId: vehicle.vehicleId,
            bookingStatus: 'PENDING_PAYMENT',
            holdExpiresAt: { lte: new Date() },
          },
          data: {
            bookingStatus: 'CANCELLED',
            cancelledAt: new Date(),
            cancellationReason: 'PAYMENT_TIMEOUT',
            availabilityReleasedAt: new Date(),
            updatedAt: new Date(),
          },
        });

        // Lock the customer row to serialize fine/booking checks.
        await tx.$queryRaw`SELECT 1 FROM customers WHERE user_id = ${customerUserId}::uuid FOR UPDATE`;

        const unpaid2 = await tx.fineRecord.findFirst({
          where: {
            status: 'UNPAID',
            contract: { booking: { customerId: customerUserId } },
          },
          select: { fineId: true },
        });
        if (unpaid2) {
          throw new HttpError(409, 'Customer has unpaid fines', 'CUSTOMER_HAS_UNPAID_FINES');
        }

        const v2 = await tx.vehicle.findUnique({ where: { vehicleId: vehicle.vehicleId } });
        if (!v2 || v2.status === 'RETIRED' || v2.status === 'MAINTENANCE') {
          throw new HttpError(409, 'Vehicle is not available', 'VEHICLE_UNAVAILABLE');
        }

        return tx.booking.create({
          data: {
            bookingCode,
            customerId: customerUserId,
            vehicleId: vehicle.vehicleId,
            pickupBranchId,
            returnBranchId,
            pickupDate: pickup,
            expectedReturnDate: ret,
            rentalDays,
            dailyRateSnapshot: dailyRate,
            rentalSubtotal,
            depositRateSnapshot: depositRate,
            depositAmount,
            insurancePackageId: input.insurancePackageId ?? null,
            insuranceNameSnapshot: insuranceName,
            insuranceDailyRateSnapshot: insuranceDailyRate,
            insuranceFee,
            totalEstimatedCost,
            holdExpiresAt,
          },
        });
      },
      { isolationLevel: 'Serializable' },
    );

    return booking;
  } catch (err) {
    if (isExclusionViolation(err)) {
      throw new HttpError(
        409,
        'Vehicle is not available for the selected dates',
        'VEHICLE_UNAVAILABLE',
      );
    }
    if (err instanceof HttpError) throw err;
    throw err;
  }
}

export async function listCustomerBookings(customerUserId: string) {
  return prisma.booking.findMany({
    where: { customerId: customerUserId },
    include: { vehicle: { include: { category: true, branch: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getBooking(id: string, requesterId: string, requesterRole: string) {
  const booking = await prisma.booking.findUnique({
    where: { bookingId: id },
    include: {
      customer: {
        select: {
          userId: true,
          licenseStatus: true,
          user: { select: { fullName: true, email: true } },
        },
      },
      vehicle: { include: { category: true, branch: true } },
    },
  });
  if (!booking) throw new HttpError(404, 'Booking not found', 'BOOKING_NOT_FOUND');
  if (
    requesterRole !== 'ADMIN' &&
    requesterRole !== 'STAFF' &&
    booking.customerId !== requesterId
  ) {
    throw new HttpError(403, 'Forbidden', 'FORBIDDEN');
  }
  return booking;
}

export async function expirePendingBookings() {
  const result = await prisma.booking.updateMany({
    where: {
      bookingStatus: 'PENDING_PAYMENT',
      holdExpiresAt: { lte: new Date() },
    },
    data: {
      bookingStatus: 'CANCELLED',
      cancelledAt: new Date(),
      cancellationReason: 'PAYMENT_TIMEOUT',
      availabilityReleasedAt: new Date(),
      updatedAt: new Date(),
    },
  });
  return { expiredCount: result.count };
}
