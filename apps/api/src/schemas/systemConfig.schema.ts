import { z } from 'zod';

export const updateSystemConfigSchema = z.object({
  configValue: z.string().min(1),
  valueType: z.enum(['STRING', 'INTEGER', 'DECIMAL', 'BOOLEAN', 'JSON']).optional(),
  description: z.string().trim().optional(),
  isPublic: z.boolean().optional(),
});
