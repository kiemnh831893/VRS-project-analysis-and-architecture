import { apiFetch, apiFetchBlob } from './client.js';

export interface Inspection {
  inspectionId: string;
  contractId: string;
  inspectionType: 'PICKUP' | 'RETURN';
  mileage: number;
  fuelLevelPercent: number;
  condition: 'INTACT' | 'SCRATCHED' | 'DAMAGED';
  notes: string | null;
  inspectedById: string;
  inspectedAt: string;
  photos: { photoId: string; storageKey: string }[];
}

export interface Fine {
  fineId: string;
  contractId: string;
  invoiceId: string | null;
  violationType:
    'LATE_RETURN' | 'FUEL_SHORTAGE' | 'EXTERIOR_DAMAGE' | 'INTERIOR_DAMAGE' | 'CLEANING' | 'OTHER';
  description: string | null;
  quantity: number;
  unitAmount: number;
  amount: number;
  status: 'UNPAID' | 'PAID' | 'WAIVED';
  settlementType: string | null;
  assessedAt: string;
}

export interface InvoiceLine {
  invoiceLineId: string;
  lineType: string;
  description: string;
  quantity: number;
  unitAmount: number;
  lineAmount: number;
}

export interface Invoice {
  invoiceId: string;
  invoiceNumber: string;
  contractId: string;
  status: string;
  rentalFee: number;
  insuranceFee: number;
  fineFee: number;
  discountAmount: number;
  totalAmount: number;
  depositAmount: number;
  depositApplied: number;
  finalAmountDue: number;
  amountPaid: number;
  refundAmount: number;
  currency: string;
  lines: InvoiceLine[];
}

export interface ContractDocument {
  documentId: string;
  documentType: string;
  version: number;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  isCurrent: boolean;
}

export interface Contract {
  contractId: string;
  contractNumber: string;
  bookingId: string;
  staffHandoverId: string;
  staffReturnId: string | null;
  actualPickupAt: string;
  expectedReturnDate: string;
  actualReturnAt: string | null;
  contractStatus: 'ACTIVE' | 'OVERDUE' | 'COMPLETED';
  completedAt: string | null;
  booking: {
    bookingId: string;
    bookingCode: string;
    customerId: string;
    customer: { user: { fullName: string; email: string; phone?: string } };
    vehicle: {
      vehicleId: string;
      brand: string;
      model: string;
      licensePlate: string;
      status?: string;
      category: { name: string };
      branch: { name: string };
    };
    pickupDate: string;
    expectedReturnDate: string;
    rentalDays: number;
    rentalSubtotal: number;
    depositAmount: number;
  };
  inspections: Inspection[];
  fines: Fine[];
  invoice: Invoice | null;
  documents: ContractDocument[];
}

export interface ContractListResponse {
  items: Contract[];
}

export async function fetchContracts(status?: string): Promise<Contract[]> {
  const q = status ? `?status=${status}` : '';
  const res = await apiFetch<ContractListResponse>(`/api/contracts${q}`);
  return res.items;
}

export async function fetchContract(id: string): Promise<Contract> {
  const res = await apiFetch<{ contract: Contract }>(`/api/contracts/${id}`);
  return res.contract;
}

export async function downloadContractDocument(contractId: string, documentId: string) {
  return apiFetchBlob(`/api/contracts/${contractId}/documents/${documentId}/download`);
}

export async function lookupBooking(code: string) {
  const res = await apiFetch<{ booking: unknown }>(
    `/api/contracts/lookup-booking/${encodeURIComponent(code)}`,
  );
  return res.booking;
}

export async function createContract(input: {
  bookingId?: string;
  bookingCode?: string;
  actualPickupAt?: string;
  pickupInspection: {
    mileage: number;
    fuelLevelPercent: number;
    condition: 'INTACT' | 'SCRATCHED' | 'DAMAGED';
    notes?: string;
    photos?: string[];
  };
}) {
  const res = await apiFetch<{ contract: Contract }>('/api/contracts', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return res.contract;
}

export async function processReturn(input: {
  contractId: string;
  actualReturnAt?: string;
  returnInspection: {
    mileage: number;
    fuelLevelPercent: number;
    condition: 'INTACT' | 'SCRATCHED' | 'DAMAGED';
    notes?: string;
    photos?: string[];
  };
  fuelShortageLitres?: number;
  exteriorDamage?: boolean;
  damageDescription?: string;
  discountAmount?: number;
}) {
  const res = await apiFetch<{ contract: Contract }>(`/api/contracts/${input.contractId}/return`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return res.contract;
}
