import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { env } from '../src/config/env.js';

const app = createApp();
const stamp = Date.now().toString(36).toUpperCase();

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

function signToken(userId: string, role: 'ADMIN' | 'STAFF' | 'CUSTOMER', expiresIn = '1d') {
  return jwt.sign({ sub: userId, role }, env.jwtSecret, {
    expiresIn: expiresIn as jwt.SignOptions['expiresIn'],
  });
}

async function createUser(input: {
  email: string;
  phone: string;
  nationalId: string;
  role: 'ADMIN' | 'STAFF' | 'CUSTOMER';
  branchId?: string;
  withCustomerProfile?: boolean;
}) {
  const passwordHash = await bcrypt.hash('password123', 10);
  return prisma.user.create({
    data: {
      fullName: `Security ${input.role}`,
      email: input.email,
      phone: input.phone,
      nationalId: input.nationalId,
      passwordHash,
      role: input.role,
      ...(input.branchId
        ? {
            rentalStaff: {
              create: { employeeCode: `SEC-${input.nationalId}`, branchId: input.branchId },
            },
          }
        : {}),
      ...(input.withCustomerProfile ? { customer: { create: {} } } : {}),
    },
  });
}

async function createVehicle(branchId: string, categoryId: number, plate: string) {
  return prisma.vehicle.create({
    data: {
      categoryId,
      branchId,
      licensePlate: plate,
      brand: 'Toyota',
      model: 'Vios',
      manufactureYear: 2020,
      transmission: 'AUTO',
      fuelType: 'PETROL',
      seats: 5,
      dailyRate: 500000,
    },
  });
}

describe('Phase 4a: Security and data integrity', () => {
  let adminToken: string;
  let staffToken: string;
  let customerAToken: string;
  let customerBToken: string;
  let customerAId: string;
  let branchId: string;
  let categoryId: number;
  let vehicleId: string;

  beforeAll(async () => {
    const branch = await prisma.branch.create({
      data: { code: 'SECBR', name: 'Security Branch', address: '1 Security Street' },
    });
    branchId = branch.branchId;

    const category = await prisma.vehicleCategory.create({
      data: { name: `SecCat${stamp}`, depositRate: 10 },
    });
    categoryId = category.categoryId;

    const vehicle = await createVehicle(branchId, categoryId, `SEC-${stamp}`);
    vehicleId = vehicle.vehicleId;

    const admin = await createUser({
      email: `sec-admin-${stamp}@test.com`,
      phone: '0930000001',
      nationalId: `SEC-A-${stamp}`,
      role: 'ADMIN',
    });
    adminToken = signToken(admin.userId, 'ADMIN');

    const staff = await createUser({
      email: `sec-staff-${stamp}@test.com`,
      phone: '0930000002',
      nationalId: `SEC-S-${stamp}`,
      role: 'STAFF',
      branchId,
    });
    staffToken = signToken(staff.userId, 'STAFF');

    const customerA = await createUser({
      email: `sec-custa-${stamp}@test.com`,
      phone: '0930000003',
      nationalId: `SEC-CA-${stamp}`,
      role: 'CUSTOMER',
      withCustomerProfile: true,
    });
    customerAId = customerA.userId;
    customerAToken = signToken(customerA.userId, 'CUSTOMER');
    await prisma.customer.update({
      where: { userId: customerA.userId },
      data: {
        driverLicenseNo: `SECDL-${stamp}`,
        licenseImageKey: `sec-license-${stamp}`,
        licenseStatus: 'VERIFIED',
        licenseReviewedAt: new Date(),
      },
    });

    const customerB = await createUser({
      email: `sec-custb-${stamp}@test.com`,
      phone: '0930000004',
      nationalId: `SEC-CB-${stamp}`,
      role: 'CUSTOMER',
      withCustomerProfile: true,
    });
    customerBToken = signToken(customerB.userId, 'CUSTOMER');
    await prisma.customer.update({
      where: { userId: customerB.userId },
      data: {
        driverLicenseNo: `SECDL-B-${stamp}`,
        licenseImageKey: `sec-license-b-${stamp}`,
        licenseStatus: 'VERIFIED',
        licenseReviewedAt: new Date(),
      },
    });
  });

  it('rejects expired, malformed, and locked-account tokens', async () => {
    const expired = signToken(customerAId, 'CUSTOMER', '-10s');
    const expiredRes = await request(app).get('/api/auth/me').set(authHeader(expired));
    expect(expiredRes.status).toBe(401);

    const malformed = await request(app).get('/api/auth/me').set(authHeader('not-a-jwt'));
    expect(malformed.status).toBe(401);

    const locked = await createUser({
      email: `sec-locked-${stamp}@test.com`,
      phone: '0930000005',
      nationalId: `SEC-L-${stamp}`,
      role: 'CUSTOMER',
      withCustomerProfile: true,
    });
    const tokenBeforeLock = signToken(locked.userId, 'CUSTOMER');
    await prisma.user.update({
      where: { userId: locked.userId },
      data: { accountStatus: 'LOCKED' },
    });
    const lockedRes = await request(app).get('/api/auth/me').set(authHeader(tokenBeforeLock));
    expect(lockedRes.status).toBe(403);
    expect(lockedRes.body.code).toBe('ACCOUNT_LOCKED');
  });

  it('enforces role restrictions on customer, staff, and admin endpoints', async () => {
    const customerForbidden: [string, string][] = [
      ['post', '/api/branches'],
      ['post', '/api/vehicle-categories'],
      ['post', '/api/vehicles'],
      ['post', '/api/payments/deposit'],
      ['post', '/api/bookings/expire-pending'],
      ['get', '/api/users'],
      ['get', '/api/fine-rules'],
      ['get', '/api/reports/revenue'],
      ['get', '/api/audit-logs'],
      ['get', '/api/admin/dashboard'],
    ];
    for (const [method, path] of customerForbidden) {
      const res = await request(app)[method](path).set(authHeader(customerAToken)).send({});
      expect(res.status, `${method.toUpperCase()} ${path} as CUSTOMER`).toBe(403);
    }

    const staffForbidden: [string, string][] = [
      ['post', '/api/branches'],
      ['post', '/api/bookings/expire-pending'],
      ['get', '/api/users'],
      ['get', '/api/fine-rules'],
      ['get', '/api/reports/revenue'],
      ['get', '/api/audit-logs'],
      ['get', '/api/admin/dashboard'],
    ];
    for (const [method, path] of staffForbidden) {
      const res = await request(app)[method](path).set(authHeader(staffToken)).send({});
      expect(res.status, `${method.toUpperCase()} ${path} as STAFF`).toBe(403);
    }

    const adminForbidden: [string, string][] = [
      ['post', '/api/bookings'],
      ['get', '/api/bookings/me'],
    ];
    for (const [method, path] of adminForbidden) {
      const res = await request(app)[method](path).set(authHeader(adminToken)).send({});
      expect(res.status, `${method.toUpperCase()} ${path} as ADMIN`).toBe(403);
    }
  });

  async function createConfirmedContract() {
    const bookingRes = await request(app)
      .post('/api/bookings')
      .set(authHeader(customerAToken))
      .send({
        vehicleId,
        pickupDate: '2027-01-10',
        expectedReturnDate: '2027-01-12',
      });
    expect(bookingRes.status).toBe(201);
    const booking = bookingRes.body.booking;

    const depositRes = await request(app)
      .post('/api/payments/deposit')
      .set(authHeader(staffToken))
      .send({
        bookingCode: booking.bookingCode,
        amount: booking.depositAmount,
        method: 'CASH',
        idempotencyKey: `sec-dep-${stamp}`,
      });
    expect(depositRes.status).toBe(201);

    const contractRes = await request(app)
      .post('/api/contracts')
      .set(authHeader(staffToken))
      .send({
        bookingCode: booking.bookingCode,
        actualPickupAt: '2027-01-10T02:00:00.000Z',
        pickupInspection: { mileage: 1000, fuelLevelPercent: 100, condition: 'INTACT' },
      });
    expect(contractRes.status).toBe(201);
    const contract = contractRes.body.contract;

    const invoiceRes = await request(app)
      .post('/api/invoices')
      .set(authHeader(staffToken))
      .send({ contractId: contract.contractId });
    expect(invoiceRes.status).toBe(201);

    return { booking, contract, invoice: invoiceRes.body.invoice };
  }

  it("isolates one customer's booking, contract, invoice, and PDF from another customer", async () => {
    const { booking, contract, invoice } = await createConfirmedContract();
    const document = contract.documents.find(
      (d: { documentType: string }) => d.documentType === 'RENTAL_CONTRACT',
    );
    expect(document).toBeDefined();

    expect(
      (await request(app).get(`/api/bookings/${booking.bookingId}`).set(authHeader(customerAToken)))
        .status,
    ).toBe(200);
    expect(
      (await request(app).get(`/api/bookings/${booking.bookingId}`).set(authHeader(customerBToken)))
        .status,
    ).toBe(403);

    expect(
      (
        await request(app)
          .get(`/api/contracts/${contract.contractId}`)
          .set(authHeader(customerAToken))
      ).status,
    ).toBe(200);
    expect(
      (
        await request(app)
          .get(`/api/contracts/${contract.contractId}`)
          .set(authHeader(customerBToken))
      ).status,
    ).toBe(403);

    expect(
      (await request(app).get(`/api/invoices/${invoice.invoiceId}`).set(authHeader(customerAToken)))
        .status,
    ).toBe(200);
    expect(
      (await request(app).get(`/api/invoices/${invoice.invoiceId}`).set(authHeader(customerBToken)))
        .status,
    ).toBe(403);

    const ownerDownload = await request(app)
      .get(`/api/contracts/${contract.contractId}/documents/${document.documentId}/download`)
      .set(authHeader(customerAToken));
    expect(ownerDownload.status).toBe(200);

    const otherDownload = await request(app)
      .get(`/api/contracts/${contract.contractId}/documents/${document.documentId}/download`)
      .set(authHeader(customerBToken));
    expect(otherDownload.status).toBe(403);
  });

  it('does not expose password hashes or license image keys', async () => {
    const staffList = await request(app).get('/api/users').set(authHeader(adminToken));
    expect(staffList.status).toBe(200);
    expect(JSON.stringify(staffList.body)).not.toContain('passwordHash');
    expect(JSON.stringify(staffList.body)).not.toContain('failedLoginCount');

    const bookingRes = await request(app)
      .post('/api/bookings')
      .set(authHeader(customerAToken))
      .send({
        vehicleId,
        pickupDate: '2027-03-10',
        expectedReturnDate: '2027-03-12',
      });
    expect(bookingRes.status).toBe(201);
    const detail = await request(app)
      .get(`/api/bookings/${bookingRes.body.booking.bookingId}`)
      .set(authHeader(customerAToken));
    expect(detail.status).toBe(200);
    expect(JSON.stringify(detail.body)).not.toContain('passwordHash');
    expect(JSON.stringify(detail.body)).not.toContain('licenseImageKey');
    expect(JSON.stringify(detail.body)).not.toContain('driverLicenseNo');
  });

  it('rejects overlapping bookings without leaving extra booking rows', async () => {
    const overlapVehicle = await createVehicle(branchId, categoryId, `SECO-${stamp}`);
    const first = await request(app).post('/api/bookings').set(authHeader(customerAToken)).send({
      vehicleId: overlapVehicle.vehicleId,
      pickupDate: '2027-04-10',
      expectedReturnDate: '2027-04-12',
    });
    expect(first.status).toBe(201);

    const second = await request(app).post('/api/bookings').set(authHeader(customerAToken)).send({
      vehicleId: overlapVehicle.vehicleId,
      pickupDate: '2027-04-11',
      expectedReturnDate: '2027-04-13',
    });
    expect(second.status).toBe(409);

    const count = await prisma.booking.count({ where: { vehicleId: overlapVehicle.vehicleId } });
    expect(count).toBe(1);
  });

  it('returns the original payment for a repeated deposit idempotency key', async () => {
    const paymentVehicle = await createVehicle(branchId, categoryId, `SECP-${stamp}`);
    const bookingRes = await request(app)
      .post('/api/bookings')
      .set(authHeader(customerAToken))
      .send({
        vehicleId: paymentVehicle.vehicleId,
        pickupDate: '2027-05-10',
        expectedReturnDate: '2027-05-12',
      });
    expect(bookingRes.status).toBe(201);
    const key = `sec-idem-${stamp}`;
    const payload = {
      bookingCode: bookingRes.body.booking.bookingCode,
      amount: bookingRes.body.booking.depositAmount,
      method: 'CASH',
      idempotencyKey: key,
    };

    const first = await request(app)
      .post('/api/payments/deposit')
      .set(authHeader(staffToken))
      .send(payload);
    expect(first.status).toBe(201);
    expect(first.body.alreadyConfirmed).toBe(false);

    const second = await request(app)
      .post('/api/payments/deposit')
      .set(authHeader(staffToken))
      .send(payload);
    expect(second.status).toBe(201);
    expect(second.body.alreadyConfirmed).toBe(true);
    expect(second.body.payment.paymentId).toBe(first.body.payment.paymentId);

    const payments = await prisma.paymentTransaction.count({
      where: { idempotencyKey: key },
    });
    expect(payments).toBe(1);
  });

  it('prevents updates and deletion of audit log rows at the database level', async () => {
    const log = await prisma.auditLog.create({
      data: {
        actorUserId: customerAId,
        actorRole: 'CUSTOMER',
        action: 'SECURITY_TEST',
        entityType: 'test',
        outcome: 'SUCCESS',
      },
    });

    await expect(
      prisma.auditLog.update({ where: { logId: log.logId }, data: { reason: 'tampered' } }),
    ).rejects.toThrow();
    await expect(prisma.auditLog.delete({ where: { logId: log.logId } })).rejects.toThrow();

    const stillPresent = await prisma.auditLog.findUnique({ where: { logId: log.logId } });
    expect(stillPresent).not.toBeNull();
  });
});
