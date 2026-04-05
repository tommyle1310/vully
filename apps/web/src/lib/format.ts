/**
 * Shared formatting utilities used across the frontend.
 */

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(
  dateString: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  return new Date(dateString).toLocaleDateString(
    'vi-VN',
    options ?? {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    },
  );
}
