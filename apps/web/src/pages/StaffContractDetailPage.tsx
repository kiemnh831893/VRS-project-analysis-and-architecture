import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { ErrorState, Loading } from '../components/Status.js';
import { downloadContractDocument, fetchContract } from '../api/contracts.js';
import type { Contract, ContractDocument } from '../api/contracts.js';

export function StaffContractDetailPage() {
  const { id } = useParams();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchContract(id)
      .then(setContract)
      .catch((e) => setError(e instanceof Error ? e.message : 'Lỗi tải'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleDownload(doc?: ContractDocument) {
    if (!doc) return;
    try {
      const { blob, filename } = await downloadContractDocument(
        contract!.contractId,
        doc.documentId,
      );
      const url = URL.createObjectURL(blob);
      const link = globalThis.document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi tải tài liệu');
    }
  }

  const receipt = contract?.documents.find((d) => d.documentType === 'RECEIPT');
  const rentalContract = contract?.documents.find((d) => d.documentType === 'RENTAL_CONTRACT');

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} />;
  if (!contract) return <ErrorState message="Không tìm thấy hợp đồng." />;

  return (
    <section className="card">
      <h1>Hợp đồng {contract.contractNumber}</h1>
      <p>
        <strong>Trạng thái:</strong> {contract.contractStatus}
      </p>
      <p>
        <strong>Khách hàng:</strong> {contract.booking.customer.user.fullName} (
        {contract.booking.customer.user.email})
      </p>
      <p>
        <strong>Xe:</strong> {contract.booking.vehicle.brand} {contract.booking.vehicle.model} —{' '}
        {contract.booking.vehicle.licensePlate}
      </p>
      <p>
        <strong>Nhận xe:</strong> {new Date(contract.actualPickupAt).toLocaleString('vi-VN')}
      </p>
      {contract.actualReturnAt && (
        <p>
          <strong>Trả xe:</strong> {new Date(contract.actualReturnAt).toLocaleString('vi-VN')}
        </p>
      )}

      <h2>Kiểm tra</h2>
      <ul>
        {contract.inspections.map((i) => (
          <li key={i.inspectionId}>
            {i.inspectionType}: {i.mileage} km, {i.fuelLevelPercent}% nhiên liệu, {i.condition}
          </li>
        ))}
      </ul>

      {contract.fines.length > 0 && (
        <>
          <h2>Phạt</h2>
          <ul>
            {contract.fines.map((f) => (
              <li key={f.fineId}>
                {f.violationType}: {f.amount.toLocaleString('vi-VN')} đ ({f.status})
              </li>
            ))}
          </ul>
        </>
      )}

      {contract.invoice && (
        <>
          <h2>Hóa đơn</h2>
          <p>Tổng: {contract.invoice.totalAmount.toLocaleString('vi-VN')} đ</p>
          <p>Đặt cọc đã trừ: {contract.invoice.depositApplied.toLocaleString('vi-VN')} đ</p>
          <p>Còn phải trả: {contract.invoice.finalAmountDue.toLocaleString('vi-VN')} đ</p>
          <p>Trạng thái: {contract.invoice.status}</p>
          <button
            type="button"
            className="btn"
            onClick={() => void handleDownload(receipt)}
            disabled={!receipt}
          >
            Tải hóa đơn PDF
          </button>
          {!receipt && <p>Không có hóa đơn PDF.</p>}
        </>
      )}

      <div style={{ marginTop: '1rem' }}>
        <button
          type="button"
          className="btn"
          onClick={() => void handleDownload(rentalContract)}
          disabled={!rentalContract}
        >
          Tải hợp đồng PDF
        </button>
        {!rentalContract && <p>Không có hợp đồng PDF.</p>}
      </div>
    </section>
  );
}
