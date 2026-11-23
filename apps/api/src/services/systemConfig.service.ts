import { prisma } from '../lib/prisma.js';
import { HttpError } from '../lib/httpError.js';

export async function listSystemConfigs() {
  return prisma.systemConfig.findMany({ orderBy: { category: 'asc' } });
}

export async function getSystemConfig(key: string) {
  const config = await prisma.systemConfig.findUnique({ where: { configKey: key } });
  if (!config) throw new HttpError(404, 'Configuration not found', 'CONFIG_NOT_FOUND');
  return config;
}

export async function upsertSystemConfig(
  key: string,
  input: {
    configValue: string;
    valueType?: 'STRING' | 'INTEGER' | 'DECIMAL' | 'BOOLEAN' | 'JSON';
    description?: string;
    isPublic?: boolean;
    updatedBy: string;
  },
) {
  const existing = await prisma.systemConfig.findUnique({ where: { configKey: key } });
  const data = {
    configValue: input.configValue,
    valueType: input.valueType ?? existing?.valueType ?? 'STRING',
    category: existing?.category ?? 'general',
    description: input.description ?? existing?.description ?? null,
    isPublic: input.isPublic ?? existing?.isPublic ?? false,
    version: (existing?.version ?? 0) + 1,
    updatedById: input.updatedBy,
  };

  if (existing) {
    return prisma.systemConfig.update({ where: { configKey: key }, data });
  }
  return prisma.systemConfig.create({
    data: { configKey: key, ...data },
  });
}
