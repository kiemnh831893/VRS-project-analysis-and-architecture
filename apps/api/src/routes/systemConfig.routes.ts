import { Router } from 'express';

import { authenticate, requireRole } from '../middleware/auth.js';
import { updateSystemConfigSchema } from '../schemas/systemConfig.schema.js';
import {
  listSystemConfigs,
  getSystemConfig,
  upsertSystemConfig,
} from '../services/systemConfig.service.js';

export const systemConfigRouter = Router();

systemConfigRouter.get('/', authenticate, requireRole('ADMIN'), async (_req, res, next) => {
  try {
    const items = await listSystemConfigs();
    res.json({ items });
  } catch (e) {
    next(e);
  }
});

systemConfigRouter.get('/:key', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const config = await getSystemConfig(String(req.params.key));
    res.json({ config });
  } catch (e) {
    next(e);
  }
});

systemConfigRouter.patch('/:key', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const input = updateSystemConfigSchema.parse(req.body);
    const config = await upsertSystemConfig(String(req.params.key), {
      ...input,
      updatedBy: req.user!.userId,
    });
    res.json({ config });
  } catch (e) {
    next(e);
  }
});
