import { Router } from 'express';

import { authenticate, requireRole } from '../middleware/auth.js';
import { createStaffSchema, updateStaffSchema, userStatusSchema } from '../schemas/user.schema.js';
import {
  listStaff,
  getStaff,
  createStaff,
  updateStaff,
  setAccountStatus,
} from '../services/user.service.js';

export const userRouter = Router();

userRouter.get('/', authenticate, requireRole('ADMIN'), async (_req, res, next) => {
  try {
    const items = await listStaff();
    res.json({ items });
  } catch (e) {
    next(e);
  }
});

userRouter.get('/:id', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const user = await getStaff(String(req.params.id));
    res.json({ user });
  } catch (e) {
    next(e);
  }
});

userRouter.post('/', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const input = createStaffSchema.parse(req.body);
    const user = await createStaff(input);
    res.status(201).json({ user });
  } catch (e) {
    next(e);
  }
});

userRouter.patch('/:id', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const input = updateStaffSchema.parse(req.body);
    const user = await updateStaff(String(req.params.id), input);
    res.json({ user });
  } catch (e) {
    next(e);
  }
});

userRouter.patch('/:id/status', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { accountStatus } = userStatusSchema.parse(req.body);
    const user = await setAccountStatus(String(req.params.id), accountStatus, req.user!.userId);
    res.json({ user });
  } catch (e) {
    next(e);
  }
});
