import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { ErrorState, Loading } from '../components/Status.js';
import { fetchVehicle } from '../api/vehicles.js';
import type { Vehicle } from '../api/vehicles.js';

export function VehicleDetailPage() {
  const { id } = useParams();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetchVehicle(id)
      .then(setVehicle)
      .catch((e) => setError(e instanceof Error ? e.message : 'Lỗi tải thông tin xe'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} />;
  if (!vehicle) return <ErrorState message="Không tìm thấy xe." />;

  const deposit = Math.round((vehicle.dailyRate * 2 * vehicle.category.depositRate) / 100);

  return (
    <section className="card">
      <h1>
        {vehicle.brand} {vehicle.model}
      </h1>
      <p className="muted">
        {vehicle.licensePlate} · {vehicle.category.name}
      </p>
      <div className="detail-grid">
        <div>
          <p>
            <strong>Hãng:</strong> {vehicle.brand}
          </p>
          <p>
            <strong>Model:</strong> {vehicle.model}
          </p>
          <p>
            <strong>Năm sản xuất:</strong> {vehicle.manufactureYear}
          </p>
          <p>
            <strong>Hộp số:</strong> {vehicle.transmission === 'AUTO' ? 'Tự động' : 'Số sàn'}
          </p>
          <p>
            <strong>Nhiên liệu:</strong> {vehicle.fuelType}
          </p>
          <p>
            <strong>Số chỗ:</strong> {vehicle.seats}
          </p>
        </div>
        <div>
          <p>
            <strong>Giá thuê/ngày:</strong> {vehicle.dailyRate.toLocaleString('vi-VN')} đ
          </p>
          <p>
            <strong>Tiền đặt cọc (ước tính):</strong> {deposit.toLocaleString('vi-VN')} đ
          </p>
          <p>
            <strong>Chi nhánh:</strong> {vehicle.branch.name}
          </p>
          <p>
            <strong>Địa chỉ:</strong> {vehicle.branch.address}
          </p>
          <p>
            <strong>Trạng thái:</strong> {vehicle.status}
          </p>
        </div>
      </div>
      <div className="detail-actions">
        <Link to={`/bookings/new?vehicleId=${vehicle.vehicleId}`} className="btn btn--primary">
          Đặt xe
        </Link>
        <Link to="/vehicles" className="btn">
          Quay lại
        </Link>
      </div>
    </section>
  );
}
