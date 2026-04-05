'use client';

import Link from 'next/link';
import { formatCurrency } from '@/lib/format';
import { TrendingUp, ExternalLink } from 'lucide-react';
import { useContractFinancialSummary } from '@/hooks/use-payments';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

interface PaymentSummarySectionProps {
  contractId: string;
}

export function PaymentSummarySection({ contractId }: PaymentSummarySectionProps) {
  const { data, isLoading, error } = useContractFinancialSummary(contractId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-4 space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-full" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data?.data) return null;

  const summary = data.data;

  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Payment Progress
          </h3>
          <Link href={`/contracts/${contractId}`}>
            <Button variant="ghost" size="sm" className="h-7 text-xs">
              View Details
              <ExternalLink className="ml-1 h-3 w-3" />
            </Button>
          </Link>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span>{summary.paidPercent.toFixed(1)}% complete</span>
            <span className="text-muted-foreground">
              {formatCurrency(summary.totalPaid)} / {formatCurrency(summary.totalContractValue)}
            </span>
          </div>
          <Progress value={summary.paidPercent} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="rounded-md bg-muted/50 p-2">
            <p className="text-xs text-muted-foreground">Outstanding</p>
            <p className="text-sm font-semibold text-red-600">
              {formatCurrency(summary.outstanding)}
            </p>
          </div>
          <div className="rounded-md bg-muted/50 p-2">
            <p className="text-xs text-muted-foreground">Remaining</p>
            <p className="text-sm font-semibold text-amber-600">
              {formatCurrency(summary.remainingBalance)}
            </p>
          </div>
        </div>

        {summary.nextDue && (
          <div className="text-xs text-muted-foreground border-t pt-2">
            Next due: <span className="font-medium text-foreground">{summary.nextDue.periodLabel}</span>
            {' · '}
            {formatCurrency(summary.nextDue.expectedAmount)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
