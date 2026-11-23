import { Router } from 'express';
import { z } from 'zod';

import { authenticate, requireRole } from '../middleware/auth.js';
import {
  monthlyRevenue,
  fleetUtilization,
  newCustomers,
  finesByPeriod,
} from '../services/report.service.js';

export const reportRouter = Router();

reportRouter.get('/revenue', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const year = z.coerce
      .number()
      .int()
      .min(2000)
      .max(2100)
      .parse(req.query.year ?? new Date().getUTCFullYear());
    const result = await monthlyRevenue(year);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

reportRouter.get(
  '/fleet-utilization',
  authenticate,
  requireRole('ADMIN'),
  async (req, res, next) => {
    try {
      const from =
        (req.query.from as string) ??
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const to = (req.query.to as string) ?? new Date().toISOString().slice(0, 10);
      const result = await fleetUtilization(from, to);
      res.json(result);
    } catch (e) {
      next(e);
    }
  },
);

reportRouter.get('/new-customers', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const year = z.coerce
      .number()
      .int()
      .min(2000)
      .max(2100)
      .parse(req.query.year ?? new Date().getUTCFullYear());
    const result = await newCustomers(year);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

reportRouter.get('/fines', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const year = z.coerce
      .number()
      .int()
      .min(2000)
      .max(2100)
      .parse(req.query.year ?? new Date().getUTCFullYear());
    const month = req.query.month
      ? z.coerce.number().int().min(1).max(12).parse(req.query.month)
      : undefined;
    const result = await finesByPeriod(year, month);
    res.json(result);
  } catch (e) {
    next(e);
  }
});
