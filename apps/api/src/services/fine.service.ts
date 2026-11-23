import { prisma } from '../lib/prisma.js';
import { HttpError } from '../lib/httpError.js';

export interface AssessFineInput {
  contractId: string;
  violationType: 'LATE_RETURN' | 'FUEL_SHORTAGE' | 'EXTERIOR_DAMAGE';
  quantity?: number;
  description?: string;
  assessedBy: string;
  fineRuleId?: string;
}

export async function assessFine(input: AssessFineInput) {
  const contract = await prisma.rentalContract.findUnique({
    where: { contractId: input.contractId },
  });
  if (!contract) throw new HttpError(404, 'Contract not found', 'CONTRACT_NOT_FOUND');

  // Prevent duplicate fine for the same violation type on this contract.
  const existing = await prisma.fineRecord.findFirst({
    where: { contractId: input.contractId, violationType: input.violationType },
  });
  if (existing) {
    throw new HttpError(409, 'Fine already recorded for this violation', 'FINE_EXISTS');
  }

  // Resolve fine rule.
  let rule;
  if (input.fineRuleId) {
    rule = await prisma.fineRule.findUnique({ where: { fineRuleId: input.fineRuleId } });
  } else {
    rule = await prisma.fineRule.findFirst({
      where: { violationType: input.violationType, isActive: true },
      orderBy: { effectiveFrom: 'desc' },
    });
  }
  if (!rule) throw new HttpError(404, 'Fine rule not found', 'FINE_RULE_NOT_FOUND');

  const quantity = input.quantity ?? 1;
  if (quantity <= 0) throw new HttpError(400, 'Quantity must be positive', 'INVALID_QUANTITY');

  const unitAmount = Number(rule.rateAmount);
  const amount = Math.round(quantity * unitAmount * 100) / 100;

  const fine = await prisma.fineRecord.create({
    data: {
      contractId: input.contractId,
      fineRuleId: rule.fineRuleId,
      violationType: input.violationType,
      description: input.description ?? null,
      quantity,
      unitAmount,
      amount,
      assessedById: input.assessedBy,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: input.assessedBy,
      actorRole: 'STAFF',
      action: 'FINE_ASSESSED',
      entityType: 'fine_records',
      entityId: fine.fineId,
      outcome: 'SUCCESS',
    },
  });

  return fine;
}

export async function settleFine(
  fineId: string,
  settlementType: 'PAYMENT' | 'DEPOSIT' | 'WAIVER',
  settledBy: string,
  waiverReason?: string,
) {
  const fine = await prisma.fineRecord.findUnique({ where: { fineId } });
  if (!fine) throw new HttpError(404, 'Fine not found', 'FINE_NOT_FOUND');
  if (fine.status !== 'UNPAID') {
    throw new HttpError(400, 'Fine is not unpaid', 'FINE_NOT_UNPAID');
  }

  const data: Record<string, unknown> = {
    status: settlementType === 'WAIVER' ? 'WAIVED' : 'PAID',
    settledAt: new Date(),
    settlementType,
  };
  if (settlementType === 'WAIVER') {
    if (!waiverReason) throw new HttpError(400, 'Waiver reason required', 'WAIVER_REASON_REQUIRED');
    data.waiverReason = waiverReason;
  }

  const updated = await prisma.fineRecord.update({ where: { fineId }, data });

  await prisma.auditLog.create({
    data: {
      actorUserId: settledBy,
      actorRole: 'STAFF',
      action: 'FINE_SETTLED',
      entityType: 'fine_records',
      entityId: fineId,
      outcome: 'SUCCESS',
    },
  });

  return updated;
}
