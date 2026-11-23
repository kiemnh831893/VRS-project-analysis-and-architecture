import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Loading } from '../components/Status.js';
import { fetchCatalog, fetchCategories } from '../api/vehicles.js';
import type { CatalogFilters, Vehicle, VehicleCategory } from '../api/vehicles.js';

const PAGE_SIZE = 12;

export function VehicleCatalogPage() {
  const [categories, setCategories] = useState<VehicleCategory[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [transmission, setTransmission] = useState('');
  const [minSeats, setMinSeats] = useState('');
  const [maxDailyRate, setMaxDailyRate] = useState('');
  const [pickupDate, setPickupDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy] = useState('createdAt');
  const [sortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch(() => {});
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    const filters: CatalogFilters = {
      page,
      pageSize: PAGE_SIZE,
      sortBy,
      sortOrder,
      search: search || undefined,
      categoryId: categoryId ? Number(categoryId) : undefined,
      transmission: (transmission as 'AUTO' | 'MANUAL') || undefined,
      minSeats: minSeats ? Number(minSeats) : undefined,
      maxDailyRate: maxDailyRate ? Number(maxDailyRate) : undefined,
      pickupDate: pickupDate || undefined,
      expectedReturnDate: returnDate || undefined,
    };
    try {
      const res = await fetchCatalog(filters);
      setVehicles(res.items);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi tải danh sách xe');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [page]);

  function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    setPage(1);
    void load();
  }

  function resetFilters() {
    setSearch('');
    setCategoryId('');
    setTransmission('');
    setMinSeats('');
    setMaxDailyRate('');
    setPickupDate('');
    setReturnDate('');
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <section>
      <h1>Danh mục xe</h1>
      <form className="card filter-form" onSubmit={handleSearch}>
        <div className="filter-grid">
          <label>
            Tìm kiếm
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tên xe, hãng..."
            />
          </label>
          <label>
            Loại xe
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Tất cả</option>
              {categories.map((c) => (
                <option key={c.categoryId} value={c.categoryId}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Hộp số
            <select value={transmission} onChange={(e) => setTransmission(e.target.value)}>
              <option value="">Tất cả</option>
              <option value="AUTO">Tự động</option>
              <option value="MANUAL">Số sàn</option>
            </select>
          </label>
          <label>
            Số chỗ tối thiểu
            <input
              type="number"
              min={1}
              value={minSeats}
              onChange={(e) => setMinSeats(e.target.value)}
            />
          </label>
          <label>
            Giá tối đa/ngày
            <input
              type="number"
              min={0}
              value={maxDailyRate}
              onChange={(e) => setMaxDailyRate(e.target.value)}
            />
          </label>
          <label>
            Ngày nhận xe
            <input type="date" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} />
          </label>
          <label>
            Ngày trả xe
            <input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
          </label>
        </div>
        <div className="filter-actions">
          <button type="submit" className="btn btn--primary">
            Tìm kiếm
          </button>
          <button type="button" className="btn" onClick={resetFilters}>
            Xóa bộ lọc
          </button>
        </div>
      </form>

      {error && <div className="error-box">{error}</div>}
      {loading ? (
        <Loading />
      ) : vehicles.length === 0 ? (
        <p>Không tìm thấy xe phù hợp.</p>
      ) : (
        <>
          <div className="vehicle-grid">
            {vehicles.map((v) => (
              <article key={v.vehicleId} className="card vehicle-card">
                <h3>
                  {v.brand} {v.model}
                </h3>
                <p className="muted">
                  {v.category.name} · {v.licensePlate}
                </p>
                <p>
                  {v.seats} chỗ · {v.transmission === 'AUTO' ? 'Tự động' : 'Số sàn'} · {v.fuelType}
                </p>
                <p>
                  <strong>{v.dailyRate.toLocaleString('vi-VN')} đ/ngày</strong>
                </p>
                <p className="muted">Chi nhánh: {v.branch.name}</p>
                <Link to={`/vehicles/${v.vehicleId}`} className="btn btn--primary">
                  Xem chi tiết
                </Link>
              </article>
            ))}
          </div>
          <div className="pagination">
            <button
              className="btn"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Trước
            </button>
            <span>
              Trang {page} / {totalPages} (tổng {total} xe)
            </span>
            <button
              className="btn"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Sau
            </button>
          </div>
        </>
      )}
    </section>
  );
}
