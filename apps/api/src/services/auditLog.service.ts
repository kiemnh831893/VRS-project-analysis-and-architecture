import { prisma } from '../lib/prisma.js';

export async function listAuditLogs(filters: {
  actorUserId?: string;
  action?: string;
  entityType?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 50;
  const where: Record<string, unknown> = {};
  if (filters.actorUserId) where.actorUserId = filters.actorUserId;
  if (filters.action) where.action = { contains: filters.action, mode: 'insensitive' };
  if (filters.entityType) where.entityType = filters.entityType;
  if (filters.from || filters.to) {
    where.occurredAt = {};
    if (filters.from) (where.occurredAt as Record<string, unknown>).gte = new Date(filters.from);
    if (filters.to) (where.occurredAt as Record<string, unknown>).lte = new Date(filters.to);
  }

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { occurredAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);
  return { items, total, page, pageSize };
}
