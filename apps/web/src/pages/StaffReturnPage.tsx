import { useEffect, useState } from 'react';

import { ErrorState, Loading } from '../components/Status.js';
import { fetchContracts, processReturn } from '../api/contracts.js';
import type { Contract } from '../api/contracts.js';

export function StaffReturnPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Contract | null>(null);

  const [mileage, setMileage] = useState(0);
  const [fuel, setFuel] = useState(100);
  const [condition, setCondition] = useState<'INTACT' | 'SCRATCHED' | 'DAMAGED'>('INTACT');
  const [notes, setNotes] = useState('');
  const [fuelShortage, setFuelShortage] = useState(0);
  const [exteriorDamage, setExteriorDamage] = useState(false);

  useEffect(() => {
    fetchContracts('ACTIVE')
      .then(setContracts)
      .catch((e) => setError(e instanceof Error ? e.message : 'Lỗi tải'))
      .finally(() => setLoading(false));
  }, []);

  const selected = contracts.find((c) => c.contractId === selectedId);

  async function handleReturn(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedId) return;
    setSubmitting(true);
    setError(null);
    try {
      const c = await processReturn({
        contractId: selectedId,
        actualReturnAt: new Date().toISOString(),
        returnInspection: { mileage, fuelLevelPercent: fuel, condition, notes: notes || undefined },
        fuelShortageLitres: fuelShortage,
        exteriorDamage,
      });
      setResult(c);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Trả xe thất bại');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} />;

  return (
    <section>
      <h1>Trả xe</h1>
      {result ? (
        <div className="card">
          <h2>Hoàn tất trả xe</h2>
          <p>
            <strong>Hợp đồng:</strong> {result.contractNumber}
          </p>
          <p>
            <strong>Trạng thái:</strong> {result.contractStatus}
          </p>
          <p>
            <strong>Xe:</strong> {result.booking.vehicle.brand} {result.booking.vehicle.model} —{' '}
            {result.booking.vehicle.status}
          </p>
          {result.invoice && (
            <div>
              <h3>Hóa đơn</h3>
              <p>Tổng: {result.invoice.totalAmount.toLocaleString('vi-VN')} đ</p>
              <p>Đặt cọc đã trừ: {result.invoice.depositApplied.toLocaleString('vi-VN')} đ</p>
              <p>Còn phải trả: {result.invoice.finalAmountDue.toLocaleString('vi-VN')} đ</p>
              <p>Trạng thái: {result.invoice.status}</p>
            </div>
          )}
          {result.fines.length > 0 && (
            <div>
              <h3>Phạt</h3>
              <ul>
                {result.fines.map((f) => (
                  <li key={f.fineId}>
                    {f.violationType}: {f.amount.toLocaleString('vi-VN')} đ ({f.status})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <>
          <label>
            Chọn hợp đồng đang thuê
            <select
              value={selectedId}
              onChange={(e) => {
                setSelectedId(e.target.value);
                const c = contracts.find((x) => x.contractId === e.target.value);
                if (c) {
                  const insp = c.inspections.find((i) => i.inspectionType === 'PICKUP');
                  if (insp) {
                    setMileage(insp.mileage);
                    setFuel(insp.fuelLevelPercent);
                  }
                }
              }}
            >
              <option value="">-- Chọn --</option>
              {contracts.map((c) => (
                <option key={c.contractId} value={c.contractId}>
                  {c.contractNumber} — {c.booking.vehicle.brand} {c.booking.vehicle.model} (
                  {c.booking.customer.user.fullName})
                </option>
              ))}
            </select>
          </label>

          {selected && (
            <form className="card" onSubmit={handleReturn} style={{ marginTop: '1rem' }}>
              <h2>Kiểm tra trả xe</h2>
              <p>
                Xe: {selected.booking.vehicle.brand} {selected.booking.vehicle.model} —{' '}
                {selected.booking.vehicle.licensePlate}
              </p>
              <label>
                Số km cuối
                <input
                  type="number"
                  min={0}
                  value={mileage}
                  onChange={(e) => setMileage(Number(e.target.value))}
                  required
                />
              </label>
              <label>
                Mức nhiên liệu cuối (%)
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={fuel}
                  onChange={(e) => setFuel(Number(e.target.value))}
                  required
                />
              </label>
              <label>
                Tình trạng
                <select
                  value={condition}
                  onChange={(e) =>
                    setCondition(e.target.value as 'INTACT' | 'SCRATCHED' | 'DAMAGED')
                  }
                >
                  <option value="INTACT">Nguyên vẹn</option>
                  <option value="SCRATCHED">Trầy xước</option>
                  <option value="DAMAGED">Hư hỏng</option>
                </select>
              </label>
              <label>
                Thiếu nhiên liệu (lít)
                <input
                  type="number"
                  min={0}
                  value={fuelShortage}
                  onChange={(e) => setFuelShortage(Number(e.target.value))}
                />
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={exteriorDamage}
                  onChange={(e) => setExteriorDamage(e.target.checked)}
                />{' '}
                Có hư hỏng ngoại thất
              </label>
              <label>
                Ghi chú
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
              </label>
              <button type="submit" className="btn btn--primary" disabled={submitting}>
                {submitting ? 'Đang xử lý...' : 'Hoàn tất trả xe'}
              </button>
              {error && <ErrorState message={error} />}
            </form>
          )}
        </>
      )}
    </section>
  );
}
