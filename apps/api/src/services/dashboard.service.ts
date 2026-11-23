import { prisma } from '../lib/prisma.js';

export async function getDashboardStats() {
  const [
    totalUsers,
    customers,
    staff,
    admins,
    totalVehicles,
    availableVehicles,
    rentedVehicles,
    maintenanceVehicles,
    retiredVehicles,
    totalBookings,
    pendingBookings,
    confirmedBookings,
    convertedBookings,
    cancelledBookings,
    activeContracts,
    completedContracts,
    unpaidFines,
    totalRevenue,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'CUSTOMER' } }),
    prisma.user.count({ where: { role: 'STAFF' } }),
    prisma.user.count({ where: { role: 'ADMIN' } }),
    prisma.vehicle.count(),
    prisma.vehicle.count({ where: { status: 'AVAILABLE' } }),
    prisma.vehicle.count({ where: { status: 'RENTED' } }),
    prisma.vehicle.count({ where: { status: 'MAINTENANCE' } }),
    prisma.vehicle.count({ where: { status: 'RETIRED' } }),
    prisma.booking.count(),
    prisma.booking.count({ where: { bookingStatus: 'PENDING_PAYMENT' } }),
    prisma.booking.count({ where: { bookingStatus: 'CONFIRMED' } }),
    prisma.booking.count({ where: { bookingStatus: 'CONVERTED_TO_CONTRACT' } }),
    prisma.booking.count({ where: { bookingStatus: 'CANCELLED' } }),
    prisma.rentalContract.count({ where: { contractStatus: 'ACTIVE' } }),
    prisma.rentalContract.count({ where: { contractStatus: 'COMPLETED' } }),
    prisma.fineRecord.count({ where: { status: 'UNPAID' } }),
    prisma.invoice.aggregate({ _sum: { amountPaid: true }, where: { status: 'PAID' } }),
  ]);

  return {
    users: { total: totalUsers, customers, staff, admins },
    vehicles: {
      total: totalVehicles,
      available: availableVehicles,
      rented: rentedVehicles,
      maintenance: maintenanceVehicles,
      retired: retiredVehicles,
    },
    bookings: {
      total: totalBookings,
      pending: pendingBookings,
      confirmed: confirmedBookings,
      converted: convertedBookings,
      cancelled: cancelledBookings,
    },
    contracts: { active: activeContracts, completed: completedContracts },
    unpaidFines,
    totalRevenue: Number(totalRevenue._sum.amountPaid ?? 0),
  };
}
