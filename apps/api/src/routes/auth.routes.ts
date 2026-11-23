import { Router } from 'express';
import { z } from 'zod';

import { authenticate } from '../middleware/auth.js';
import { getCurrentUser, login, registerCustomer } from '../services/auth.service.js';

const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(8).max(20),
  nationalId: z.string().trim().min(5).max(20),
  password: z.string().min(8).max(128),
  address: z.string().trim().max(500).optional(),
});

const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
});

export const authRouter = Router();

authRouter.post('/register', async (request, response, next) => {
  try {
    const input = registerSchema.parse(request.body);
    const result = await registerCustomer(input);
    response.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

authRouter.post('/login', async (request, response, next) => {
  try {
    const input = loginSchema.parse(request.body);
    const result = await login(input);
    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

authRouter.get('/me', authenticate, async (request, response, next) => {
  try {
    const user = await getCurrentUser(request.user!.userId);
    response.status(200).json({ user });
  } catch (error) {
    next(error);
  }
});
