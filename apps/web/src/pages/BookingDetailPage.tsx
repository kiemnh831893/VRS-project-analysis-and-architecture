import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { ErrorState, Loading } from '../components/Status.js';
import { fetchBooking } from '../api/bookings.js';
import type { Booking } from '../api/bookings.js';

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: 'Chờ thanh toán',
  CONFIRMED: 'Đã xác nhận',
  CANCELLED: 'Đã hủy',
  CONVERTED_TO_CONTRACT: 'Đang thuê',
};

export function BookingDetailPage() {
  const { id } = useParams();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchBooking(id)
      .then(setBooking)
      .catch((e) => setError(e instanceof Error ? e.message : 'Lỗi tải đơn đặt'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} />;
  if (!booking) return <ErrorState message="Không tìm thấy đơn đặt." />;

  return (
    <section className="card">
      <h1>Chi tiết đơn đặt xe</h1>
      <p>
        <strong>Mã đặt xe:</strong> {booking.bookingCode}
      </p>
      <p>
        <strong>Trạng thái:</strong> {STATUS_LABELS[booking.bookingStatus] ?? booking.bookingStatus}
      </p>
      {booking.vehicle && (
        <p>
          <strong>Xe:</strong> {booking.vehicle.brand} {booking.vehicle.model} —{' '}
          {booking.vehicle.licensePlate}
        </p>
      )}
      <p>
        <strong>Nhận xe:</strong> {new Date(booking.pickupDate).toLocaleDateString('vi-VN')}
      </p>
      <p>
        <strong>Trả xe:</strong> {new Date(booking.expectedReturnDate).toLocaleDateString('vi-VN')}
      </p>
      <p>
        <strong>Số ngày thuê:</strong> {booking.rentalDays}
      </p>
      <p>
        <strong>Tiền thuê:</strong> {booking.rentalSubtotal.toLocaleString('vi-VN')} đ
      </p>
      <p>
        <strong>Tiền đặt cọc:</strong> {booking.depositAmount.toLocaleString('vi-VN')} đ
      </p>
      <p>
        <strong>Tổng ước tính:</strong> {booking.totalEstimatedCost.toLocaleString('vi-VN')} đ
      </p>
      {booking.bookingStatus === 'PENDING_PAYMENT' && (
        <p className="muted">
          Vui lòng thanh toán tiền đặt cọc trong 30 phút (hết hạn:{' '}
          {new Date(booking.holdExpiresAt).toLocaleString('vi-VN')}).
        </p>
      )}
    </section>
  );
}
