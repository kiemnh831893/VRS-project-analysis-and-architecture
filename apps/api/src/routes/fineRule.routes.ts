import { Router } from 'express';

import { authenticate, requireRole } from '../middleware/auth.js';
import { createFineRuleSchema, updateFineRuleSchema } from '../schemas/fineRule.schema.js';
import {
  listFineRules,
  getFineRule,
  createFineRule,
  updateFineRule,
} from '../services/fineRule.service.js';

export const fineRuleRouter = Router();

fineRuleRouter.get('/', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const isActive =
      req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;
    const violationType = req.query.violationType ? String(req.query.violationType) : undefined;
    const items = await listFineRules({ isActive, violationType });
    res.json({ items });
  } catch (e) {
    next(e);
  }
});

fineRuleRouter.get('/:id', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const rule = await getFineRule(String(req.params.id));
    res.json({ rule });
  } catch (e) {
    next(e);
  }
});

fineRuleRouter.post('/', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const input = createFineRuleSchema.parse(req.body);
    const rule = await createFineRule({ ...input, createdBy: req.user!.userId });
    res.status(201).json({ rule });
  } catch (e) {
    next(e);
  }
});

fineRuleRouter.patch('/:id', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const input = updateFineRuleSchema.parse(req.body);
    const rule = await updateFineRule(String(req.params.id), {
      ...input,
      updatedBy: req.user!.userId,
    });
    res.json({ rule });
  } catch (e) {
    next(e);
  }
});
