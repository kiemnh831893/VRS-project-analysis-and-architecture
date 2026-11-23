import { Router } from 'express';

import { authenticate, requireRole } from '../middleware/auth.js';
import {
  createBranchSchema,
  updateBranchSchema,
  branchStatusSchema,
} from '../schemas/branch.schema.js';
import {
  createBranch,
  updateBranch,
  listBranches,
  getBranch,
  setBranchStatus,
} from '../services/branch.service.js';

export const branchRouter = Router();

branchRouter.get('/', async (request, response, next) => {
  try {
    const status = request.query.status ? String(request.query.status) : undefined;
    const search = request.query.search ? String(request.query.search) : undefined;
    const branches = await listBranches({
      status: status === 'ACTIVE' || status === 'INACTIVE' ? status : undefined,
      search,
    });
    response.json({ items: branches });
  } catch (error) {
    next(error);
  }
});

branchRouter.get('/:id', async (request, response, next) => {
  try {
    const branch = await getBranch(String(request.params.id));
    response.json({ branch });
  } catch (error) {
    next(error);
  }
});

branchRouter.post('/', authenticate, requireRole('ADMIN'), async (request, response, next) => {
  try {
    const input = createBranchSchema.parse(request.body);
    const branch = await createBranch(input);
    response.status(201).json({ branch });
  } catch (error) {
    next(error);
  }
});

branchRouter.patch('/:id', authenticate, requireRole('ADMIN'), async (request, response, next) => {
  try {
    const input = updateBranchSchema.parse(request.body);
    const branch = await updateBranch(String(request.params.id), input);
    response.json({ branch });
  } catch (error) {
    next(error);
  }
});

branchRouter.patch(
  '/:id/status',
  authenticate,
  requireRole('ADMIN'),
  async (request, response, next) => {
    try {
      const { status } = branchStatusSchema.parse(request.body);
      const branch = await setBranchStatus(String(request.params.id), status);
      response.json({ branch });
    } catch (error) {
      next(error);
    }
  },
);
