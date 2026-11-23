import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { AuthProvider } from './contexts/AuthContext.js';
import { Layout } from './components/Layout.js';
import { ProtectedRoute } from './components/ProtectedRoute.js';
import { LoginPage } from './pages/LoginPage.js';
import { RegisterPage } from './pages/RegisterPage.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { AdminDashboardPage } from './pages/AdminDashboardPage.js';
import { AdminBranchesPage } from './pages/AdminBranchesPage.js';
import { AdminVehicleCategoriesPage } from './pages/AdminVehicleCategoriesPage.js';
import { AdminStaffPage } from './pages/AdminStaffPage.js';
import { AdminSystemConfigPage } from './pages/AdminSystemConfigPage.js';
import { AdminFineRulesPage } from './pages/AdminFineRulesPage.js';
import { AdminReportsPage } from './pages/AdminReportsPage.js';
import { AdminAuditLogsPage } from './pages/AdminAuditLogsPage.js';
import { StaffVehiclesPage } from './pages/StaffVehiclesPage.js';
import { StaffDashboardPage } from './pages/StaffDashboardPage.js';
import { StaffVehicleFormPage } from './pages/StaffVehicleFormPage.js';
import { StaffHandoverPage } from './pages/StaffHandoverPage.js';
import { StaffReturnPage } from './pages/StaffReturnPage.js';
import { StaffContractsPage } from './pages/StaffContractsPage.js';
import { StaffContractDetailPage } from './pages/StaffContractDetailPage.js';
import { RoleHomeRedirect } from './pages/RoleHomeRedirect.js';
import { VehicleCatalogPage } from './pages/VehicleCatalogPage.js';
import { VehicleDetailPage } from './pages/VehicleDetailPage.js';
import { BookingPage } from './pages/BookingPage.js';
import { MyBookingsPage } from './pages/MyBookingsPage.js';
import { BookingDetailPage } from './pages/BookingDetailPage.js';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<RoleHomeRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route path="/vehicles" element={<VehicleCatalogPage />} />
            <Route path="/vehicles/:id" element={<VehicleDetailPage />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<DashboardPage />} />
            </Route>

            <Route element={<ProtectedRoute roles={['CUSTOMER']} />}>
              <Route path="/customer" element={<DashboardPage />} />
              <Route path="/bookings" element={<MyBookingsPage />} />
              <Route path="/bookings/:id" element={<BookingDetailPage />} />
              <Route path="/bookings/new" element={<BookingPage />} />
            </Route>
            <Route element={<ProtectedRoute roles={['STAFF']} />}>
              <Route path="/staff" element={<StaffDashboardPage />} />
              <Route path="/staff/vehicles" element={<StaffVehiclesPage />} />
              <Route path="/staff/vehicles/new" element={<StaffVehicleFormPage />} />
              <Route path="/staff/vehicles/:id/edit" element={<StaffVehicleFormPage />} />
              <Route path="/staff/handover" element={<StaffHandoverPage />} />
              <Route path="/staff/returns" element={<StaffReturnPage />} />
              <Route path="/staff/contracts" element={<StaffContractsPage />} />
              <Route path="/staff/contracts/:id" element={<StaffContractDetailPage />} />
            </Route>
            <Route element={<ProtectedRoute roles={['ADMIN']} />}>
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/admin/branches" element={<AdminBranchesPage />} />
              <Route path="/admin/vehicle-categories" element={<AdminVehicleCategoriesPage />} />
              <Route path="/admin/vehicles" element={<StaffVehiclesPage />} />
              <Route path="/admin/vehicles/new" element={<StaffVehicleFormPage />} />
              <Route path="/admin/vehicles/:id/edit" element={<StaffVehicleFormPage />} />
              <Route path="/admin/staff" element={<AdminStaffPage />} />
              <Route path="/admin/system-configs" element={<AdminSystemConfigPage />} />
              <Route path="/admin/fine-rules" element={<AdminFineRulesPage />} />
              <Route path="/admin/reports" element={<AdminReportsPage />} />
              <Route path="/admin/audit-logs" element={<AdminAuditLogsPage />} />
            </Route>

            <Route path="*" element={<div className="page-center">Không tìm thấy trang.</div>} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
