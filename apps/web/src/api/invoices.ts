import { apiFetch } from './client.js';
import type { Invoice } from './contracts.js';

export async function fetchInvoice(id: string): Promise<Invoice> {
  const res = await apiFetch<{ invoice: Invoice }>(`/api/invoices/${id}`);
  return res.invoice;
}

export async function generateInvoice(contractId: string, discountAmount?: number) {
  const res = await apiFetch<{ invoice: Invoice }>('/api/invoices', {
    method: 'POST',
    body: JSON.stringify({ contractId, discountAmount }),
  });
  return res.invoice;
}

export async function settleInvoice(
  invoiceId: string,
  input: { amount: number; method: 'CASH' | 'SIMULATED_ONLINE'; idempotencyKey: string },
) {
  const res = await apiFetch<{ payment: unknown; invoice: Invoice }>(
    `/api/invoices/${invoiceId}/settle`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
  return res;
}
