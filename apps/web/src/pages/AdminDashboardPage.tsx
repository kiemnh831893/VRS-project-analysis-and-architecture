import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { ErrorState, Loading } from '../components/Status.js';
import { apiFetch } from '../api/client.js';

interface DashboardStats {
  users: { total: number; customers: number; staff: number; admins: number };
  vehicles: {
    total: number;
    available: number;
    rented: number;
    maintenance: number;
    retired: number;
  };
  bookings: {
    total: number;
    pending: number;
    confirmed: number;
    converted: number;
    cancelled: number;
  };
  contracts: { active: number; completed: number };
  unpaidFines: number;
  totalRevenue: number;
}

export function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<DashboardStats>('/api/admin/dashboard')
      .then(setStats)
      .catch((e) => setError(e instanceof Error ? e.message : 'Lỗi tải'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} />;

  return (
    <section>
      <h1>Bảng điều khiển quản trị</h1>
      {stats && (
        <div className="stats-grid">
          <div className="card stat-card">
            <h3>Người dùng</h3>
            <p>Tổng: {stats.users.total}</p>
            <p>Khách hàng: {stats.users.customers}</p>
            <p>Nhân viên: {stats.users.staff}</p>
            <p>Quản trị: {stats.users.admins}</p>
          </div>
          <div className="card stat-card">
            <h3>Xe</h3>
            <p>Tổng: {stats.vehicles.total}</p>
            <p>Sẵn sàng: {stats.vehicles.available}</p>
            <p>Đang thuê: {stats.vehicles.rented}</p>
            <p>Bảo trì: {stats.vehicles.maintenance}</p>
          </div>
          <div className="card stat-card">
            <h3>Đặt xe</h3>
            <p>Tổng: {stats.bookings.total}</p>
            <p>Chờ thanh toán: {stats.bookings.pending}</p>
            <p>Đã xác nhận: {stats.bookings.confirmed}</p>
            <p>Đang thuê: {stats.bookings.converted}</p>
            <p>Đã hủy: {stats.bookings.cancelled}</p>
          </div>
          <div className="card stat-card">
            <h3>Hợp đồng & Doanh thu</h3>
            <p>Đang thuê: {stats.contracts.active}</p>
            <p>Hoàn thành: {stats.contracts.completed}</p>
            <p>Phạt chưa trả: {stats.unpaidFines}</p>
            <p>Doanh thu: {stats.totalRevenue.toLocaleString('vi-VN')} đ</p>
          </div>
        </div>
      )}
      <div className="dashboard-links" style={{ marginTop: '1.5rem' }}>
        <Link to="/admin/branches" className="btn btn--primary">
          Chi nhánh
        </Link>
        <Link to="/admin/vehicle-categories" className="btn">
          Loại xe
        </Link>
        <Link to="/admin/vehicles" className="btn">
          Xe
        </Link>
        <Link to="/admin/staff" className="btn">
          Nhân viên
        </Link>
        <Link to="/admin/system-configs" className="btn">
          Cấu hình
        </Link>
        <Link to="/admin/fine-rules" className="btn">
          Quy tắc phạt
        </Link>
        <Link to="/admin/reports" className="btn">
          Báo cáo
        </Link>
        <Link to="/admin/audit-logs" className="btn">
          Nhật ký
        </Link>
      </div>
    </section>
  );
}
