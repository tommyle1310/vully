// =============================================================================
// Centralized default constants — replaces magic values scattered across services
// =============================================================================

// --- Cache ---
/** Default cache TTL for dashboard/analytics endpoints (5 minutes) */
export const CACHE_TTL_MS = 300_000;

/** Short-lived cache TTL for real-time feeds like recent activity (1 minute) */
export const CACHE_TTL_SHORT_MS = 60_000;

// --- Billing ---
/** Default day-of-month when invoices are due */
export const DEFAULT_INVOICE_DUE_DAY = 15;

/** Default VAT/tax rate for residential rent in Vietnam */
export const DEFAULT_TAX_RATE = 0;

/** Fallback per-unit utility price (VND) when no tiers are configured */
export const DEFAULT_UTILITY_RATE = 3000;

// --- Building ---
/** Net area ≈ 85 % of gross area (thông thủy vs tim tường) */
export const NET_AREA_RATIO = 0.85;

// --- Payment ---
/** Default day-of-month when rent payments are due */
export const DEFAULT_PAYMENT_DUE_DAY = 5;

// --- Pagination ---
/** Default number of items per page */
export const DEFAULT_PAGINATION_LIMIT = 20;

// --- AI Assistant ---
/** Maximum AI chat queries per day for non-admin users */
export const MAX_QUERIES_PER_DAY = 20;

// --- Time Windows ---
/** 30-day lookback window in milliseconds */
export const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/** 7-day lookback window in milliseconds */
export const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/** 24-hour window in milliseconds */
export const ONE_DAY_MS = 24 * 60 * 60 * 1000;
