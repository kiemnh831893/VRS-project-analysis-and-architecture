import { useEffect, useState } from 'react';

import { ErrorState, Loading } from '../components/Status.js';
import { apiFetch } from '../api/client.js';

interface FineRule {
  fineRuleId: string;
  code: string;
  name: string;
  violationType: string;
  calculationMethod: string;
  rateAmount: number;
  graceMinutes: number;
  isActive: boolean;
}

export function AdminFineRulesPage() {
  const [rules, setRules] = useState<FineRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: '',
    name: '',
    violationType: 'LATE_RETURN',
    calculationMethod: 'FIXED',
    rateAmount: 0,
    graceMinutes: 0,
  });
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await apiFetch<{ items: FineRule[] }>('/api/fine-rules');
      setRules(res.items);
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
      await apiFetch('/api/fine-rules', { method: 'POST', body: JSON.stringify(form) });
      setForm({
        code: '',
        name: '',
        violationType: 'LATE_RETURN',
        calculationMethod: 'FIXED',
        rateAmount: 0,
        graceMinutes: 0,
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi tạo');
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(rule: FineRule) {
    try {
      await apiFetch(`/api/fine-rules/${rule.fineRuleId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !rule.isActive }),
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
      <h1>Quy tắc phạt</h1>
      <form className="card" onSubmit={handleSubmit} style={{ marginBottom: '1rem' }}>
        <h2>Thêm quy tắc phạt</h2>
        <label>
          Mã
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
          Loại vi phạm
          <select
            value={form.violationType}
            onChange={(e) => setForm({ ...form, violationType: e.target.value })}
          >
            <option value="LATE_RETURN">Trễ trả</option>
            <option value="FUEL_SHORTAGE">Thiếu nhiên liệu</option>
            <option value="EXTERIOR_DAMAGE">Hư hỏng ngoại thất</option>
            <option value="INTERIOR_DAMAGE">Hư hỏng nội thất</option>
            <option value="CLEANING">Vệ sinh</option>
            <option value="OTHER">Khác</option>
          </select>
        </label>
        <label>
          Cách tính
          <select
            value={form.calculationMethod}
            onChange={(e) => setForm({ ...form, calculationMethod: e.target.value })}
          >
            <option value="FIXED">Cố định</option>
            <option value="PER_HOUR">Theo giờ</option>
            <option value="PER_DAY">Theo ngày</option>
            <option value="PER_LITER">Theo lít</option>
            <option value="PER_PERCENT">Theo phần trăm</option>
          </select>
        </label>
        <label>
          Mức phạt
          <input
            type="number"
            min={0}
            value={form.rateAmount}
            onChange={(e) => setForm({ ...form, rateAmount: Number(e.target.value) })}
            required
          />
        </label>
        <label>
          Grace (phút)
          <input
            type="number"
            min={0}
            value={form.graceMinutes}
            onChange={(e) => setForm({ ...form, graceMinutes: Number(e.target.value) })}
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
              <th>Loại</th>
              <th>Cách tính</th>
              <th>Mức phạt</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.fineRuleId}>
                <td>{r.code}</td>
                <td>{r.name}</td>
                <td>{r.violationType}</td>
                <td>{r.calculationMethod}</td>
                <td>{r.rateAmount.toLocaleString('vi-VN')}</td>
                <td>{r.isActive ? 'Hoạt động' : 'Vô hiệu'}</td>
                <td>
                  <button className="btn btn--ghost" onClick={() => toggleActive(r)}>
                    {r.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
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
