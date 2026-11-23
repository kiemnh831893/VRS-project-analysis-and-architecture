import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { ErrorState, Loading } from '../components/Status.js';
import { fetchMyBookings } from '../api/bookings.js';
import type { Booking } from '../api/bookings.js';

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: 'Chờ thanh toán',
  CONFIRMED: 'Đã xác nhận',
  CANCELLED: 'Đã hủy',
  CONVERTED_TO_CONTRACT: 'Đang thuê',
};

export function MyBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMyBookings()
      .then(setBookings)
      .catch((e) => setError(e instanceof Error ? e.message : 'Lỗi tải danh sách'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} />;

  return (
    <section>
      <h1>Đơn đặt xe của tôi</h1>
      {bookings.length === 0 ? (
        <p>Bạn chưa có đơn đặt xe nào.</p>
      ) : (
        <div className="booking-list">
          {bookings.map((b) => (
            <article key={b.bookingId} className="card booking-card">
              <div className="booking-card__header">
                <strong>{b.bookingCode}</strong>
                <span className={`status-pill status-pill--${b.bookingStatus}`}>
                  {STATUS_LABELS[b.bookingStatus] ?? b.bookingStatus}
                </span>
              </div>
              {b.vehicle && (
                <p>
                  {b.vehicle.brand} {b.vehicle.model} — {b.vehicle.licensePlate}
                </p>
              )}
              <p>
                Nhận xe: {new Date(b.pickupDate).toLocaleDateString('vi-VN')} · Trả xe:{' '}
                {new Date(b.expectedReturnDate).toLocaleDateString('vi-VN')}
              </p>
              <p>
                Số ngày: {b.rentalDays} · Tổng: {b.totalEstimatedCost.toLocaleString('vi-VN')} đ
              </p>
              <p>Tiền đặt cọc: {b.depositAmount.toLocaleString('vi-VN')} đ</p>
              <Link to={`/bookings/${b.bookingId}`} className="btn">
                Chi tiết
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
