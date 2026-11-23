import { useEffect, useState } from 'react';

import { ErrorState, Loading } from '../components/Status.js';
import { apiFetch } from '../api/client.js';

interface StaffUser {
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  accountStatus: string;
  rentalStaff?: { employeeCode: string; branch: { name: string } };
}

export function AdminStaffPage() {
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [branches, setBranches] = useState<{ branchId: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    nationalId: '',
    password: '',
    employeeCode: '',
    branchId: '',
  });
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [s, b] = await Promise.all([
        apiFetch<{ items: StaffUser[] }>('/api/users'),
        apiFetch<{ items: { branchId: string; name: string }[] }>('/api/branches'),
      ]);
      setStaff(s.items);
      setBranches(b.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi tải');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch('/api/users', { method: 'POST', body: JSON.stringify(form) });
      setForm({
        fullName: '',
        email: '',
        phone: '',
        nationalId: '',
        password: '',
        employeeCode: '',
        branchId: '',
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi tạo nhân viên');
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleLock(user: StaffUser) {
    const newStatus = user.accountStatus === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';
    try {
      await apiFetch(`/api/users/${user.userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ accountStatus: newStatus }),
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
      <h1>Quản lý nhân viên</h1>
      <form className="card" onSubmit={handleCreate} style={{ marginBottom: '1rem' }}>
        <h2>Thêm nhân viên</h2>
        <label>
          Họ tên
          <input
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            required
          />
        </label>
        <label>
          Email
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </label>
        <label>
          SĐT
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            required
          />
        </label>
        <label>
          CCCD
          <input
            value={form.nationalId}
            onChange={(e) => setForm({ ...form, nationalId: e.target.value })}
            required
          />
        </label>
        <label>
          Mật khẩu
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            minLength={8}
          />
        </label>
        <label>
          Mã nhân viên
          <input
            value={form.employeeCode}
            onChange={(e) => setForm({ ...form, employeeCode: e.target.value })}
            required
          />
        </label>
        <label>
          Chi nhánh
          <select
            value={form.branchId}
            onChange={(e) => setForm({ ...form, branchId: e.target.value })}
            required
          >
            <option value="">-- Chọn --</option>
            {branches.map((b) => (
              <option key={b.branchId} value={b.branchId}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? 'Đang lưu...' : 'Thêm'}
        </button>
      </form>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Họ tên</th>
              <th>Email</th>
              <th>Mã NV</th>
              <th>Chi nhánh</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.userId}>
                <td>{s.fullName}</td>
                <td>{s.email}</td>
                <td>{s.rentalStaff?.employeeCode}</td>
                <td>{s.rentalStaff?.branch?.name}</td>
                <td>{s.accountStatus}</td>
                <td>
                  <button className="btn btn--ghost" onClick={() => toggleLock(s)}>
                    {s.accountStatus === 'ACTIVE' ? 'Khóa' : 'Mở khóa'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
