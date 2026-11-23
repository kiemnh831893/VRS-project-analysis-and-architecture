import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { ErrorState, Loading } from '../components/Status.js';
import { fetchContracts } from '../api/contracts.js';
import type { Contract } from '../api/contracts.js';

export function StaffContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetchContracts(status || undefined)
      .then(setContracts)
      .catch((e) => setError(e instanceof Error ? e.message : 'Lỗi tải'))
      .finally(() => setLoading(false));
  }, [status]);

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} />;

  return (
    <section>
      <h1>Hợp đồng thuê xe</h1>
      <label>
        Trạng thái
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tất cả</option>
          <option value="ACTIVE">Đang thuê</option>
          <option value="COMPLETED">Đã trả</option>
          <option value="OVERDUE">Quá hạn</option>
        </select>
      </label>
      {contracts.length === 0 ? (
        <p>Không có hợp đồng.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Mã HĐ</th>
                <th>Khách hàng</th>
                <th>Xe</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => (
                <tr key={c.contractId}>
                  <td>{c.contractNumber}</td>
                  <td>{c.booking.customer.user.fullName}</td>
                  <td>
                    {c.booking.vehicle.brand} {c.booking.vehicle.model}
                  </td>
                  <td>{c.contractStatus}</td>
                  <td>
                    <Link to={`/staff/contracts/${c.contractId}`} className="btn btn--ghost">
                      Chi tiết
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
