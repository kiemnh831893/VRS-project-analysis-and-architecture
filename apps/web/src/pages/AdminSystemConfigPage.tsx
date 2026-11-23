import { useEffect, useState } from 'react';

import { ErrorState, Loading } from '../components/Status.js';
import { apiFetch } from '../api/client.js';

interface Config {
  configKey: string;
  configValue: string;
  valueType: string;
  category: string;
  description: string | null;
  isPublic: boolean;
  version: number;
}

export function AdminSystemConfigPage() {
  const [configs, setConfigs] = useState<Config[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [value, setValue] = useState('');

  async function load() {
    setLoading(true);
    try {
      const res = await apiFetch<{ items: Config[] }>('/api/system-configs');
      setConfigs(res.items);
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

  async function handleSave(key: string) {
    try {
      await apiFetch(`/api/system-configs/${key}`, {
        method: 'PATCH',
        body: JSON.stringify({ configValue: value }),
      });
      setEditing(null);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Lỗi');
    }
  }

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} />;

  return (
    <section>
      <h1>Cấu hình hệ thống</h1>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Khóa</th>
              <th>Giá trị</th>
              <th>Loại</th>
              <th>Mô tả</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {configs.map((c) => (
              <tr key={c.configKey}>
                <td>{c.configKey}</td>
                <td>
                  {editing === c.configKey ? (
                    <input value={value} onChange={(e) => setValue(e.target.value)} />
                  ) : (
                    c.configValue
                  )}
                </td>
                <td>{c.valueType}</td>
                <td>{c.description ?? '-'}</td>
                <td>
                  {editing === c.configKey ? (
                    <>
                      <button className="btn btn--primary" onClick={() => handleSave(c.configKey)}>
                        Lưu
                      </button>
                      <button className="btn" onClick={() => setEditing(null)}>
                        Hủy
                      </button>
                    </>
                  ) : (
                    <button
                      className="btn btn--ghost"
                      onClick={() => {
                        setEditing(c.configKey);
                        setValue(c.configValue);
                      }}
                    >
                      Sửa
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {configs.length === 0 && <p>Chưa có cấu hình nào.</p>}
    </section>
  );
}
