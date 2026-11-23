import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { ErrorState, Loading } from '../components/Status.js';
import { apiFetch } from '../api/client.js';
import { fetchCategories, type VehicleCategory } from '../api/vehicles.js';

export function StaffVehicleFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const location = useLocation();
  const listPath = location.pathname.startsWith('/admin') ? '/admin/vehicles' : '/staff/vehicles';

  const [categories, setCategories] = useState<VehicleCategory[]>([]);
  const [branches, setBranches] = useState<{ branchId: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    categoryId: '',
    branchId: '',
    licensePlate: '',
    brand: '',
    model: '',
    manufactureYear: new Date().getFullYear(),
    transmission: 'AUTO' as 'AUTO' | 'MANUAL',
    fuelType: 'PETROL' as string,
    seats: 5,
    dailyRate: 500000,
    currentMileage: 0,
  });

  useEffect(() => {
    async function load() {
      try {
        const cats = await fetchCategories();
        setCategories(cats);
        const br = await apiFetch<{ items: { branchId: string; name: string }[] }>('/api/branches');
        setBranches(br.items);
        if (isEdit && id) {
          const v = await apiFetch<{ vehicle: Record<string, unknown> }>(`/api/vehicles/${id}`);
          const veh = v.vehicle;
          setForm({
            categoryId: String(veh.categoryId),
            branchId: String(veh.branchId),
            licensePlate: String(veh.licensePlate),
            brand: String(veh.brand),
            model: String(veh.model),
            manufactureYear: Number(veh.manufactureYear),
            transmission: veh.transmission as 'AUTO' | 'MANUAL',
            fuelType: String(veh.fuelType),
            seats: Number(veh.seats),
            dailyRate: Number(veh.dailyRate),
            currentMileage: Number(veh.currentMileage),
          });
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Lỗi tải dữ liệu');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [id, isEdit]);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        categoryId: Number(form.categoryId),
        dailyRate: Number(form.dailyRate),
      };
      if (isEdit && id) {
        await apiFetch(`/api/vehicles/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      } else {
        await apiFetch('/api/vehicles', { method: 'POST', body: JSON.stringify(payload) });
      }
      navigate(listPath);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi lưu xe');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} />;

  return (
    <section className="card">
      <h1>{isEdit ? 'Sửa xe' : 'Thêm xe mới'}</h1>
      <form className="form-grid" onSubmit={handleSubmit}>
        <label>
          Loại xe
          <select
            value={form.categoryId}
            onChange={(e) => update('categoryId', e.target.value)}
            required
          >
            <option value="">-- Chọn --</option>
            {categories.map((c) => (
              <option key={c.categoryId} value={c.categoryId}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Chi nhánh
          <select
            value={form.branchId}
            onChange={(e) => update('branchId', e.target.value)}
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
        <label>
          Biển số
          <input
            value={form.licensePlate}
            onChange={(e) => update('licensePlate', e.target.value)}
            required
          />
        </label>
        <label>
          Hãng
          <input value={form.brand} onChange={(e) => update('brand', e.target.value)} required />
        </label>
        <label>
          Model
          <input value={form.model} onChange={(e) => update('model', e.target.value)} required />
        </label>
        <label>
          Năm sản xuất
          <input
            type="number"
            value={form.manufactureYear}
            onChange={(e) => update('manufactureYear', Number(e.target.value))}
            required
          />
        </label>
        <label>
          Hộp số
          <select
            value={form.transmission}
            onChange={(e) => update('transmission', e.target.value as 'AUTO' | 'MANUAL')}
          >
            <option value="AUTO">Tự động</option>
            <option value="MANUAL">Số sàn</option>
          </select>
        </label>
        <label>
          Nhiên liệu
          <select value={form.fuelType} onChange={(e) => update('fuelType', e.target.value)}>
            <option value="PETROL">Xăng</option>
            <option value="DIESEL">Dầu</option>
            <option value="ELECTRIC">Điện</option>
            <option value="HYBRID">Hybrid</option>
          </select>
        </label>
        <label>
          Số chỗ
          <input
            type="number"
            min={1}
            value={form.seats}
            onChange={(e) => update('seats', Number(e.target.value))}
            required
          />
        </label>
        <label>
          Giá/ngày
          <input
            type="number"
            min={0}
            value={form.dailyRate}
            onChange={(e) => update('dailyRate', Number(e.target.value))}
            required
          />
        </label>
        <label>
          Số km hiện tại
          <input
            type="number"
            min={0}
            value={form.currentMileage}
            onChange={(e) => update('currentMileage', Number(e.target.value))}
          />
        </label>
        {error && <div className="error-box">{error}</div>}
        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? 'Đang lưu...' : 'Lưu'}
        </button>
      </form>
    </section>
  );
}
