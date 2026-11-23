import { Router } from 'express';

import { authenticate, requireRole } from '../middleware/auth.js';
import {
  createVehicleSchema,
  updateVehicleSchema,
  vehicleStatusSchema,
  vehicleCatalogQuerySchema,
} from '../schemas/vehicle.schema.js';
import {
  createVehicle,
  updateVehicle,
  getVehicle,
  setVehicleStatus,
  listVehicles,
  searchCatalog,
} from '../services/vehicle.service.js';

export const vehicleRouter = Router();

// Catalog search (public)
vehicleRouter.get('/catalog', async (request, response, next) => {
  try {
    const filters = vehicleCatalogQuerySchema.parse(request.query);
    const result = await searchCatalog({
      categoryId: filters.categoryId,
      brand: filters.brand,
      search: filters.search,
      transmission: filters.transmission,
      minSeats: filters.minSeats,
      maxDailyRate: filters.maxDailyRate,
      status: filters.status,
      pickupDate: filters.pickupDate,
      expectedReturnDate: filters.expectedReturnDate,
      page: filters.page,
      pageSize: filters.pageSize,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
    });
    response.json(result);
  } catch (error) {
    next(error);
  }
});

vehicleRouter.get('/', async (request, response, next) => {
  try {
    const categoryId = request.query.categoryId ? Number(request.query.categoryId) : undefined;
    const branchId = request.query.branchId ? String(request.query.branchId) : undefined;
    const status = request.query.status ? String(request.query.status) : undefined;
    const brand = request.query.brand ? String(request.query.brand) : undefined;
    const transmission = request.query.transmission
      ? String(request.query.transmission)
      : undefined;
    const minSeats = request.query.minSeats ? Number(request.query.minSeats) : undefined;
    const maxDailyRate = request.query.maxDailyRate
      ? Number(request.query.maxDailyRate)
      : undefined;
    const search = request.query.search ? String(request.query.search) : undefined;
    const page = request.query.page ? Number(request.query.page) : 1;
    const pageSize = request.query.pageSize ? Number(request.query.pageSize) : 20;
    const sortBy = request.query.sortBy ? String(request.query.sortBy) : 'createdAt';
    const sortOrder = request.query.sortOrder === 'asc' ? 'asc' : 'desc';

    const result = await listVehicles({
      categoryId: Number.isFinite(categoryId) ? categoryId : undefined,
      branchId,
      status,
      brand,
      transmission,
      minSeats: Number.isFinite(minSeats) ? minSeats : undefined,
      maxDailyRate: Number.isFinite(maxDailyRate) ? maxDailyRate : undefined,
      search,
      page,
      pageSize,
      sortBy,
      sortOrder,
    });
    response.json(result);
  } catch (error) {
    next(error);
  }
});

vehicleRouter.get('/:id', async (request, response, next) => {
  try {
    const vehicle = await getVehicle(String(request.params.id));
    response.json({ vehicle });
  } catch (error) {
    next(error);
  }
});

vehicleRouter.post(
  '/',
  authenticate,
  requireRole('ADMIN', 'STAFF'),
  async (request, response, next) => {
    try {
      const input = createVehicleSchema.parse(request.body);
      const vehicle = await createVehicle(input);
      response.status(201).json({ vehicle });
    } catch (error) {
      next(error);
    }
  },
);

vehicleRouter.patch(
  '/:id',
  authenticate,
  requireRole('ADMIN', 'STAFF'),
  async (request, response, next) => {
    try {
      const input = updateVehicleSchema.parse(request.body);
      const vehicle = await updateVehicle(String(request.params.id), input);
      response.json({ vehicle });
    } catch (error) {
      next(error);
    }
  },
);

vehicleRouter.patch(
  '/:id/status',
  authenticate,
  requireRole('ADMIN', 'STAFF'),
  async (request, response, next) => {
    try {
      const { status } = vehicleStatusSchema.parse(request.body);
      const vehicle = await setVehicleStatus(String(request.params.id), status);
      response.json({ vehicle });
    } catch (error) {
      next(error);
    }
  },
);
