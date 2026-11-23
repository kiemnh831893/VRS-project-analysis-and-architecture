import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { ErrorState, Loading } from '../components/Status.js';
import { apiFetch } from '../api/client.js';
import type { Vehicle } from '../api/vehicles.js';

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  AVAILABLE: ['RENTED', 'MAINTENANCE', 'RETIRED'],
  RENTED: ['AVAILABLE', 'MAINTENANCE'],
  MAINTENANCE: ['AVAILABLE', 'RETIRED'],
  RETIRED: [],
};

const ALL_STATUSES = ['AVAILABLE', 'RENTED', 'MAINTENANCE', 'RETIRED'];

export function StaffVehiclesPage() {
  const location = useLocation();
  const isAdminArea = location.pathname.startsWith('/admin');
  const basePath = isAdminArea ? '/admin/vehicles' : '/staff/vehicles';
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetchVehicles({ pageSize: 100 });
      setVehicles(res.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi tải danh sách xe');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  async function changeStatus(id: string, status: string) {
    try {
      await apiFetch(`/api/vehicles/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Lỗi');
    }
  }

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} />;

  return (
    <section>
      <h1>Quản lý xe</h1>
      <div className="dashboard-links">
        <Link to={`${basePath}/new`} className="btn btn--primary">
          Thêm xe
        </Link>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Hãng/Model</th>
              <th>Biển số</th>
              <th>Loại</th>
              <th>Trạng thái</th>
              <th>Giá/ngày</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.length === 0 && (
              <tr>
                <td colSpan={6}>Không có xe nào.</td>
              </tr>
            )}
            {vehicles.map((v) => (
              <tr key={v.vehicleId}>
                <td>
                  {v.brand} {v.model}
                </td>
                <td>{v.licensePlate}</td>
                <td>{v.category.name}</td>
                <td>{v.status}</td>
                <td>{v.dailyRate.toLocaleString('vi-VN')}</td>
                <td>
                  <select
                    value={v.status}
                    onChange={(e) => changeStatus(v.vehicleId, e.target.value)}
                  >
                    {ALL_STATUSES.map((status) => (
                      <option
                        key={status}
                        value={status}
                        disabled={
                          status !== v.status && !ALLOWED_TRANSITIONS[v.status]?.includes(status)
                        }
                      >
                        {status}
                      </option>
                    ))}
                  </select>
                  <Link to={`${basePath}/${v.vehicleId}/edit`} className="btn btn--ghost">
                    Sửa
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

async function fetchVehicles(filters: { pageSize?: number }) {
  const params = new URLSearchParams();
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
  const res = await apiFetch<{ items: Vehicle[]; total: number }>(
    `/api/vehicles?${params.toString()}`,
  );
  return res;
}
