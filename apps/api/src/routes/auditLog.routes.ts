import { Router } from 'express';

import { authenticate, requireRole } from '../middleware/auth.js';
import { listAuditLogs } from '../services/auditLog.service.js';

export const auditLogRouter = Router();

auditLogRouter.get('/', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const result = await listAuditLogs({
      actorUserId: req.query.actorUserId ? String(req.query.actorUserId) : undefined,
      action: req.query.action ? String(req.query.action) : undefined,
      entityType: req.query.entityType ? String(req.query.entityType) : undefined,
      from: req.query.from ? String(req.query.from) : undefined,
      to: req.query.to ? String(req.query.to) : undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
});
