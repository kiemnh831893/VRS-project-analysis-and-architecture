/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';

import { ErrorState, Loading } from '../components/Status.js';
import { apiFetch } from '../api/client.js';

export function AdminReportsPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [revenue, setRevenue] = useState<any>(null);
  const [newCustomers, setNewCustomers] = useState<any>(null);
  const [fines, setFines] = useState<any>(null);
  const [utilization, setUtilization] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [r, c, f, u] = await Promise.all([
        apiFetch<any>(`/api/reports/revenue?year=${year}`),
        apiFetch<any>(`/api/reports/new-customers?year=${year}`),
        apiFetch<any>(`/api/reports/fines?year=${year}`),
        apiFetch<any>(`/api/reports/fleet-utilization`),
      ]);
      setRevenue(r);
      setNewCustomers(c);
      setFines(f);
      setUtilization(u);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi tải');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [year]);

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} />;

  return (
    <section>
      <h1>Báo cáo</h1>
      <label>
        Năm
        <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
      </label>
      <button className="btn btn--primary" onClick={() => void load()}>
        Tải lại
      </button>

      {revenue && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <h2>Doanh thu theo tháng</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Tháng</th>
                <th>Doanh thu (đ)</th>
                <th>Số hóa đơn</th>
              </tr>
            </thead>
            <tbody>
              {revenue.months.map((m: any) => (
                <tr key={m.month}>
                  <td>{m.month}</td>
                  <td>{m.revenue.toLocaleString('vi-VN')}</td>
                  <td>{m.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {newCustomers && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <h2>Khách hàng mới theo tháng</h2>
          <p>Tổng: {newCustomers.total}</p>
          <table className="table">
            <thead>
              <tr>
                <th>Tháng</th>
                <th>Số lượng</th>
              </tr>
            </thead>
            <tbody>
              {newCustomers.months.map((m: any) => (
                <tr key={m.month}>
                  <td>{m.month}</td>
                  <td>{m.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {fines && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <h2>Phạt theo loại</h2>
          <p>Tổng: {fines.total.toLocaleString('vi-VN')} đ</p>
          <ul>
            {Object.entries(fines.byType).map(([k, v]) => (
              <li key={k}>
                {k}: {Number(v).toLocaleString('vi-VN')} đ
              </li>
            ))}
          </ul>
        </div>
      )}

      {utilization && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <h2>Sử dụng xe</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Xe</th>
                <th>Biển số</th>
                <th>Ngày thuê</th>
                <th>Tổng ngày</th>
                <th>Tỷ lệ (%)</th>
              </tr>
            </thead>
            <tbody>
              {utilization.vehicles.map((v: any) => (
                <tr key={v.vehicleId}>
                  <td>
                    {v.brand} {v.model}
                  </td>
                  <td>{v.licensePlate}</td>
                  <td>{v.rentedDays}</td>
                  <td>{v.totalDays}</td>
                  <td>{v.utilizationPercent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
