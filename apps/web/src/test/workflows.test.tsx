import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import App from '../App.js';
import { AuthProvider } from '../contexts/AuthContext.js';
import { VehicleCatalogPage } from '../pages/VehicleCatalogPage.js';
import { BookingPage } from '../pages/BookingPage.js';
import { StaffReturnPage } from '../pages/StaffReturnPage.js';
import { AdminDashboardPage } from '../pages/AdminDashboardPage.js';

type Role = 'CUSTOMER' | 'STAFF' | 'ADMIN';

const vehicle = {
  vehicleId: 'v1',
  brand: 'Toyota',
  model: 'Vios',
  licensePlate: '59A-12345',
  manufactureYear: 2020,
  transmission: 'AUTO',
  fuelType: 'PETROL',
  seats: 5,
  dailyRate: 500000,
  currentMileage: 1000,
  status: 'AVAILABLE',
  category: { name: 'Sedan', depositRate: 10 },
  branch: { name: 'Main branch' },
};

const activeContract = {
  contractId: 'c1',
  contractNumber: 'CT-TEST',
  contractStatus: 'ACTIVE',
  actualPickupAt: '2026-11-20T02:00:00.000Z',
  expectedReturnDate: '2026-11-22',
  actualReturnAt: null,
  completedAt: null,
  booking: {
    vehicle: { brand: 'Toyota', model: 'Vios', licensePlate: '59A-12345', status: 'RENTED' },
    customer: { user: { fullName: 'Nguyen Van A', email: 'a@test.com' } },
  },
  inspections: [{ inspectionType: 'PICKUP', mileage: 12345, fuelLevelPercent: 80 }],
  fines: [],
  invoice: null,
  documents: [],
};

let currentRole: Role = 'CUSTOMER';
let fetchMock: ReturnType<typeof vi.fn>;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function userForRole(role: Role) {
  return {
    userId: `u-${role.toLowerCase()}`,
    fullName: `User ${role}`,
    email: `${role.toLowerCase()}@test.com`,
    phone: '0900000000',
    role,
    accountStatus: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

function createFetchMock() {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';

    if (url.includes('/api/auth/me')) return jsonResponse({ user: userForRole(currentRole) });
    if (url.includes('/api/vehicle-categories')) {
      return jsonResponse({ items: [{ categoryId: 1, name: 'Sedan', depositRate: 10 }] });
    }
    if (url.includes('/api/vehicles/catalog')) return jsonResponse({ items: [vehicle], total: 1 });
    if (url.includes('/api/vehicles/v1')) return jsonResponse({ vehicle });
    if (url === '/api/bookings' && method === 'POST') {
      return jsonResponse(
        { booking: { bookingCode: 'BK-TEST-1', bookingStatus: 'PENDING_PAYMENT' } },
        201,
      );
    }
    if (url.includes('/api/contracts?status=ACTIVE')) {
      return jsonResponse({ items: [activeContract] });
    }
    if (url.includes('/api/contracts/c1/return') && method === 'POST') {
      return jsonResponse({
        contract: {
          ...activeContract,
          contractStatus: 'COMPLETED',
          booking: {
            ...activeContract.booking,
            vehicle: { ...activeContract.booking.vehicle, status: 'AVAILABLE' },
          },
        },
      });
    }
    if (url.includes('/api/admin/dashboard')) {
      return jsonResponse({
        users: { total: 7, customers: 5, staff: 1, admins: 1 },
        vehicles: { total: 4, available: 2, rented: 1, maintenance: 1, retired: 0 },
        bookings: { total: 9, pending: 2, confirmed: 3, converted: 3, cancelled: 1 },
        contracts: { active: 3, completed: 6 },
        unpaidFines: 1,
        totalRevenue: 1234567,
      });
    }

    throw new Error(`Unexpected fetch: ${method} ${url}`);
  });
}

beforeEach(() => {
  currentRole = 'CUSTOMER';
  localStorage.clear();
  fetchMock = createFetchMock();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderWithProviders(ui: React.ReactNode, initialEntry = '/') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>,
  );
}

describe('Phase 4a frontend workflows', () => {
  it('sends the catalog search term to the real catalog API', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <VehicleCatalogPage />
      </MemoryRouter>,
    );

    await screen.findByText('Toyota Vios');
    await user.type(screen.getByPlaceholderText('Tên xe, hãng...'), 'Vios');
    await user.click(screen.getByRole('button', { name: 'Tìm kiếm' }));

    await waitFor(() => {
      const catalogCalls = fetchMock.mock.calls.filter(([url]) =>
        String(url).startsWith('/api/vehicles/catalog'),
      );
      expect(catalogCalls.length).toBeGreaterThan(1);
      expect(String(catalogCalls[catalogCalls.length - 1][0])).toContain('search=Vios');
    });
  });

  it('creates a customer booking through the API and shows the booking code', async () => {
    currentRole = 'CUSTOMER';
    localStorage.setItem('vrs_token', 'test-token');
    const user = userEvent.setup();
    renderWithProviders(<BookingPage />, '/bookings/new?vehicleId=v1');

    await screen.findByRole('heading', { name: 'Đặt xe' });
    await user.type(screen.getByLabelText('Ngày nhận xe'), '2026-12-10');
    await user.type(screen.getByLabelText('Ngày trả xe'), '2026-12-12');
    await user.click(screen.getByRole('button', { name: 'Xác nhận đặt xe' }));

    expect(await screen.findByText(/Đặt xe thành công! Mã đặt xe: BK-TEST-1/)).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/bookings',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('pre-fills pickup mileage from contract inspections on the staff return page', async () => {
    currentRole = 'STAFF';
    localStorage.setItem('vrs_token', 'test-token');
    const user = userEvent.setup();
    renderWithProviders(<StaffReturnPage />, '/staff/returns');

    await screen.findByText('Trả xe');
    await user.selectOptions(screen.getByRole('combobox'), 'c1');

    const mileageInput = screen.getByLabelText('Số km cuối') as HTMLInputElement;
    const fuelInput = screen.getByLabelText('Mức nhiên liệu cuối (%)') as HTMLInputElement;
    expect(mileageInput.value).toBe('12345');
    expect(fuelInput.value).toBe('80');

    await user.click(screen.getByRole('button', { name: 'Hoàn tất trả xe' }));
    expect(await screen.findByText('Hoàn tất trả xe')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/contracts/c1/return',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('renders real admin dashboard statistics from the API', async () => {
    currentRole = 'ADMIN';
    localStorage.setItem('vrs_token', 'test-token');
    renderWithProviders(<AdminDashboardPage />, '/admin');

    expect(await screen.findByRole('heading', { name: 'Bảng điều khiển quản trị' })).toBeTruthy();
    expect(screen.getAllByText('Tổng: 7').length).toBeGreaterThan(0);
    expect(screen.getByText('Doanh thu: 1.234.567 đ')).toBeTruthy();
  });

  it('redirects staff away from customer-only booking routes', async () => {
    currentRole = 'STAFF';
    localStorage.setItem('vrs_token', 'test-token');
    window.history.pushState({}, '', '/bookings');
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Bảng điều khiển' })).toBeTruthy();
    await waitFor(() => expect(window.location.pathname).toBe('/dashboard'));
  });

  it('exposes staff navigation links in the navbar', async () => {
    currentRole = 'STAFF';
    localStorage.setItem('vrs_token', 'test-token');
    window.history.pushState({}, '', '/staff');
    render(<App />);

    const handoverLink = await screen.findByRole('link', { name: 'Bàn giao' });
    expect(handoverLink.getAttribute('href')).toBe('/staff/handover');
    expect(
      screen
        .getAllByRole('link', { name: 'Hợp đồng' })
        .some((link) => link.getAttribute('href') === '/staff/contracts'),
    ).toBe(true);
  });
});
