import { useState } from 'react';
import { Navigate } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext.js';
import { ErrorState } from '../components/Status.js';
import type { RegisterInput } from '../api/auth.js';

export function RegisterPage() {
  const { user, register, loading } = useAuth();
  const [form, setForm] = useState<RegisterInput>({
    fullName: '',
    email: '',
    phone: '',
    nationalId: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <div className="page-center">Đang tải...</div>;
  if (user) return <Navigate to="/dashboard" replace />;

  function update<K extends keyof RegisterInput>(key: K, value: RegisterInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register(form);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Đăng ký thất bại');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="card auth-form" onSubmit={handleSubmit}>
        <h1>Đăng ký tài khoản</h1>
        {error && <ErrorState message={error} />}
        <label>
          Họ và tên
          <input
            value={form.fullName}
            onChange={(e) => update('fullName', e.target.value)}
            required
          />
        </label>
        <label>
          Email
          <input
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            required
          />
        </label>
        <label>
          Số điện thoại
          <input value={form.phone} onChange={(e) => update('phone', e.target.value)} required />
        </label>
        <label>
          CCCD/CMND
          <input
            value={form.nationalId}
            onChange={(e) => update('nationalId', e.target.value)}
            required
          />
        </label>
        <label>
          Mật khẩu
          <input
            type="password"
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            required
            minLength={8}
          />
        </label>
        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? 'Đang xử lý...' : 'Đăng ký'}
        </button>
        <p className="auth-form__footer">
          Đã có tài khoản? <a href="/login">Đăng nhập</a>
        </p>
      </form>
    </div>
  );
}
