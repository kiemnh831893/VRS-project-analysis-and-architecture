import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

import { prisma } from '../lib/prisma.js';
import { HttpError } from '../lib/httpError.js';
import { env } from '../config/env.js';
import {
  AccountStatus,
  AuditOutcome,
  LoginFailureReason,
  UserRole,
} from '../generated/prisma/enums.js';

export type TokenPayload = { sub: string; role: UserRole };

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

export function verifyToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, env.jwtSecret);
  if (
    typeof decoded !== 'object' ||
    decoded === null ||
    !('sub' in decoded) ||
    !('role' in decoded)
  ) {
    throw new HttpError(401, 'Invalid token');
  }
  return {
    sub: String((decoded as { sub: unknown }).sub),
    role: (decoded as { role: UserRole }).role,
  };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export interface RegisterCustomerInput {
  fullName: string;
  email: string;
  phone: string;
  nationalId: string;
  password: string;
  address?: string;
}

export async function registerCustomer(input: RegisterCustomerInput) {
  const email = input.email.trim().toLowerCase();

  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { equals: email, mode: 'insensitive' } },
        { phone: input.phone },
        { nationalId: input.nationalId },
      ],
    },
    select: { email: true, phone: true, nationalId: true },
  });

  if (existing) {
    if (existing.email.toLowerCase() === email) {
      throw new HttpError(409, 'Email is already registered', 'EMAIL_TAKEN');
    }
    if (existing.phone === input.phone) {
      throw new HttpError(409, 'Phone is already registered', 'PHONE_TAKEN');
    }
    throw new HttpError(409, 'National ID is already registered', 'NATIONAL_ID_TAKEN');
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      fullName: input.fullName.trim(),
      email,
      phone: input.phone.trim(),
      nationalId: input.nationalId.trim(),
      passwordHash,
      role: UserRole.CUSTOMER,
      address: input.address?.trim() ?? null,
      customer: { create: {} },
    },
    select: { userId: true, fullName: true, email: true, role: true, accountStatus: true },
  });

  const token = signToken({ sub: user.userId, role: user.role });
  return { user, token };
}

export interface LoginInput {
  email: string;
  password: string;
}

export async function login(input: LoginInput) {
  const email = input.email.trim().toLowerCase();

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
  });

  const recordFailure = async (reason: LoginFailureReason, userId?: string) => {
    await prisma.failedLoginAttempt.create({
      data: {
        userId: userId ?? null,
        emailAttempted: email,
        failureReason: reason,
      },
    });
  };

  if (!user) {
    await recordFailure(LoginFailureReason.UNKNOWN_EMAIL);
    throw new HttpError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
  }

  if (user.accountStatus === AccountStatus.LOCKED) {
    await recordFailure(LoginFailureReason.ACCOUNT_LOCKED, user.userId);
    throw new HttpError(403, 'Account is locked', 'ACCOUNT_LOCKED');
  }

  if (user.loginLockedUntil && user.loginLockedUntil > new Date()) {
    await recordFailure(LoginFailureReason.TEMPORARILY_LOCKED, user.userId);
    throw new HttpError(429, 'Too many failed attempts; try again later', 'TEMPORARILY_LOCKED');
  }

  const passwordOk = await verifyPassword(input.password, user.passwordHash);
  if (!passwordOk) {
    const newCount = user.failedLoginCount + 1;
    const lockedUntil =
      newCount >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : user.loginLockedUntil;

    await prisma.user.update({
      where: { userId: user.userId },
      data: {
        failedLoginCount: newCount,
        lastFailedLoginAt: new Date(),
        loginLockedUntil: lockedUntil,
      },
    });

    await recordFailure(LoginFailureReason.INVALID_CREDENTIALS, user.userId);
    throw new HttpError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
  }

  await prisma.user.update({
    where: { userId: user.userId },
    data: {
      failedLoginCount: 0,
      loginLockedUntil: null,
      lastLoginAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: user.userId,
      actorRole: user.role,
      action: 'LOGIN_SUCCESS',
      entityType: 'users',
      entityId: user.userId,
      outcome: AuditOutcome.SUCCESS,
    },
  });

  const token = signToken({ sub: user.userId, role: user.role });
  return {
    user: {
      userId: user.userId,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    },
    token,
  };
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { userId },
    select: {
      userId: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      accountStatus: true,
      avatarKey: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new HttpError(404, 'User not found', 'USER_NOT_FOUND');
  }

  return user;
}
