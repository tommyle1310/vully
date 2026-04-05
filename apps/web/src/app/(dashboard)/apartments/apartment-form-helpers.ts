export function toFormValue(v: unknown): string {
  if (v == null) return '';
  return String(v);
}

export function cleanValue(v: unknown): unknown {
  if (v === '' || v === undefined) return undefined;
  return v;
}

export function cleanNumber(v: unknown): number | undefined {
  if (v === '' || v === undefined || v === null) return undefined;
  const n = Number(v);
  return isNaN(n) ? undefined : n;
}
