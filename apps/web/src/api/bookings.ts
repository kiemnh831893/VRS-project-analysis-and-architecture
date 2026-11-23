import { apiFetch } from './client.js';

export interface Booking {
  bookingId: string;
  bookingCode: string;
  customerId: string;
  vehicleId: string;
  pickupBranchId: string;
  returnBranchId: string;
  pickupDate: string;
  expectedReturnDate: string;
  rentalDays: number;
  dailyRateSnapshot: number;
  rentalSubtotal: number;
  depositRateSnapshot: number;
  depositAmount: number;
  insuranceFee: number;
  totalEstimatedCost: number;
  currency: string;
  bookingStatus: string;
  holdExpiresAt: string;
  confirmedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  convertedAt: string | null;
  availabilityReleasedAt: string | null;
  createdAt: string;
  vehicle?: {
    brand: string;
    model: string;
    licensePlate: string;
    category?: { name: string };
    branch?: { name: string };
  };
}

export interface CreateBookingInput {
  vehicleId: string;
  pickupDate: string;
  expectedReturnDate: string;
  pickupBranchId?: string;
  returnBranchId?: string;
  insurancePackageId?: string | null;
}

export async function createBooking(input: CreateBookingInput): Promise<Booking> {
  const res = await apiFetch<{ booking: Booking }>('/api/bookings', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return res.booking;
}

export async function fetchMyBookings(): Promise<Booking[]> {
  const res = await apiFetch<{ items: Booking[] }>('/api/bookings/me');
  return res.items;
}

export async function fetchBooking(id: string): Promise<Booking> {
  const res = await apiFetch<{ booking: Booking }>(`/api/bookings/${id}`);
  return res.booking;
}
