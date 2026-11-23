import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';

import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env.js';

const app = createApp();

async function createAdmin() {
  const hash = await bcrypt.hash('adminpass123', 10);
  const user = await prisma.user.create({
    data: {
      fullName: 'Admin',
      email: 'admintest@test.com',
      phone: '0920000001',
      nationalId: 'ADMIN3',
      passwordHash: hash,
      role: 'ADMIN',
    },
  });
  return jwt.sign({ sub: user.userId, role: user.role }, env.jwtSecret, { expiresIn: '1d' });
}

async function createCustomer() {
  const hash = await bcrypt.hash('custpass123', 10);
  const user = await prisma.user.create({
    data: {
      fullName: 'Cust',
      email: 'custtest@test.com',
      phone: '0920000002',
      nationalId: 'CUST3',
      passwordHash: hash,
      role: 'CUSTOMER',
      customer: { create: {} },
    },
  });
  return jwt.sign({ sub: user.userId, role: user.role }, env.jwtSecret, { expiresIn: '1d' });
}

describe('Phase 3c Admin APIs', () => {
  let adminToken: string;
  let customerToken: string;

  beforeAll(async () => {
    adminToken = await createAdmin();
    customerToken = await createCustomer();
  });

  it('denies non-admin access to admin endpoints', async () => {
    const endpoints = [
      ['GET', '/api/admin/dashboard'],
      ['GET', '/api/users'],
      ['GET', '/api/system-configs'],
      ['GET', '/api/fine-rules'],
      ['GET', '/api/reports/revenue'],
      ['GET', '/api/audit-logs'],
    ];
    for (const [method, path] of endpoints) {
      const res = await request(app).get(path).set('Authorization', `Bearer ${customerToken}`);
      expect(res.status).toBe(403);
    }
  });

  it('denies unauthenticated access', async () => {
    const res = await request(app).get('/api/admin/dashboard');
    expect(res.status).toBe(401);
  });

  it('rejects invalid token', async () => {
    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', 'Bearer invalid.token.here');
    expect(res.status).toBe(401);
  });

  it('creates and lists staff', async () => {
    const branch = await prisma.branch.create({
      data: { code: 'ADMBR', name: 'Branch 1', address: 'Addr' },
    });
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fullName: 'Staff One',
        email: 'staff3@test.com',
        phone: '0920000003',
        nationalId: 'STAFF3',
        password: 'password123',
        employeeCode: 'E3',
        branchId: branch.branchId,
      });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('STAFF');

    const list = await request(app).get('/api/users').set('Authorization', `Bearer ${adminToken}`);
    expect(list.status).toBe(200);
    expect(list.body.items.length).toBeGreaterThanOrEqual(1);
  });

  it('prevents duplicate staff email', async () => {
    const branch = await prisma.branch.findFirst();
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fullName: 'Dup',
        email: 'staff3@test.com',
        phone: '0920000004',
        nationalId: 'STAFF3D',
        password: 'password123',
        employeeCode: 'E4',
        branchId: branch!.branchId,
      });
    expect(res.status).toBe(409);
  });

  it('locks and unlocks staff account', async () => {
    const staff = await prisma.user.findFirst({ where: { role: 'STAFF' } });
    const lock = await request(app)
      .patch(`/api/users/${staff!.userId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ accountStatus: 'LOCKED' });
    expect(lock.status).toBe(200);
    expect(lock.body.user.accountStatus).toBe('LOCKED');

    const unlock = await request(app)
      .patch(`/api/users/${staff!.userId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ accountStatus: 'ACTIVE' });
    expect(unlock.status).toBe(200);
    expect(unlock.body.user.accountStatus).toBe('ACTIVE');
  });

  it('prevents locking admin accounts', async () => {
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    const res = await request(app)
      .patch(`/api/users/${admin!.userId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ accountStatus: 'LOCKED' });
    expect(res.status).toBe(400);
  });

  it('manages system config', async () => {
    const up = await request(app)
      .patch('/api/system-configs/MAX_RENTAL_DAYS')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ configValue: '45', valueType: 'INTEGER' });
    expect(up.status).toBe(200);
    expect(up.body.config.configValue).toBe('45');

    const get = await request(app)
      .get('/api/system-configs/MAX_RENTAL_DAYS')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(get.status).toBe(200);
    expect(get.body.config.configValue).toBe('45');

    const list = await request(app)
      .get('/api/system-configs')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(list.status).toBe(200);
  });

  it('manages fine rules', async () => {
    const create = await request(app)
      .post('/api/fine-rules')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'LATE_HOURLY',
        name: 'Late hourly',
        violationType: 'LATE_RETURN',
        calculationMethod: 'PER_HOUR',
        rateAmount: 5000,
      });
    expect(create.status).toBe(201);
    const id = create.body.rule.fineRuleId;

    const list = await request(app)
      .get('/api/fine-rules')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(list.status).toBe(200);
    expect(list.body.items.length).toBeGreaterThanOrEqual(1);

    const patch = await request(app)
      .patch(`/api/fine-rules/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false });
    expect(patch.status).toBe(200);
    expect(patch.body.rule.isActive).toBe(false);
  });

  it('prevents duplicate fine rule code', async () => {
    await request(app).post('/api/fine-rules').set('Authorization', `Bearer ${adminToken}`).send({
      code: 'DUP_RULE',
      name: 'Dup',
      violationType: 'LATE_RETURN',
      calculationMethod: 'FIXED',
      rateAmount: 100,
    });
    const res = await request(app)
      .post('/api/fine-rules')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'DUP_RULE',
        name: 'Dup2',
        violationType: 'LATE_RETURN',
        calculationMethod: 'FIXED',
        rateAmount: 200,
      });
    expect(res.status).toBe(409);
  });

  it('returns dashboard stats', async () => {
    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.users).toBeTruthy();
    expect(res.body.vehicles).toBeTruthy();
    expect(res.body.bookings).toBeTruthy();
  });

  it('returns audit logs (read-only)', async () => {
    const res = await request(app)
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(typeof res.body.total).toBe('number');
  });

  it('audit logs are immutable (no delete endpoint)', async () => {
    const res = await request(app)
      .delete('/api/audit-logs/1')
      .set('Authorization', `Bearer ${adminToken}`);
    expect([404, 405]).toContain(res.status);
  });

  it('returns reports', async () => {
    const rev = await request(app)
      .get('/api/reports/revenue?year=2026')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(rev.status).toBe(200);
    expect(Array.isArray(rev.body.months)).toBe(true);

    const fc = await request(app)
      .get('/api/reports/new-customers?year=2026')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(fc.status).toBe(200);

    const fines = await request(app)
      .get('/api/reports/fines?year=2026')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(fines.status).toBe(200);

    const util = await request(app)
      .get('/api/reports/fleet-utilization')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(util.status).toBe(200);
    expect(Array.isArray(util.body.vehicles)).toBe(true);
  });

  it('denies customer/staff from admin endpoints', async () => {
    const staffHash = await bcrypt.hash('staffpass', 10);
    const staffUser = await prisma.user.create({
      data: {
        fullName: 'Staff',
        email: 'staffx@test.com',
        phone: '0920000005',
        nationalId: 'STAFFX',
        passwordHash: staffHash,
        role: 'STAFF',
      },
    });
    const staffToken = jwt.sign({ sub: staffUser.userId, role: staffUser.role }, env.jwtSecret, {
      expiresIn: '1d',
    });

    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(res.status).toBe(403);
  });
});
