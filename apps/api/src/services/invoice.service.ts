import crypto from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../lib/httpError.js';

function generateInvoiceNumber(): string {
  return `INV-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
}

export interface GenerateInvoiceInput {
  contractId: string;
  discountAmount?: number;
  issuedBy: string;
}

export async function generateInvoice(input: GenerateInvoiceInput) {
  const contract = await prisma.rentalContract.findUnique({
    where: { contractId: input.contractId },
    include: {
      booking: true,
      fines: true,
    },
  });
  if (!contract) throw new HttpError(404, 'Contract not found', 'CONTRACT_NOT_FOUND');

  const existing = await prisma.invoice.findUnique({ where: { contractId: input.contractId } });
  if (existing) {
    throw new HttpError(409, 'Invoice already exists for this contract', 'INVOICE_EXISTS');
  }

  const rentalFee = Number(contract.booking.rentalSubtotal);
  const insuranceFee = Number(contract.booking.insuranceFee);
  const fineFee = contract.fines.reduce((sum, f) => sum + Number(f.amount), 0);
  const discountAmount = input.discountAmount ?? 0;
  const totalAmount = rentalFee + insuranceFee + fineFee - discountAmount;
  const depositAmount = Number(contract.booking.depositAmount);
  const depositApplied = Math.min(depositAmount, totalAmount);
  const finalAmountDue = totalAmount - depositApplied;

  const invoice = await prisma.$transaction(async (tx) => {
    const inv = await tx.invoice.create({
      data: {
        invoiceNumber: generateInvoiceNumber(),
        contractId: input.contractId,
        status: 'UNPAID',
        rentalFee,
        insuranceFee,
        fineFee,
        discountAmount,
        totalAmount,
        depositAmount,
        depositApplied,
        finalAmountDue,
        amountPaid: 0,
        refundAmount: 0,
        currency: contract.booking.currency,
      },
    });

    // Invoice lines.
    await tx.invoiceLine.create({
      data: {
        invoiceId: inv.invoiceId,
        lineType: 'RENTAL',
        description: 'Rental fee',
        quantity: contract.booking.rentalDays,
        unitAmount: Number(contract.booking.dailyRateSnapshot),
        lineAmount: rentalFee,
        sortOrder: 0,
      },
    });
    if (insuranceFee > 0) {
      await tx.invoiceLine.create({
        data: {
          invoiceId: inv.invoiceId,
          lineType: 'INSURANCE',
          description: 'Insurance fee',
          quantity: contract.booking.rentalDays,
          unitAmount: Number(contract.booking.insuranceDailyRateSnapshot ?? 0),
          lineAmount: insuranceFee,
          sortOrder: 1,
        },
      });
    }
    for (const fine of contract.fines) {
      const lineType =
        fine.violationType === 'LATE_RETURN'
          ? 'LATE_FEE'
          : fine.violationType === 'FUEL_SHORTAGE'
            ? 'FUEL_FEE'
            : fine.violationType === 'EXTERIOR_DAMAGE'
              ? 'DAMAGE_FEE'
              : 'OTHER_FEE';
      await tx.invoiceLine.create({
        data: {
          invoiceId: inv.invoiceId,
          lineType,
          description: fine.description ?? fine.violationType,
          quantity: Number(fine.quantity),
          unitAmount: Number(fine.unitAmount),
          lineAmount: Number(fine.amount),
          fineId: fine.fineId,
          sortOrder: 2,
        },
      });
    }

    // Link fines to invoice.
    await tx.fineRecord.updateMany({
      where: { contractId: input.contractId },
      data: { invoiceId: inv.invoiceId },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: input.issuedBy,
        actorRole: 'STAFF',
        action: 'INVOICE_GENERATED',
        entityType: 'invoices',
        entityId: inv.invoiceId,
        outcome: 'SUCCESS',
      },
    });

    return inv;
  });

  return invoice;
}

export async function getInvoice(
  id: string,
  requesterId: string,
  requesterRole: 'CUSTOMER' | 'STAFF' | 'ADMIN',
) {
  const invoice = await prisma.invoice.findUnique({
    where: { invoiceId: id },
    include: {
      lines: true,
      contract: { include: { booking: { select: { customerId: true } } } },
      payments: true,
      fines: true,
    },
  });
  if (!invoice) throw new HttpError(404, 'Invoice not found', 'INVOICE_NOT_FOUND');
  if (requesterRole === 'CUSTOMER' && invoice.contract.booking.customerId !== requesterId) {
    throw new HttpError(403, 'Forbidden', 'FORBIDDEN');
  }
  return invoice;
}

export async function settleInvoice(
  invoiceId: string,
  input: {
    amount: number;
    method: 'CASH' | 'SIMULATED_ONLINE';
    provider?: string;
    idempotencyKey: string;
    confirmedBy: string;
  },
) {
  const invoice = await prisma.invoice.findUnique({ where: { invoiceId } });
  if (!invoice) throw new HttpError(404, 'Invoice not found', 'INVOICE_NOT_FOUND');
  if (invoice.status === 'PAID' || invoice.status === 'VOID') {
    throw new HttpError(400, 'Invoice is already settled or void', 'INVOICE_NOT_SETTLABLE');
  }

  // Idempotency: if a succeeded settlement payment exists with this key, return it.
  const existing = await prisma.paymentTransaction.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
  });
  if (existing) {
    return { payment: existing, invoice };
  }

  const amount = input.amount;
  if (amount <= 0) throw new HttpError(400, 'Amount must be positive', 'INVALID_AMOUNT');

  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.paymentTransaction.create({
      data: {
        paymentCode: `PAY-${Date.now().toString(36).toUpperCase()}`,
        invoiceId,
        purpose: 'SETTLEMENT',
        method: input.method,
        provider: input.provider ?? 'COUNTER',
        idempotencyKey: input.idempotencyKey,
        amount,
        status: 'SUCCEEDED',
        confirmedById: input.confirmedBy,
        confirmedAt: new Date(),
      },
    });

    const newAmountPaid = Number(invoice.amountPaid) + amount;
    const paid =
      Number(invoice.finalAmountDue) <= 0 || newAmountPaid >= Number(invoice.finalAmountDue);

    await tx.invoice.update({
      where: { invoiceId },
      data: {
        amountPaid: newAmountPaid,
        status: paid ? 'PAID' : 'PARTIALLY_PAID',
        paidAt: paid ? new Date() : invoice.paidAt,
      },
    });

    if (paid) {
      await tx.fineRecord.updateMany({
        where: { invoiceId },
        data: { status: 'PAID', settledAt: new Date(), settlementType: 'PAYMENT' },
      });
    }

    await tx.auditLog.create({
      data: {
        actorUserId: input.confirmedBy,
        actorRole: 'STAFF',
        action: 'INVOICE_SETTLED',
        entityType: 'invoices',
        entityId: invoiceId,
        outcome: 'SUCCESS',
      },
    });

    return payment;
  });

  const updatedInvoice = await prisma.invoice.findUnique({ where: { invoiceId } });
  return { payment: result, invoice: updatedInvoice };
}
