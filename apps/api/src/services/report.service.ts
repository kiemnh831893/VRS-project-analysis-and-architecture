import { prisma } from '../lib/prisma.js';

export async function monthlyRevenue(year: number) {
  const start = new Date(`${year}-01-01T00:00:00.000Z`);
  const end = new Date(`${year + 1}-01-01T00:00:00.000Z`);
  const invoices = await prisma.invoice.findMany({
    where: { status: 'PAID', paidAt: { gte: start, lt: end } },
    select: { amountPaid: true, paidAt: true },
  });
  const buckets = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, revenue: 0, count: 0 }));
  for (const inv of invoices) {
    if (!inv.paidAt) continue;
    const m = inv.paidAt.getUTCMonth();
    buckets[m]!.revenue += Number(inv.amountPaid);
    buckets[m]!.count += 1;
  }
  return { year, months: buckets };
}

export async function fleetUtilization(from: string, to: string) {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const totalDays = Math.max(
    1,
    Math.round((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000)),
  );

  const vehicles = await prisma.vehicle.findMany({
    select: { vehicleId: true, brand: true, model: true, licensePlate: true, status: true },
  });
  const bookings = await prisma.booking.findMany({
    where: {
      pickupDate: { lt: toDate },
      expectedReturnDate: { gt: fromDate },
      bookingStatus: { in: ['CONFIRMED', 'CONVERTED_TO_CONTRACT'] },
    },
    select: { vehicleId: true, pickupDate: true, expectedReturnDate: true },
  });

  const utilization = vehicles.map((v) => {
    let rentedDays = 0;
    for (const b of bookings) {
      if (b.vehicleId !== v.vehicleId) continue;
      const start = new Date(Math.max(b.pickupDate.getTime(), fromDate.getTime()));
      const end = new Date(Math.min(b.expectedReturnDate.getTime(), toDate.getTime()));
      const days = Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
      if (days > 0) rentedDays += days;
    }
    return {
      vehicleId: v.vehicleId,
      brand: v.brand,
      model: v.model,
      licensePlate: v.licensePlate,
      status: v.status,
      rentedDays,
      totalDays,
      utilizationPercent: Math.round((rentedDays / totalDays) * 100),
    };
  });

  return { from, to, totalDays, vehicles: utilization };
}

export async function newCustomers(year: number) {
  const start = new Date(`${year}-01-01T00:00:00.000Z`);
  const end = new Date(`${year + 1}-01-01T00:00:00.000Z`);
  const customers = await prisma.customer.findMany({
    where: { createdAt: { gte: start, lt: end } },
    select: { createdAt: true },
  });
  const buckets = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, count: 0 }));
  for (const c of customers) {
    const m = c.createdAt.getUTCMonth();
    buckets[m]!.count += 1;
  }
  return { year, months: buckets, total: customers.length };
}

export async function finesByPeriod(year: number, month?: number) {
  const start = month
    ? new Date(`${year}-${String(month).padStart(2, '0')}-01T00:00:00.000Z`)
    : new Date(`${year}-01-01T00:00:00.000Z`);
  const end = month
    ? new Date(new Date(start).setUTCMonth(start.getUTCMonth() + 1))
    : new Date(`${year + 1}-01-01T00:00:00.000Z`);

  const fines = await prisma.fineRecord.findMany({
    where: { assessedAt: { gte: start, lt: end } },
    select: { violationType: true, amount: true, status: true, assessedAt: true },
  });

  const byType: Record<string, number> = {};
  let total = 0;
  for (const f of fines) {
    byType[f.violationType] = (byType[f.violationType] ?? 0) + Number(f.amount);
    total += Number(f.amount);
  }
  return { year, month: month ?? null, total, byType, count: fines.length };
}
