export function toPlain<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (typeof value === 'bigint') return Number(value) as unknown as T;
  if (value instanceof Date) return value;
  if (
    typeof value === 'object' &&
    'toNumber' in (value as object) &&
    typeof (value as { toNumber?: unknown }).toNumber === 'function'
  ) {
    return (value as unknown as { toNumber: () => number }).toNumber() as unknown as T;
  }
  if (Array.isArray(value)) return value.map((v) => toPlain(v)) as unknown as T;
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = toPlain(v);
    }
    return out as unknown as T;
  }
  return value;
}
