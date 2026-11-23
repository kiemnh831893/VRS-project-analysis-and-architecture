import { Link } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext.js';

export function StaffDashboardPage() {
  const { user } = useAuth();
  return (
    <section className="card">
      <h1>Bảng điều khiển nhân viên</h1>
      <p>Xin chào, {user?.fullName}.</p>
      <div className="dashboard-links">
        <Link to="/staff/vehicles" className="btn btn--primary">
          Quản lý xe
        </Link>
        <Link to="/staff/handover" className="btn">
          Giao xe
        </Link>
        <Link to="/staff/returns" className="btn">
          Trả xe
        </Link>
        <Link to="/staff/contracts" className="btn">
          Hợp đồng
        </Link>
      </div>
    </section>
  );
}
