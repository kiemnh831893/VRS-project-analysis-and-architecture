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

async function createAdmin() {
  const hash = await bcrypt.hash('adminpass123', 10);
  const user = await prisma.user.create({
    data: {
      fullName: 'Admin',
      email: 'admin2@test.com',
      phone: '0900000097',
      nationalId: 'ADMIN2',
      passwordHash: hash,
      role: 'ADMIN',
    },
  });
  return jwt.sign({ sub: user.userId, role: user.role }, env.jwtSecret, { expiresIn: '1d' });
}

async function createStaff(branchId: string) {
  const hash = await bcrypt.hash('staffpass123', 10);
  const user = await prisma.user.create({
    data: {
      fullName: 'Staff2',
      email: 'staff2@test.com',
      phone: '0900000096',
      nationalId: 'STAFF2',
      passwordHash: hash,
      role: 'STAFF',
      rentalStaff: { create: { employeeCode: 'E2', branchId } },
    },
  });
  return jwt.sign({ sub: user.userId, role: user.role }, env.jwtSecret, { expiresIn: '1d' });
}

async function registerCustomer(email = 'cust2@test.com', phone = '0900000007', nid = 'CUST2') {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ fullName: 'Cust2', email, phone, nationalId: nid, password: 'password123' });
  return res.body as { user: { userId: string }; token: string };
}

async function setupBase() {
  const adminToken = await createAdmin();
  const branch = await (async () => {
    const r = await request(app)
      .post('/api/branches')
      .set(authHeader(adminToken))
      .send({ code: 'B2C', name: 'B', address: 'A' });
    return r.body.branch;
  })();
  const cat = await (async () => {
    const r = await request(app)
      .post('/api/vehicle-categories')
      .set(authHeader(adminToken))
      .send({ name: 'Cat2c2', depositRate: 10 });
    return r.body.category;
  })();
  const veh = await (async () => {
    const r = await request(app).post('/api/vehicles').set(authHeader(adminToken)).send({
      categoryId: cat.categoryId,
      branchId: branch.branchId,
      licensePlate: 'PH2C-2',
      brand: 'Toyota',
      model: 'Vios',
      manufactureYear: 2020,
      transmission: 'AUTO',
      fuelType: 'PETROL',
      seats: 5,
      dailyRate: 500000,
    });
    return r.body.vehicle;
  })();
  const staffToken = await createStaff(branch.branchId);
  const cust = await registerCustomer('cust2@test.com', '0900000007', 'CUST2');
  await prisma.customer.update({
    where: { userId: cust.user.userId },
    data: {
      driverLicenseNo: 'DL2',
      licenseImageKey: 'k',
      licenseStatus: 'VERIFIED',
      licenseReviewedAt: new Date(),
    },
  });
  return { adminToken, staffToken, branch, cat, veh, cust };
}

describe('Phase 2c: Rental Contract & Billing', () => {
  let adminToken: string;
  let staffToken: string;
  let branch: any;
  let vehicle: any;
  let categoryId: number;
  let customerToken: string;
  let customerId: string;

  beforeAll(async () => {
    const base = await setupBase();
    adminToken = base.adminToken;
    staffToken = base.staffToken;
    branch = base.branch;
    vehicle = base.veh;
    categoryId = base.cat.categoryId;
    customerToken = base.cust.token;
    customerId = base.cust.user.userId;
  });

  let vehicleCounter = 0;
  async function createConfirmedBooking() {
    vehicleCounter++;
    const cust = await registerCustomer(
      `cust${vehicleCounter}-${Date.now()}@test.com`,
      `09100000${String(vehicleCounter).padStart(2, '0')}`,
      `CUST${vehicleCounter}-${Date.now()}`,
    );
    await prisma.customer.update({
      where: { userId: cust.user.userId },
      data: {
        driverLicenseNo: `DL${vehicleCounter}-${Date.now()}`,
        licenseImageKey: 'k',
        licenseStatus: 'VERIFIED',
        licenseReviewedAt: new Date(),
      },
    });
    const custTokenLocal = cust.token;

    const v = await request(app)
      .post('/api/vehicles')
      .set(authHeader(adminToken))
      .send({
        categoryId: categoryId,
        branchId: branch.branchId,
        licensePlate: `P${vehicleCounter}${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        brand: 'Toyota',
        model: 'Vios',
        manufactureYear: 2020,
        transmission: 'AUTO',
        fuelType: 'PETROL',
        seats: 5,
        dailyRate: 500000,
      });
    const vid = v.body.vehicle.vehicleId;
    const bk = await request(app).post('/api/bookings').set(authHeader(custTokenLocal)).send({
      vehicleId: vid,
      pickupDate: '2026-03-10',
      expectedReturnDate: '2026-03-12',
    });
    const booking = bk.body.booking;
    const dep = await request(app)
      .post('/api/payments/deposit')
      .set(authHeader(staffToken))
      .send({
        bookingCode: booking.bookingCode,
        amount: booking.depositAmount,
        method: 'CASH',
        idempotencyKey: `dep-${Date.now()}-${Math.random()}`,
      });
    return { booking, vehicleId: vid, customerToken: custTokenLocal, customerId: cust.user.userId };
  }

  it('confirms deposit and generates QR', async () => {
    const bk = await request(app).post('/api/bookings').set(authHeader(customerToken)).send({
      vehicleId: vehicle.vehicleId,
      pickupDate: '2026-04-10',
      expectedReturnDate: '2026-04-12',
    });
    const booking = bk.body.booking;
    const res = await request(app)
      .post('/api/payments/deposit')
      .set(authHeader(staffToken))
      .send({
        bookingCode: booking.bookingCode,
        amount: booking.depositAmount,
        method: 'CASH',
        idempotencyKey: `dep-${Date.now()}`,
      });
    expect(res.status).toBe(201);
    expect(res.body.qrCode).toContain('data:image/png');
    expect(res.body.booking.bookingStatus).toBe('CONFIRMED');
  });

  it('prevents duplicate deposit', async () => {
    const bk = await request(app).post('/api/bookings').set(authHeader(customerToken)).send({
      vehicleId: vehicle.vehicleId,
      pickupDate: '2026-05-10',
      expectedReturnDate: '2026-05-12',
    });
    const booking = bk.body.booking;
    const key = `dep-dup-${Date.now()}`;
    await request(app).post('/api/payments/deposit').set(authHeader(staffToken)).send({
      bookingCode: booking.bookingCode,
      amount: booking.depositAmount,
      method: 'CASH',
      idempotencyKey: key,
    });
    const res = await request(app)
      .post('/api/payments/deposit')
      .set(authHeader(staffToken))
      .send({
        bookingCode: booking.bookingCode,
        amount: booking.depositAmount,
        method: 'CASH',
        idempotencyKey: `dep-dup2-${Date.now()}`,
      });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('BOOKING_NOT_PENDING');
  });

  it('creates contract on handover', async () => {
    const { booking } = await createConfirmedBooking();
    const res = await request(app)
      .post('/api/contracts')
      .set(authHeader(staffToken))
      .send({
        bookingCode: booking.bookingCode,
        actualPickupAt: '2026-03-10T01:00:00.000Z',
        pickupInspection: { mileage: 10000, fuelLevelPercent: 100, condition: 'INTACT' },
      });
    expect(res.status).toBe(201);
    expect(res.body.contract.contractStatus).toBe('ACTIVE');
    expect(res.body.contract.booking.bookingStatus).toBe('CONVERTED_TO_CONTRACT');
  });

  it('prevents duplicate contract', async () => {
    const { booking } = await createConfirmedBooking();
    await request(app)
      .post('/api/contracts')
      .set(authHeader(staffToken))
      .send({
        bookingCode: booking.bookingCode,
        actualPickupAt: '2026-03-10T01:00:00.000Z',
        pickupInspection: { mileage: 10000, fuelLevelPercent: 100, condition: 'INTACT' },
      });
    const res = await request(app)
      .post('/api/contracts')
      .set(authHeader(staffToken))
      .send({
        bookingCode: booking.bookingCode,
        actualPickupAt: '2026-03-10T01:00:00.000Z',
        pickupInspection: { mileage: 10000, fuelLevelPercent: 100, condition: 'INTACT' },
      });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('CONTRACT_EXISTS');
  });

  it('validates handover mileage (return < pickup rejected)', async () => {
    const { booking } = await createConfirmedBooking();
    const c = await request(app)
      .post('/api/contracts')
      .set(authHeader(staffToken))
      .send({
        bookingCode: booking.bookingCode,
        actualPickupAt: '2026-03-10T01:00:00.000Z',
        pickupInspection: { mileage: 10000, fuelLevelPercent: 100, condition: 'INTACT' },
      });
    const contractId = c.body.contract.contractId;
    const res = await request(app)
      .post(`/api/contracts/${contractId}/return`)
      .set(authHeader(staffToken))
      .send({
        actualReturnAt: '2026-03-12T10:00:00.000Z',
        returnInspection: { mileage: 9999, fuelLevelPercent: 80, condition: 'INTACT' },
      });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_MILEAGE');
  });

  it('processes return and updates vehicle status', async () => {
    const { booking } = await createConfirmedBooking();
    const c = await request(app)
      .post('/api/contracts')
      .set(authHeader(staffToken))
      .send({
        bookingCode: booking.bookingCode,
        actualPickupAt: '2026-03-10T01:00:00.000Z',
        pickupInspection: { mileage: 10000, fuelLevelPercent: 100, condition: 'INTACT' },
      });
    const contractId = c.body.contract.contractId;
    const res = await request(app)
      .post(`/api/contracts/${contractId}/return`)
      .set(authHeader(staffToken))
      .send({
        actualReturnAt: '2026-03-12T10:00:00.000Z',
        returnInspection: { mileage: 10050, fuelLevelPercent: 80, condition: 'INTACT' },
        fuelShortageLitres: 5,
      });
    expect(res.status).toBe(200);
    expect(res.body.contract.contractStatus).toBe('COMPLETED');
    expect(res.body.contract.vehicle?.status ?? res.body.contract.booking?.vehicle?.status).toBe(
      'AVAILABLE',
    );
  });

  it('sets vehicle to MAINTENANCE on damaged return', async () => {
    const { booking } = await createConfirmedBooking();
    const c = await request(app)
      .post('/api/contracts')
      .set(authHeader(staffToken))
      .send({
        bookingCode: booking.bookingCode,
        actualPickupAt: '2026-03-10T01:00:00.000Z',
        pickupInspection: { mileage: 10000, fuelLevelPercent: 100, condition: 'INTACT' },
      });
    const contractId = c.body.contract.contractId;
    const res = await request(app)
      .post(`/api/contracts/${contractId}/return`)
      .set(authHeader(staffToken))
      .send({
        actualReturnAt: '2026-03-12T10:00:00.000Z',
        returnInspection: { mileage: 10050, fuelLevelPercent: 80, condition: 'DAMAGED' },
        exteriorDamage: true,
        damageDescription: 'Scratched bumper',
      });
    expect(res.status).toBe(200);
    const veh = await prisma.vehicle.findUnique({
      where: { vehicleId: res.body.contract.booking.vehicle.vehicleId },
    });
    expect(veh!.status).toBe('MAINTENANCE');
  });

  it('generates invoice with correct totals', async () => {
    const { booking } = await createConfirmedBooking();
    const c = await request(app)
      .post('/api/contracts')
      .set(authHeader(staffToken))
      .send({
        bookingCode: booking.bookingCode,
        actualPickupAt: '2026-03-10T01:00:00.000Z',
        pickupInspection: { mileage: 10000, fuelLevelPercent: 100, condition: 'INTACT' },
      });
    const contractId = c.body.contract.contractId;
    await request(app)
      .post(`/api/contracts/${contractId}/return`)
      .set(authHeader(staffToken))
      .send({
        actualReturnAt: '2026-03-12T10:00:00.000Z',
        returnInspection: { mileage: 10050, fuelLevelPercent: 80, condition: 'INTACT' },
        fuelShortageLitres: 5,
      });
    const contract = await request(app)
      .get(`/api/contracts/${contractId}`)
      .set(authHeader(staffToken));
    const invoice = contract.body.contract.invoice;
    expect(invoice).toBeTruthy();
    expect(invoice.rentalFee).toBe(1000000);
    expect(invoice.depositApplied).toBe(100000);
    expect(invoice.finalAmountDue).toBe(900000);
  });

  it('prevents duplicate fine for same violation', async () => {
    const { booking } = await createConfirmedBooking();
    const c = await request(app)
      .post('/api/contracts')
      .set(authHeader(staffToken))
      .send({
        bookingCode: booking.bookingCode,
        actualPickupAt: '2026-03-10T01:00:00.000Z',
        pickupInspection: { mileage: 10000, fuelLevelPercent: 100, condition: 'INTACT' },
      });
    const contractId = c.body.contract.contractId;
    await prisma.fineRule.create({
      data: {
        code: 'LATE_X',
        name: 'Late',
        violationType: 'LATE_RETURN',
        calculationMethod: 'FIXED',
        rateAmount: 10000,
      },
    });
    const f1 = await request(app)
      .post('/api/fines')
      .set(authHeader(staffToken))
      .send({ contractId, violationType: 'LATE_RETURN', quantity: 1 });
    expect(f1.status).toBe(201);
    const f2 = await request(app)
      .post('/api/fines')
      .set(authHeader(staffToken))
      .send({ contractId, violationType: 'LATE_RETURN', quantity: 1 });
    expect(f2.status).toBe(409);
    expect(f2.body.code).toBe('FINE_EXISTS');
  });

  it('settles invoice and applies payment', async () => {
    const { booking } = await createConfirmedBooking();
    const c = await request(app)
      .post('/api/contracts')
      .set(authHeader(staffToken))
      .send({
        bookingCode: booking.bookingCode,
        actualPickupAt: '2026-03-10T01:00:00.000Z',
        pickupInspection: { mileage: 10000, fuelLevelPercent: 100, condition: 'INTACT' },
      });
    const contractId = c.body.contract.contractId;
    await request(app)
      .post(`/api/contracts/${contractId}/return`)
      .set(authHeader(staffToken))
      .send({
        actualReturnAt: '2026-03-12T10:00:00.000Z',
        returnInspection: { mileage: 10050, fuelLevelPercent: 80, condition: 'INTACT' },
      });
    const contract = await request(app)
      .get(`/api/contracts/${contractId}`)
      .set(authHeader(staffToken));
    const invoiceId = contract.body.contract.invoice.invoiceId;
    const res = await request(app)
      .post(`/api/invoices/${invoiceId}/settle`)
      .set(authHeader(staffToken))
      .send({
        amount: 900000,
        method: 'CASH',
        idempotencyKey: `settle-${Date.now()}`,
      });
    expect(res.status).toBe(200);
    expect(res.body.invoice.status).toBe('PAID');
  });

  it('prevents duplicate settlement', async () => {
    const { booking } = await createConfirmedBooking();
    const c = await request(app)
      .post('/api/contracts')
      .set(authHeader(staffToken))
      .send({
        bookingCode: booking.bookingCode,
        actualPickupAt: '2026-03-10T01:00:00.000Z',
        pickupInspection: { mileage: 10000, fuelLevelPercent: 100, condition: 'INTACT' },
      });
    const contractId = c.body.contract.contractId;
    await request(app)
      .post(`/api/contracts/${contractId}/return`)
      .set(authHeader(staffToken))
      .send({
        actualReturnAt: '2026-03-12T10:00:00.000Z',
        returnInspection: { mileage: 10050, fuelLevelPercent: 80, condition: 'INTACT' },
      });
    const contract = await request(app)
      .get(`/api/contracts/${contractId}`)
      .set(authHeader(staffToken));
    const invoiceId = contract.body.contract.invoice.invoiceId;
    const key = `settle-dup-${Date.now()}`;
    await request(app)
      .post(`/api/invoices/${invoiceId}/settle`)
      .set(authHeader(staffToken))
      .send({ amount: 900000, method: 'CASH', idempotencyKey: key });
    const res = await request(app)
      .post(`/api/invoices/${invoiceId}/settle`)
      .set(authHeader(staffToken))
      .send({ amount: 900000, method: 'CASH', idempotencyKey: `settle-dup2-${Date.now()}` });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVOICE_NOT_SETTLABLE');
  });

  it('protects PDF download (unauthenticated)', async () => {
    const { booking } = await createConfirmedBooking();
    const c = await request(app)
      .post('/api/contracts')
      .set(authHeader(staffToken))
      .send({
        bookingCode: booking.bookingCode,
        actualPickupAt: '2026-03-10T01:00:00.000Z',
        pickupInspection: { mileage: 10000, fuelLevelPercent: 100, condition: 'INTACT' },
      });
    const contractId = c.body.contract.contractId;
    const docId = c.body.contract.documents[0].documentId;
    const res = await request(app).get(`/api/contracts/${contractId}/documents/${docId}/download`);
    expect(res.status).toBe(401);
  });

  it('downloads PDF when authenticated', async () => {
    const { booking } = await createConfirmedBooking();
    const c = await request(app)
      .post('/api/contracts')
      .set(authHeader(staffToken))
      .send({
        bookingCode: booking.bookingCode,
        actualPickupAt: '2026-03-10T01:00:00.000Z',
        pickupInspection: { mileage: 10000, fuelLevelPercent: 100, condition: 'INTACT' },
      });
    const contractId = c.body.contract.contractId;
    const docId = c.body.contract.documents[0].documentId;
    const res = await request(app)
      .get(`/api/contracts/${contractId}/documents/${docId}/download`)
      .set(authHeader(staffToken));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
  });

  it('rejects unauthorized deposit (customer)', async () => {
    const bk = await request(app).post('/api/bookings').set(authHeader(customerToken)).send({
      vehicleId: vehicle.vehicleId,
      pickupDate: '2026-06-10',
      expectedReturnDate: '2026-06-12',
    });
    const res = await request(app)
      .post('/api/payments/deposit')
      .set(authHeader(customerToken))
      .send({
        bookingCode: bk.body.booking.bookingCode,
        amount: bk.body.booking.depositAmount,
        method: 'CASH',
        idempotencyKey: `x-${Date.now()}`,
      });
    expect(res.status).toBe(403);
  });
});
