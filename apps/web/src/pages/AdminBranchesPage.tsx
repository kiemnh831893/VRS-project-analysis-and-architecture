import { useEffect, useState } from 'react';

import { ErrorState, Loading } from '../components/Status.js';
import { apiFetch } from '../api/client.js';

interface Branch {
  branchId: string;
  code: string;
  name: string;
  address: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export function AdminBranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ code: '', name: '', address: '' });
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await apiFetch<{ items: Branch[] }>('/api/branches');
      setBranches(res.items);
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
      await apiFetch('/api/branches', { method: 'POST', body: JSON.stringify(form) });
      setForm({ code: '', name: '', address: '' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi tạo chi nhánh');
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleStatus(branch: Branch) {
    const newStatus = branch.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await apiFetch(`/api/branches/${branch.branchId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
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
      <h1>Quản lý chi nhánh</h1>
      <form className="card" onSubmit={handleCreate} style={{ marginBottom: '1rem' }}>
        <h2>Thêm chi nhánh</h2>
        <label>
          Mã chi nhánh
          <input
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            required
          />
        </label>
        <label>
          Tên
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </label>
        <label>
          Địa chỉ
          <input
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            required
          />
        </label>
        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? 'Đang lưu...' : 'Thêm'}
        </button>
      </form>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Mã</th>
              <th>Tên</th>
              <th>Địa chỉ</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {branches.map((b) => (
              <tr key={b.branchId}>
                <td>{b.code}</td>
                <td>{b.name}</td>
                <td>{b.address}</td>
                <td>{b.status}</td>
                <td>
                  <button className="btn btn--ghost" onClick={() => toggleStatus(b)}>
                    {b.status === 'ACTIVE' ? 'Vô hiệu hóa' : 'Kích hoạt'}
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
