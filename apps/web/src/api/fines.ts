import { apiFetch } from './client.js';

export interface FineRule {
  fineRuleId: string;
  code: string;
  name: string;
  violationType: string;
  calculationMethod: string;
  rateAmount: number;
}

export async function assessFine(input: {
  contractId: string;
  violationType: 'LATE_RETURN' | 'FUEL_SHORTAGE' | 'EXTERIOR_DAMAGE';
  quantity?: number;
  description?: string;
  fineRuleId?: string;
}) {
  const res = await apiFetch<{ fine: unknown }>('/api/fines', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return res.fine;
}

export async function settleFine(
  fineId: string,
  settlementType: 'PAYMENT' | 'DEPOSIT' | 'WAIVER',
  waiverReason?: string,
) {
  const res = await apiFetch<{ fine: unknown }>(`/api/fines/${fineId}/settle`, {
    method: 'POST',
    body: JSON.stringify({ settlementType, waiverReason }),
  });
  return res.fine;
}
