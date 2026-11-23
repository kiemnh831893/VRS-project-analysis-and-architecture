import { apiFetch } from './client.js';

export interface VehicleCategory {
  categoryId: number;
  name: string;
  depositRate: number;
  description: string | null;
  isActive: boolean;
}

export interface VehicleBranch {
  branchId: string;
  code: string;
  name: string;
  address: string;
  timezone: string;
}

export interface Vehicle {
  vehicleId: string;
  categoryId: number;
  branchId: string;
  parkingLocationId: string | null;
  licensePlate: string;
  brand: string;
  model: string;
  manufactureYear: number;
  transmission: 'AUTO' | 'MANUAL';
  fuelType: string;
  seats: number;
  dailyRate: number;
  currentMileage: number;
  status: string;
  category: VehicleCategory;
  branch: VehicleBranch;
}

export interface CatalogResponse {
  items: Vehicle[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CatalogFilters {
  categoryId?: number;
  brand?: string;
  transmission?: 'AUTO' | 'MANUAL';
  minSeats?: number;
  maxDailyRate?: number;
  pickupDate?: string;
  expectedReturnDate?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export async function fetchCategories(): Promise<VehicleCategory[]> {
  const res = await apiFetch<{ items: VehicleCategory[] }>('/api/vehicle-categories');
  return res.items;
}

export async function fetchCatalog(filters: CatalogFilters): Promise<CatalogResponse> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  });
  return apiFetch<CatalogResponse>(`/api/vehicles/catalog?${params.toString()}`);
}

export async function fetchVehicle(id: string): Promise<Vehicle> {
  const res = await apiFetch<{ vehicle: Vehicle }>(`/api/vehicles/${id}`);
  return res.vehicle;
}
