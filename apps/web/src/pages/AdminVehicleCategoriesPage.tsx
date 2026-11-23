import { useEffect, useState } from 'react';

import { ErrorState, Loading } from '../components/Status.js';
import { apiFetch } from '../api/client.js';
import { fetchCategories } from '../api/vehicles.js';
import type { VehicleCategory } from '../api/vehicles.js';

export function AdminVehicleCategoriesPage() {
  const [categories, setCategories] = useState<VehicleCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', depositRate: 10, description: '' });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setCategories(await fetchCategories());
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

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (editingId) {
        await apiFetch(`/api/vehicle-categories/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: form.name,
            depositRate: form.depositRate,
            description: form.description || undefined,
          }),
        });
      } else {
        await apiFetch('/api/vehicle-categories', {
          method: 'POST',
          body: JSON.stringify({
            name: form.name,
            depositRate: form.depositRate,
            description: form.description || undefined,
          }),
        });
      }
      setForm({ name: '', depositRate: 10, description: '' });
      setEditingId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi lưu');
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(c: VehicleCategory) {
    setEditingId(c.categoryId);
    setForm({ name: c.name, depositRate: c.depositRate, description: c.description ?? '' });
  }

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} />;

  return (
    <section>
      <h1>Quản lý loại xe</h1>
      <form className="card" onSubmit={handleSubmit} style={{ marginBottom: '1rem' }}>
        <h2>{editingId ? 'Sửa loại xe' : 'Thêm loại xe'}</h2>
        <label>
          Tên
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </label>
        <label>
          Tỷ lệ đặt cọc (%)
          <input
            type="number"
            min={0}
            max={100}
            value={form.depositRate}
            onChange={(e) => setForm({ ...form, depositRate: Number(e.target.value) })}
            required
          />
        </label>
        <label>
          Mô tả
          <input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </label>
        <div className="filter-actions">
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitting ? 'Đang lưu...' : 'Lưu'}
          </button>
          {editingId && (
            <button
              type="button"
              className="btn"
              onClick={() => {
                setEditingId(null);
                setForm({ name: '', depositRate: 10, description: '' });
              }}
            >
              Hủy
            </button>
          )}
        </div>
      </form>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Tên</th>
              <th>Tỷ lệ cọc (%)</th>
              <th>Mô tả</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.categoryId}>
                <td>{c.categoryId}</td>
                <td>{c.name}</td>
                <td>{c.depositRate}</td>
                <td>{c.description ?? '-'}</td>
                <td>
                  <button className="btn btn--ghost" onClick={() => startEdit(c)}>
                    Sửa
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
