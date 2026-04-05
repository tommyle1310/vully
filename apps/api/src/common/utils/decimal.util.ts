// =============================================================================
// Decimal utilities — safe Prisma Decimal → number conversion
// =============================================================================

import { Decimal } from '@prisma/client/runtime/library';

/**
 * Safely convert a Prisma `Decimal | null | undefined` to a plain number.
 * Returns `fallback` (default `0`) when the input is nullish.
 */
export function toNumber(
  value: Decimal | number | null | undefined,
  fallback = 0,
): number {
  if (value == null) return fallback;
  if (typeof value === 'number') return value;
  return value.toNumber();
}
