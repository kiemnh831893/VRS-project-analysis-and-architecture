import { Router } from 'express';

import { authenticate, requireRole } from '../middleware/auth.js';
import { createBookingSchema } from '../schemas/booking.schema.js';
import {
  createBooking,
  listCustomerBookings,
  getBooking,
  expirePendingBookings,
} from '../services/booking.service.js';

export const bookingRouter = Router();

bookingRouter.post('/', authenticate, requireRole('CUSTOMER'), async (request, response, next) => {
  try {
    const input = createBookingSchema.parse(request.body);
    const booking = await createBooking(request.user!.userId, input);
    response.status(201).json({ booking });
  } catch (error) {
    next(error);
  }
});

bookingRouter.get('/me', authenticate, requireRole('CUSTOMER'), async (request, response, next) => {
  try {
    const items = await listCustomerBookings(request.user!.userId);
    response.json({ items });
  } catch (error) {
    next(error);
  }
});

bookingRouter.get('/:id', authenticate, async (request, response, next) => {
  try {
    const booking = await getBooking(
      String(request.params.id),
      request.user!.userId,
      request.user!.role,
    );
    response.json({ booking });
  } catch (error) {
    next(error);
  }
});

// Admin trigger for the pending-booking expiry job (also intended to be called by a scheduler).
bookingRouter.post(
  '/expire-pending',
  authenticate,
  requireRole('ADMIN'),
  async (_request, response, next) => {
    try {
      const result = await expirePendingBookings();
      response.json(result);
    } catch (error) {
      next(error);
    }
  },
);
