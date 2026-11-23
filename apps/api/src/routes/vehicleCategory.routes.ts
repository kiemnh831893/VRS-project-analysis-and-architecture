import { Router } from 'express';
import { z } from 'zod';

import { authenticate, requireRole } from '../middleware/auth.js';
import {
  createVehicleCategorySchema,
  updateVehicleCategorySchema,
} from '../schemas/vehicleCategory.schema.js';
import {
  createVehicleCategory,
  updateVehicleCategory,
  listVehicleCategories,
  getVehicleCategory,
} from '../services/vehicleCategory.service.js';

export const vehicleCategoryRouter = Router();

vehicleCategoryRouter.get('/', async (request, response, next) => {
  try {
    const isActive = request.query.isActive;
    const filter = isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    const items = await listVehicleCategories({ isActive: filter });
    response.json({ items });
  } catch (error) {
    next(error);
  }
});

vehicleCategoryRouter.get('/:id', async (request, response, next) => {
  try {
    const id = z.coerce.number().int().positive().parse(request.params.id);
    const category = await getVehicleCategory(id);
    response.json({ category });
  } catch (error) {
    next(error);
  }
});

vehicleCategoryRouter.post(
  '/',
  authenticate,
  requireRole('ADMIN'),
  async (request, response, next) => {
    try {
      const input = createVehicleCategorySchema.parse(request.body);
      const category = await createVehicleCategory(input);
      response.status(201).json({ category });
    } catch (error) {
      next(error);
    }
  },
);

vehicleCategoryRouter.patch(
  '/:id',
  authenticate,
  requireRole('ADMIN'),
  async (request, response, next) => {
    try {
      const id = z.coerce.number().int().positive().parse(request.params.id);
      const input = updateVehicleCategorySchema.parse(request.body);
      const category = await updateVehicleCategory(id, input);
      response.json({ category });
    } catch (error) {
      next(error);
    }
  },
);
