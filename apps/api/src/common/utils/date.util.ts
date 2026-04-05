// =============================================================================
// Date utilities — replaces duplicated inline date arithmetic across services
// =============================================================================

/**
 * Get the first and last moment of a given month.
 * Useful for querying "this month" or "last month" ranges.
 */
export function getMonthBoundaries(date: Date): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

/** First millisecond of the month containing `date`. */
export function getStartOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/** First millisecond of the *previous* month relative to `date`. */
export function getStartOfLastMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() - 1, 1);
}

/** Last millisecond of the *previous* month relative to `date`. */
export function getEndOfLastMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 0, 23, 59, 59, 999);
}

/** Shorthand: returns `{ startOfMonth, startOfLastMonth, endOfLastMonth }` for a given date. */
export function getMonthRange(date: Date) {
  return {
    startOfMonth: getStartOfMonth(date),
    startOfLastMonth: getStartOfLastMonth(date),
    endOfLastMonth: getEndOfLastMonth(date),
  };
}

/** First millisecond of the month that is `offset` months from `base` (negative = past). */
export function getMonthOffset(base: Date, offset: number): Date {
  return new Date(base.getFullYear(), base.getMonth() + offset, 1);
}
