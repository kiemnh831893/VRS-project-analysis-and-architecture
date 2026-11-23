import { Router } from 'express';

import { authenticate, requireRole } from '../middleware/auth.js';
import { getDashboardStats } from '../services/dashboard.service.js';

export const adminRouter = Router();

adminRouter.get('/dashboard', authenticate, requireRole('ADMIN'), async (_req, res, next) => {
  try {
    const stats = await getDashboardStats();
    res.json(stats);
  } catch (e) {
    next(e);
  }
});
