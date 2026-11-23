import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext.js';
import { ErrorState, Loading } from '../components/Status.js';
import { createBooking } from '../api/bookings.js';
import { fetchVehicle } from '../api/vehicles.js';
import type { Vehicle } from '../api/vehicles.js';
import { ApiRequestError } from '../api/client.js';

export function BookingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const vehicleId = params.get('vehicleId') ?? '';

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pickupDate, setPickupDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!vehicleId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError('Thiếu thông tin xe.');
      setLoading(false);
      return;
    }
    fetchVehicle(vehicleId)
      .then(setVehicle)
      .catch((e) => setError(e instanceof Error ? e.message : 'Lỗi tải xe'))
      .finally(() => setLoading(false));
  }, [vehicleId]);

  const rentalDays =
    pickupDate && returnDate
      ? Math.round(
          (new Date(returnDate).getTime() - new Date(pickupDate).getTime()) / (24 * 60 * 60 * 1000),
        )
      : 0;
  const isValidRange = rentalDays >= 1;
  const rentalSubtotal = vehicle && isValidRange ? vehicle.dailyRate * rentalDays : 0;
  const deposit =
    vehicle && isValidRange ? Math.round((rentalSubtotal * vehicle.category.depositRate) / 100) : 0;
  const total = rentalSubtotal;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!vehicle) return;
    if (!isValidRange) {
      setError('Ngày trả xe phải sau ngày nhận xe.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const booking = await createBooking({
        vehicleId: vehicle.vehicleId,
        pickupDate,
        expectedReturnDate: returnDate,
      });
      setSuccess(
        `Đặt xe thành công! Mã đặt xe: ${booking.bookingCode}. Vui lòng thanh toán tiền đặt cọc trong 30 phút.`,
      );
      setTimeout(() => navigate('/bookings'), 2000);
    } catch (e) {
      if (e instanceof ApiRequestError) {
        if (e.code === 'LICENSE_NOT_VERIFIED') {
          setError('Bạn cần xác minh giấy phép lái xe trước khi đặt xe.');
        } else if (e.code === 'CUSTOMER_HAS_UNPAID_FINES') {
          setError('Bạn có tiền phạt chưa thanh toán, không thể đặt xe.');
        } else if (e.code === 'VEHICLE_UNAVAILABLE') {
          setError('Xe không còn trống trong thời gian đã chọn.');
        } else {
          setError(e.message);
        }
      } else {
        setError(e instanceof Error ? e.message : 'Đặt xe thất bại');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <Loading />;
  if (error && !vehicle) return <ErrorState message={error} />;
  if (!vehicle) return <ErrorState message="Không tìm thấy xe." />;

  return (
    <section className="card">
      <h1>Đặt xe</h1>
      <p>
        {vehicle.brand} {vehicle.model} — {vehicle.dailyRate.toLocaleString('vi-VN')} đ/ngày
      </p>
      {success && <div className="success-box">{success}</div>}
      {error && <ErrorState message={error} />}
      <form className="booking-form" onSubmit={handleSubmit}>
        <label>
          Ngày nhận xe
          <input
            type="date"
            value={pickupDate}
            onChange={(e) => setPickupDate(e.target.value)}
            required
          />
        </label>
        <label>
          Ngày trả xe
          <input
            type="date"
            value={returnDate}
            onChange={(e) => setReturnDate(e.target.value)}
            required
          />
        </label>
        {isValidRange && (
          <div className="estimate">
            <p>
              Số ngày thuê: <strong>{rentalDays}</strong>
            </p>
            <p>
              Tiền thuê: <strong>{rentalSubtotal.toLocaleString('vi-VN')} đ</strong>
            </p>
            <p>
              Tiền đặt cọc (ước tính): <strong>{deposit.toLocaleString('vi-VN')} đ</strong>
            </p>
            <p>
              Tổng ước tính: <strong>{total.toLocaleString('vi-VN')} đ</strong>
            </p>
          </div>
        )}
        <button type="submit" className="btn btn--primary" disabled={submitting || !user}>
          {submitting ? 'Đang xử lý...' : 'Xác nhận đặt xe'}
        </button>
        {!user && <p className="muted">Bạn cần đăng nhập để đặt xe.</p>}
      </form>
    </section>
  );
}
