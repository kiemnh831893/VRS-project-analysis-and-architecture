import { Link } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext.js';

export function DashboardPage() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <section className="card">
      <h1>Bảng điều khiển</h1>
      <p>Xin chào, {user.fullName}.</p>
      <p>Vai trò: {user.role}</p>
      {user.role === 'CUSTOMER' && (
        <div className="dashboard-links">
          <Link to="/vehicles" className="btn btn--primary">
            Tìm xe để thuê
          </Link>
          <Link to="/bookings" className="btn">
            Đơn đặt xe của tôi
          </Link>
        </div>
      )}
      {user.role === 'STAFF' && (
        <div className="dashboard-links">
          <Link to="/staff/handover" className="btn btn--primary">
            Quản lý đơn đặt
          </Link>
          <Link to="/staff/returns" className="btn">
            Trả xe
          </Link>
          <Link to="/staff/contracts" className="btn">
            Hợp đồng
          </Link>
        </div>
      )}
      {user.role === 'ADMIN' && (
        <div className="dashboard-links">
          <Link to="/admin/branches" className="btn btn--primary">
            Quản lý chi nhánh
          </Link>
          <Link to="/admin/vehicles" className="btn">
            Quản lý xe
          </Link>
          <Link to="/admin/staff" className="btn">
            Quản lý người dùng
          </Link>
        </div>
      )}
    </section>
  );
}
