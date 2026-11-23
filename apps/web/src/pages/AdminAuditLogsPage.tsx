import { useEffect, useState } from 'react';

import { ErrorState, Loading } from '../components/Status.js';
import { apiFetch } from '../api/client.js';

interface AuditLog {
  logId: number;
  actorUserId: string | null;
  actorRole: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  outcome: string;
  occurredAt: string;
}

export function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (action) params.set('action', action);
      if (entityType) params.set('entityType', entityType);
      params.set('pageSize', '50');
      const res = await apiFetch<{ items: AuditLog[]; total: number }>(
        `/api/audit-logs?${params.toString()}`,
      );
      setLogs(res.items);
      setTotal(res.total);
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

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} />;

  return (
    <section>
      <h1>Nhật ký hệ thống</h1>
      <div className="filter-actions" style={{ marginBottom: '1rem' }}>
        <input placeholder="Hành động" value={action} onChange={(e) => setAction(e.target.value)} />
        <input
          placeholder="Loại thực thể"
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
        />
        <button className="btn btn--primary" onClick={() => void load()}>
          Lọc
        </button>
      </div>
      <p>Tổng: {total}</p>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Thời gian</th>
              <th>Hành động</th>
              <th>Loại</th>
              <th>ID</th>
              <th>Kết quả</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.logId}>
                <td>{new Date(l.occurredAt).toLocaleString('vi-VN')}</td>
                <td>{l.action}</td>
                <td>{l.entityType}</td>
                <td>{l.entityId ?? '-'}</td>
                <td>{l.outcome}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
