'use client';

import { formatCurrency } from '@/lib/format';

interface ProRateIndicatorProps {
  metadata: {
    proRated?: boolean;
    billableDays?: number;
    totalDays?: number;
    fullMonthAmount?: number;
  };
}

export function ProRateIndicator({ metadata }: ProRateIndicatorProps) {
  if (!metadata.proRated) return null;

  return (
    <div className="text-xs text-muted-foreground mt-0.5">
      Pro-rated: {metadata.billableDays}/{metadata.totalDays} days
      {metadata.fullMonthAmount != null && (
        <span className="ml-1">(full: {formatCurrency(metadata.fullMonthAmount)})</span>
      )}
    </div>
  );
}
