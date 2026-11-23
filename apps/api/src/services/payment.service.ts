import crypto from 'node:crypto';
import QRCode from 'qrcode';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../lib/httpError.js';

export interface ConfirmDepositInput {
  bookingId?: string;
  bookingCode?: string;
  amount: number;
  method: 'CASH' | 'SIMULATED_ONLINE';
  provider?: string;
  idempotencyKey: string;
  confirmedBy: string;
}

export async function confirmDeposit(input: ConfirmDepositInput) {
  let booking;
  if (input.bookingId) {
    booking = await prisma.booking.findUnique({ where: { bookingId: input.bookingId } });
  } else if (input.bookingCode) {
    booking = await prisma.booking.findUnique({ where: { bookingCode: input.bookingCode } });
  }
  if (!booking) throw new HttpError(404, 'Booking not found', 'BOOKING_NOT_FOUND');

  // Idempotency checks must run before the pending-state check so a retry after
  // a successful confirmation returns the original payment instead of a 400.
  const byKey = await prisma.paymentTransaction.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
  });
  if (byKey && byKey.bookingId === booking.bookingId && byKey.purpose === 'DEPOSIT') {
    const qrCode = await QRCode.toDataURL(booking.bookingCode);
    return { payment: byKey, booking, qrCode, alreadyConfirmed: true };
  }
  if (booking.bookingStatus !== 'PENDING_PAYMENT') {
    throw new HttpError(400, 'Booking is not pending payment', 'BOOKING_NOT_PENDING');
  }
  if (booking.holdExpiresAt <= new Date()) {
    // Expire it.
    await prisma.booking.update({
      where: { bookingId: booking.bookingId },
      data: {
        bookingStatus: 'CANCELLED',
        cancelledAt: new Date(),
        cancellationReason: 'PAYMENT_TIMEOUT',
        availabilityReleasedAt: new Date(),
      },
    });
    throw new HttpError(400, 'Booking hold has expired', 'BOOKING_EXPIRED');
  }

  if (Number(input.amount) !== Number(booking.depositAmount)) {
    throw new HttpError(400, 'Deposit amount does not match', 'DEPOSIT_AMOUNT_MISMATCH');
  }

  // A different idempotency key must not create a second deposit.
  const existing = await prisma.paymentTransaction.findFirst({
    where: { bookingId: booking.bookingId, purpose: 'DEPOSIT', status: 'SUCCEEDED' },
  });
  if (existing) {
    const qrCode = await QRCode.toDataURL(booking.bookingCode);
    return { payment: existing, booking, qrCode, alreadyConfirmed: true };
  }

  const payment = await prisma.$transaction(async (tx) => {
    const p = await tx.paymentTransaction.create({
      data: {
        paymentCode: `DEP-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
        bookingId: booking!.bookingId,
        purpose: 'DEPOSIT',
        method: input.method,
        provider: input.provider ?? (input.method === 'CASH' ? 'COUNTER' : 'SIMULATED'),
        idempotencyKey: input.idempotencyKey,
        amount: input.amount,
        status: 'SUCCEEDED',
        confirmedById: input.confirmedBy,
        confirmedAt: new Date(),
      },
    });

    await tx.booking.update({
      where: { bookingId: booking!.bookingId },
      data: { bookingStatus: 'CONFIRMED', confirmedAt: new Date() },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: input.confirmedBy,
        actorRole: 'STAFF',
        action: 'DEPOSIT_CONFIRMED',
        entityType: 'bookings',
        entityId: booking!.bookingId,
        outcome: 'SUCCESS',
      },
    });

    return p;
  });

  const qrCode = await QRCode.toDataURL(booking.bookingCode);
  const updatedBooking = await prisma.booking.findUnique({
    where: { bookingId: booking.bookingId },
  });

  return { payment, booking: updatedBooking, qrCode, alreadyConfirmed: false };
}
