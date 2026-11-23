import { useState } from 'react';

import { ErrorState } from '../components/Status.js';
import { lookupBooking, createContract } from '../api/contracts.js';
import type { Contract } from '../api/contracts.js';

interface LookupBooking {
  bookingCode: string;
  bookingStatus: string;
  customer?: { user?: { fullName?: string } };
  vehicle?: { brand: string; model: string; licensePlate: string };
}

export function StaffHandoverPage() {
  const [code, setCode] = useState('');
  const [booking, setBooking] = useState<LookupBooking | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [mileage, setMileage] = useState(0);
  const [fuel, setFuel] = useState(100);
  const [condition, setCondition] = useState<'INTACT' | 'SCRATCHED' | 'DAMAGED'>('INTACT');
  const [notes, setNotes] = useState('');

  async function handleLookup(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBooking(null);
    setContract(null);
    setLoading(true);
    try {
      const b = (await lookupBooking(code.trim())) as LookupBooking;
      setBooking(b);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tìm thấy đơn đặt');
    } finally {
      setLoading(false);
    }
  }

  async function handleHandover(event: React.FormEvent) {
    event.preventDefault();
    if (!booking) return;
    setSubmitting(true);
    setError(null);
    try {
      const c = await createContract({
        bookingCode: booking.bookingCode,
        actualPickupAt: new Date().toISOString(),
        pickupInspection: { mileage, fuelLevelPercent: fuel, condition, notes: notes || undefined },
      });
      setContract(c);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Giao xe thất bại');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section>
      <h1>Giao xe</h1>
      <form className="card" onSubmit={handleLookup}>
        <label>
          Mã đặt xe / QR
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="BK-..."
            required
          />
        </label>
        <button type="submit" className="btn btn--primary" disabled={loading}>
          {loading ? 'Đang tìm...' : 'Tìm đơn đặt'}
        </button>
      </form>

      {error && <ErrorState message={error} />}

      {booking && !contract && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <h2>Thông tin đơn đặt</h2>
          <p>
            <strong>Mã:</strong> {booking.bookingCode}
          </p>
          <p>
            <strong>Khách hàng:</strong> {booking.customer?.user?.fullName}
          </p>
          <p>
            <strong>Xe:</strong> {booking.vehicle?.brand} {booking.vehicle?.model} —{' '}
            {booking.vehicle?.licensePlate}
          </p>
          <p>
            <strong>Trạng thái:</strong> {booking.bookingStatus}
          </p>

          {booking.bookingStatus !== 'CONFIRMED' && (
            <p className="error-box">
              Đơn đặt chưa được xác nhận (trạng thái: {booking.bookingStatus}).
            </p>
          )}

          {booking.bookingStatus === 'CONFIRMED' && (
            <form onSubmit={handleHandover} style={{ marginTop: '1rem' }}>
              <h3>Kiểm tra giao xe</h3>
              <label>
                Số km
                <input
                  type="number"
                  min={0}
                  value={mileage}
                  onChange={(e) => setMileage(Number(e.target.value))}
                  required
                />
              </label>
              <label>
                Mức nhiên liệu (%)
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
                Ghi chú
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
              </label>
              <button type="submit" className="btn btn--primary" disabled={submitting}>
                {submitting ? 'Đang xử lý...' : 'Hoàn tất giao xe'}
              </button>
            </form>
          )}
        </div>
      )}

      {contract && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <h2>Hợp đồng đã tạo</h2>
          <p>
            <strong>Mã hợp đồng:</strong> {contract.contractNumber}
          </p>
          <p>
            <strong>Trạng thái:</strong> {contract.contractStatus}
          </p>
          <p>
            <strong>Xe:</strong> {contract.booking.vehicle.brand} {contract.booking.vehicle.model}
          </p>
        </div>
      )}
    </section>
  );
}
