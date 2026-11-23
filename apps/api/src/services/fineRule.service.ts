import { prisma } from '../lib/prisma.js';
import { HttpError } from '../lib/httpError.js';

export async function listFineRules(filters: { isActive?: boolean; violationType?: string }) {
  const where: Record<string, unknown> = {};
  if (filters.isActive !== undefined) where.isActive = filters.isActive;
  if (filters.violationType) where.violationType = filters.violationType;
  return prisma.fineRule.findMany({ where, orderBy: { createdAt: 'desc' } });
}

export async function getFineRule(id: string) {
  const rule = await prisma.fineRule.findUnique({ where: { fineRuleId: id } });
  if (!rule) throw new HttpError(404, 'Fine rule not found', 'FINE_RULE_NOT_FOUND');
  return rule;
}

export async function createFineRule(input: {
  code: string;
  name: string;
  violationType: string;
  calculationMethod: string;
  rateAmount: number;
  unitLabel?: string;
  graceMinutes?: number;
  maxAmount?: number | null;
  isActive?: boolean;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  createdBy: string;
}) {
  const existing = await prisma.fineRule.findUnique({ where: { code: input.code } });
  if (existing) throw new HttpError(409, 'Fine rule code already exists', 'FINE_RULE_CODE_TAKEN');

  return prisma.fineRule.create({
    data: {
      code: input.code,
      name: input.name,
      violationType: input.violationType as never,
      calculationMethod: input.calculationMethod as never,
      rateAmount: input.rateAmount,
      unitLabel: input.unitLabel ?? null,
      graceMinutes: input.graceMinutes ?? 0,
      maxAmount: input.maxAmount ?? null,
      isActive: input.isActive ?? true,
      effectiveFrom: input.effectiveFrom ? new Date(input.effectiveFrom) : new Date(),
      effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : null,
      createdById: input.createdBy,
    },
  });
}

export async function updateFineRule(
  id: string,
  input: {
    code?: string;
    name?: string;
    violationType?: string;
    calculationMethod?: string;
    rateAmount?: number;
    unitLabel?: string;
    graceMinutes?: number;
    maxAmount?: number | null;
    isActive?: boolean;
    effectiveFrom?: string;
    effectiveTo?: string | null;
    updatedBy: string;
  },
) {
  const rule = await prisma.fineRule.findUnique({ where: { fineRuleId: id } });
  if (!rule) throw new HttpError(404, 'Fine rule not found', 'FINE_RULE_NOT_FOUND');

  if (input.code && input.code !== rule.code) {
    const dup = await prisma.fineRule.findUnique({ where: { code: input.code } });
    if (dup) throw new HttpError(409, 'Fine rule code already exists', 'FINE_RULE_CODE_TAKEN');
  }

  return prisma.fineRule.update({
    where: { fineRuleId: id },
    data: {
      code: input.code,
      name: input.name,
      violationType: input.violationType as never,
      calculationMethod: input.calculationMethod as never,
      rateAmount: input.rateAmount,
      unitLabel: input.unitLabel,
      graceMinutes: input.graceMinutes,
      maxAmount: input.maxAmount,
      isActive: input.isActive,
      effectiveFrom: input.effectiveFrom ? new Date(input.effectiveFrom) : undefined,
      effectiveTo:
        input.effectiveTo === null
          ? null
          : input.effectiveTo
            ? new Date(input.effectiveTo)
            : undefined,
      updatedById: input.updatedBy,
    },
  });
}
