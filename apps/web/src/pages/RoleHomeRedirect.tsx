import { Navigate } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext.js';

export function RoleHomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-center">Đang tải...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
  if (user.role === 'STAFF') return <Navigate to="/staff" replace />;
  return <Navigate to="/customer" replace />;
}
