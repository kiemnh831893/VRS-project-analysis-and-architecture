import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext.js';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header className="navbar">
      <div className="navbar__brand">
        <Link to="/">VRS</Link>
      </div>
      <nav className="navbar__links">
        {user ? (
          <>
            <Link to="/dashboard">Bảng điều khiển</Link>
            {user.role === 'CUSTOMER' && (
              <>
                <Link to="/vehicles">Xe cho thuê</Link>
                <Link to="/bookings">Đơn của tôi</Link>
              </>
            )}
            {user.role === 'STAFF' && (
              <>
                <Link to="/staff">Nghiệp vụ</Link>
                <Link to="/staff/vehicles">Xe</Link>
                <Link to="/staff/handover">Bàn giao</Link>
                <Link to="/staff/returns">Trả xe</Link>
                <Link to="/staff/contracts">Hợp đồng</Link>
              </>
            )}
            {user.role === 'ADMIN' && (
              <>
                <Link to="/admin">Quản trị</Link>
                <Link to="/admin/branches">Chi nhánh</Link>
                <Link to="/admin/vehicle-categories">Loại xe</Link>
                <Link to="/admin/vehicles">Xe</Link>
                <Link to="/admin/staff">Nhân viên</Link>
                <Link to="/admin/system-configs">Cấu hình</Link>
                <Link to="/admin/fine-rules">Quy tắc phạt</Link>
                <Link to="/admin/reports">Báo cáo</Link>
                <Link to="/admin/audit-logs">Nhật ký</Link>
              </>
            )}
            <button type="button" className="btn btn--ghost" onClick={handleLogout}>
              Đăng xuất
            </button>
          </>
        ) : (
          <>
            <Link to="/vehicles">Xe cho thuê</Link>
            <Link to="/login">Đăng nhập</Link>
            <Link to="/register">Đăng ký</Link>
          </>
        )}
      </nav>
    </header>
  );
}
