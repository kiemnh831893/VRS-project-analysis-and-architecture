import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { env } from '../src/config/env.js';

const app = createApp();

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

async function createAdminUser() {
  const passwordHash = await bcrypt.hash('adminpass123', 10);
  const user = await prisma.user.create({
    data: {
      fullName: 'Admin User',
      email: 'admin@test.com',
      phone: '0900000099',
      nationalId: 'ADMIN-NID',
      passwordHash,
      role: 'ADMIN',
    },
  });
  const token = jwt.sign({ sub: user.userId, role: user.role }, env.jwtSecret, { expiresIn: '1d' });
  return { user, token };
}

async function createStaffUser() {
  const passwordHash = await bcrypt.hash('staffpass123', 10);
  const branch = await prisma.branch.create({
    data: { code: 'STAFFBR', name: 'Staff Branch', address: 'Addr' },
  });
  const user = await prisma.user.create({
    data: {
      fullName: 'Staff User',
      email: 'staff@test.com',
      phone: '0900000098',
      nationalId: 'STAFF-NID',
      passwordHash,
      role: 'STAFF',
      rentalStaff: { create: { employeeCode: 'E001', branchId: branch.branchId } },
    },
  });
  const token = jwt.sign({ sub: user.userId, role: user.role }, env.jwtSecret, { expiresIn: '1d' });
  return { user, token, branch };
}

async function registerCustomer(email = 'cust@test.com', phone = '0900000001', nid = 'CUST-NID') {
  const res = await request(app).post('/api/auth/register').send({
    fullName: 'Test Customer',
    email,
    phone,
    nationalId: nid,
    password: 'password123',
  });
  return res.body as { user: { userId: string }; token: string };
}

describe('Phase 2b API', () => {
  let adminToken: string;
  let staffToken: string;
  let staffBranchId: string;
  let customerToken: string;
  let customerId: string;

  beforeAll(async () => {
    const admin = await createAdminUser();
    adminToken = admin.token;
    const staff = await createStaffUser();
    staffToken = staff.token;
    staffBranchId = staff.branch.branchId;

    const cust = await registerCustomer();
    customerToken = cust.token;
    customerId = cust.user.userId;
  });

  describe('Branches', () => {
    it('creates a branch (admin)', async () => {
      const res = await request(app).post('/api/branches').set(authHeader(adminToken)).send({
        code: 'B1',
        name: 'Branch One',
        address: '1 Street',
        openingTime: '08:00',
        closingTime: '18:00',
      });
      expect(res.status).toBe(201);
      expect(res.body.branch.code).toBe('B1');
    });

    it('rejects duplicate branch code', async () => {
      await request(app)
        .post('/api/branches')
        .set(authHeader(adminToken))
        .send({ code: 'B1', name: 'Dup', address: 'x' });
      const res = await request(app)
        .post('/api/branches')
        .set(authHeader(adminToken))
        .send({ code: 'B1', name: 'Dup2', address: 'y' });
      expect(res.status).toBe(409);
    });

    it('lists branches', async () => {
      const res = await request(app).get('/api/branches');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.items)).toBe(true);
    });

    it('updates branch', async () => {
      const created = await request(app)
        .post('/api/branches')
        .set(authHeader(adminToken))
        .send({ code: 'B2', name: 'Branch Two', address: '2 Street' });
      const id = created.body.branch.branchId;
      const res = await request(app)
        .patch(`/api/branches/${id}`)
        .set(authHeader(adminToken))
        .send({ name: 'Branch Two Updated' });
      expect(res.status).toBe(200);
      expect(res.body.branch.name).toBe('Branch Two Updated');
    });

    it('activates/deactivates branch', async () => {
      const created = await request(app)
        .post('/api/branches')
        .set(authHeader(adminToken))
        .send({ code: 'B3', name: 'Branch Three', address: '3 Street' });
      const id = created.body.branch.branchId;
      const res = await request(app)
        .patch(`/api/branches/${id}/status`)
        .set(authHeader(adminToken))
        .send({ status: 'INACTIVE' });
      expect(res.status).toBe(200);
      expect(res.body.branch.status).toBe('INACTIVE');
    });

    it('rejects unauthorized branch creation', async () => {
      const res = await request(app)
        .post('/api/branches')
        .send({ code: 'BX', name: 'X', address: 'x' });
      expect(res.status).toBe(401);
    });
  });

  describe('Vehicle categories', () => {
    it('creates a category (admin)', async () => {
      const res = await request(app)
        .post('/api/vehicle-categories')
        .set(authHeader(adminToken))
        .send({ name: 'Sedan', depositRate: 10 });
      expect(res.status).toBe(201);
      expect(res.body.category.name).toBe('Sedan');
    });

    it('validates deposit rate range', async () => {
      const res = await request(app)
        .post('/api/vehicle-categories')
        .set(authHeader(adminToken))
        .send({ name: 'Bad', depositRate: 150 });
      expect(res.status).toBe(400);
    });

    it('lists categories', async () => {
      const res = await request(app).get('/api/vehicle-categories');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.items)).toBe(true);
    });
  });

  describe('Vehicles', () => {
    let branchId: string;
    let categoryId: number;

    beforeAll(async () => {
      const b = await request(app)
        .post('/api/branches')
        .set(authHeader(adminToken))
        .send({ code: 'VB', name: 'Vehicle Branch', address: 'Addr' });
      branchId = b.body.branch.branchId;
      const c = await request(app)
        .post('/api/vehicle-categories')
        .set(authHeader(adminToken))
        .send({ name: 'SUV', depositRate: 15 });
      categoryId = c.body.category.categoryId;
    });

    it('creates a vehicle', async () => {
      const res = await request(app).post('/api/vehicles').set(authHeader(adminToken)).send({
        categoryId,
        branchId,
        licensePlate: '59A-12345',
        brand: 'Toyota',
        model: 'Vios',
        manufactureYear: 2020,
        transmission: 'AUTO',
        fuelType: 'PETROL',
        seats: 5,
        dailyRate: 500000,
      });
      expect(res.status).toBe(201);
      expect(res.body.vehicle.licensePlate).toBe('59A-12345');
    });

    it('rejects duplicate license plate', async () => {
      const res = await request(app).post('/api/vehicles').set(authHeader(adminToken)).send({
        categoryId,
        branchId,
        licensePlate: '59a-12345',
        brand: 'Honda',
        model: 'City',
        manufactureYear: 2021,
        transmission: 'AUTO',
        fuelType: 'PETROL',
        seats: 5,
        dailyRate: 600000,
      });
      expect(res.status).toBe(409);
    });

    it('rejects invalid vehicle data', async () => {
      const res = await request(app).post('/api/vehicles').set(authHeader(adminToken)).send({
        categoryId,
        branchId,
        licensePlate: 'X',
        brand: 'Toyota',
        model: 'Vios',
        manufactureYear: 1800,
        transmission: 'AUTO',
        fuelType: 'PETROL',
        seats: 0,
        dailyRate: -1,
      });
      expect(res.status).toBe(400);
    });

    it('updates vehicle status with valid transition', async () => {
      const created = await request(app).post('/api/vehicles').set(authHeader(adminToken)).send({
        categoryId,
        branchId,
        licensePlate: '59B-99999',
        brand: 'Kia',
        model: 'Morning',
        manufactureYear: 2019,
        transmission: 'MANUAL',
        fuelType: 'PETROL',
        seats: 4,
        dailyRate: 400000,
      });
      const id = created.body.vehicle.vehicleId;
      const res = await request(app)
        .patch(`/api/vehicles/${id}/status`)
        .set(authHeader(adminToken))
        .send({ status: 'MAINTENANCE' });
      expect(res.status).toBe(200);
      expect(res.body.vehicle.status).toBe('MAINTENANCE');
    });

    it('rejects invalid status transition', async () => {
      const created = await request(app).post('/api/vehicles').set(authHeader(adminToken)).send({
        categoryId,
        branchId,
        licensePlate: '59C-11111',
        brand: 'Mazda',
        model: '3',
        manufactureYear: 2022,
        transmission: 'AUTO',
        fuelType: 'PETROL',
        seats: 5,
        dailyRate: 700000,
      });
      const id = created.body.vehicle.vehicleId;
      // AVAILABLE -> RETIRED is allowed, then RETIRED -> AVAILABLE is not
      await request(app)
        .patch(`/api/vehicles/${id}/status`)
        .set(authHeader(adminToken))
        .send({ status: 'RETIRED' });
      const res = await request(app)
        .patch(`/api/vehicles/${id}/status`)
        .set(authHeader(adminToken))
        .send({ status: 'AVAILABLE' });
      expect(res.status).toBe(400);
    });

    it('catalog search filters by category and price', async () => {
      const res = await request(app)
        .get('/api/vehicles/catalog')
        .query({ categoryId, maxDailyRate: 450000 });
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.items)).toBe(true);
    });
  });

  describe('Bookings', () => {
    let branchId: string;
    let categoryId: number;
    let vehicleId: string;

    beforeAll(async () => {
      const b = await request(app)
        .post('/api/branches')
        .set(authHeader(adminToken))
        .send({ code: 'BKBR', name: 'Booking Branch', address: 'Addr' });
      branchId = b.body.branch.branchId;
      const c = await request(app)
        .post('/api/vehicle-categories')
        .set(authHeader(adminToken))
        .send({ name: 'Economy', depositRate: 10 });
      categoryId = c.body.category.categoryId;
      const v = await request(app).post('/api/vehicles').set(authHeader(adminToken)).send({
        categoryId,
        branchId,
        licensePlate: 'BK-00001',
        brand: 'Toyota',
        model: 'Vios',
        manufactureYear: 2020,
        transmission: 'AUTO',
        fuelType: 'PETROL',
        seats: 5,
        dailyRate: 500000,
      });
      vehicleId = v.body.vehicle.vehicleId;
    });

    it('rejects unauthenticated booking', async () => {
      const res = await request(app).post('/api/bookings').send({
        vehicleId,
        pickupDate: '2026-03-10',
        expectedReturnDate: '2026-03-12',
      });
      expect(res.status).toBe(401);
    });

    it('rejects unverified license', async () => {
      const res = await request(app).post('/api/bookings').set(authHeader(customerToken)).send({
        vehicleId,
        pickupDate: '2026-03-10',
        expectedReturnDate: '2026-03-12',
      });
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('LICENSE_NOT_VERIFIED');
    });

    it('verifies customer license and allows booking', async () => {
      // verify license
      await prisma.customer.update({
        where: { userId: customerId },
        data: {
          driverLicenseNo: 'DL-123',
          licenseImageKey: 'keys/license.jpg',
          licenseStatus: 'VERIFIED',
          licenseReviewedAt: new Date(),
        },
      });

      const res = await request(app).post('/api/bookings').set(authHeader(customerToken)).send({
        vehicleId,
        pickupDate: '2026-03-10',
        expectedReturnDate: '2026-03-12',
      });
      expect(res.status).toBe(201);
      expect(res.body.booking.rentalDays).toBe(2);
      expect(res.body.booking.bookingStatus).toBe('PENDING_PAYMENT');
      expect(res.body.booking.rentalSubtotal).toBe(1000000);
    });

    it('rejects invalid date range', async () => {
      const res = await request(app).post('/api/bookings').set(authHeader(customerToken)).send({
        vehicleId,
        pickupDate: '2026-04-12',
        expectedReturnDate: '2026-04-10',
      });
      expect(res.status).toBe(400);
    });

    it('rejects overlapping booking', async () => {
      const res = await request(app).post('/api/bookings').set(authHeader(customerToken)).send({
        vehicleId,
        pickupDate: '2026-03-11',
        expectedReturnDate: '2026-03-13',
      });
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('VEHICLE_UNAVAILABLE');
    });

    it('allows adjacent booking', async () => {
      const res = await request(app).post('/api/bookings').set(authHeader(customerToken)).send({
        vehicleId,
        pickupDate: '2026-03-12',
        expectedReturnDate: '2026-03-14',
      });
      expect(res.status).toBe(201);
    });

    it('blocks customer with unpaid fine', async () => {
      // Create a contract + unpaid fine for this customer
      const vehicle = await prisma.vehicle.findUnique({ where: { vehicleId } });
      const booking = await prisma.booking.findFirst({ where: { customerId, vehicleId } });
      const contract = await prisma.rentalContract.create({
        data: {
          contractNumber: 'C-TEST-1',
          bookingId: booking!.bookingId,
          staffHandoverId: (await prisma.user.findFirst({ where: { role: 'ADMIN' } }))!.userId,
          actualPickupAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          expectedReturnDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        },
      });
      const fineRule = await prisma.fineRule.create({
        data: {
          code: 'LATE_TEST',
          name: 'Late',
          violationType: 'LATE_RETURN',
          calculationMethod: 'FIXED',
          rateAmount: 10000,
        },
      });
      await prisma.fineRecord.create({
        data: {
          contractId: contract.contractId,
          fineRuleId: fineRule.fineRuleId,
          violationType: 'LATE_RETURN',
          quantity: 1,
          unitAmount: 10000,
          amount: 10000,
          assessedById: (await prisma.user.findFirst({ where: { role: 'ADMIN' } }))!.userId,
        },
      });

      const res = await request(app).post('/api/bookings').set(authHeader(customerToken)).send({
        vehicleId,
        pickupDate: '2026-05-01',
        expectedReturnDate: '2026-05-03',
      });
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('CUSTOMER_HAS_UNPAID_FINES');

      // Clean up so the fine rule does not leak into other tests.
      await prisma.fineRecord.deleteMany({ where: { contractId: contract.contractId } });
      await prisma.fineRule.delete({ where: { fineRuleId: fineRule.fineRuleId } });
    });

    it('expires pending bookings', async () => {
      // Create an expired pending booking directly
      const expiredVehicle = await prisma.vehicle.findUnique({ where: { vehicleId } });
      const expiredBooking = await prisma.booking.create({
        data: {
          bookingCode: 'BK-EXPIRED',
          customerId,
          vehicleId,
          pickupBranchId: expiredVehicle!.branchId,
          returnBranchId: expiredVehicle!.branchId,
          pickupDate: new Date('2026-06-01'),
          expectedReturnDate: new Date('2026-06-03'),
          rentalDays: 2,
          dailyRateSnapshot: 500000,
          rentalSubtotal: 1000000,
          depositRateSnapshot: 10,
          depositAmount: 100000,
          totalEstimatedCost: 1000000,
          holdExpiresAt: new Date(Date.now() - 60 * 1000),
          bookingStatus: 'PENDING_PAYMENT',
        },
      });

      const res = await request(app)
        .post('/api/bookings/expire-pending')
        .set(authHeader(adminToken));
      expect(res.status).toBe(200);
      expect(res.body.expiredCount).toBeGreaterThanOrEqual(1);

      const updated = await prisma.booking.findUnique({
        where: { bookingId: expiredBooking.bookingId },
      });
      expect(updated!.bookingStatus).toBe('CANCELLED');
      expect(updated!.cancellationReason).toBe('PAYMENT_TIMEOUT');
    });

    it('is idempotent on repeated expiry', async () => {
      const res = await request(app)
        .post('/api/bookings/expire-pending')
        .set(authHeader(adminToken));
      expect(res.status).toBe(200);
      expect(res.body.expiredCount).toBe(0);
    });

    it('lists customer bookings', async () => {
      const res = await request(app).get('/api/bookings/me').set(authHeader(customerToken));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.items)).toBe(true);
    });
  });
});
