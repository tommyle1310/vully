'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { TierBreakdownData } from '@/hooks/use-invoices';
import { cn } from '@/lib/utils';

interface TierBreakdownProps {
  breakdown: TierBreakdownData;
  environmentFee?: number;
}

export function TierBreakdown({ breakdown, environmentFee }: TierBreakdownProps) {
  const [open, setOpen] = useState(breakdown.tiers ? breakdown.tiers.length <= 3 : true);

  if (breakdown.flatRate) {
    return (
      <div className="pl-4 py-1 text-xs text-muted-foreground">
        Flat rate: {breakdown.usage} × {formatCurrency(breakdown.unitPrice ?? 0)}
      </div>
    );
  }

  if (!breakdown.tiers || breakdown.tiers.length === 0) return null;

  const needsCollapse = breakdown.tiers.length > 3;

  return (
    <div className="pl-4 border-l-2 border-muted ml-2 my-1">
      {needsCollapse ? (
        <>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown
              className={cn(
                'h-3 w-3 transition-transform',
                !open && '-rotate-90',
              )}
            />
            {breakdown.tiers.length} tiers
          </button>
          {open && <TierRows tiers={breakdown.tiers} />}
        </>
      ) : (
        <TierRows tiers={breakdown.tiers} />
      )}
      {environmentFee != null && environmentFee > 0 && (
        <div className="text-xs text-muted-foreground mt-0.5">
          Environment fee: {formatCurrency(environmentFee)}
        </div>
      )}
    </div>
  );
}

function TierRows({ tiers }: { tiers: NonNullable<TierBreakdownData['tiers']> }) {
  return (
    <div className="space-y-0.5">
      {tiers.map((t) => (
        <div key={t.tier} className="text-xs text-muted-foreground">
          Tier {t.tier}: {t.qty} × {formatCurrency(t.price)} = {formatCurrency(t.amount)}
        </div>
      ))}
    </div>
  );
}
