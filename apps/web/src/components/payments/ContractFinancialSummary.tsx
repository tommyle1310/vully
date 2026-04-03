'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useContractFinancialSummary, ContractFinancialSummary, PaymentSchedule } from '@/hooks/use-payments';
import { AlertCircle, Calendar, TrendingUp, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContractFinancialSummaryCardProps {
  contractId: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'paid':
      return <Badge variant="success">Paid</Badge>;
    case 'partial':
      return <Badge variant="warning">Partial</Badge>;
    case 'overdue':
      return <Badge variant="destructive">Overdue</Badge>;
    case 'pending':
      return <Badge variant="default">Pending</Badge>;
    case 'waived':
      return <Badge variant="outline">Waived</Badge>;
    default:
      return <Badge variant="default">{status}</Badge>;
  }
}

function SummarySkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-full" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-6 w-24" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function ContractFinancialSummaryCard({ contractId }: ContractFinancialSummaryCardProps) {
  const { data, isLoading, error } = useContractFinancialSummary(contractId);

  if (isLoading) {
    return <SummarySkeleton />;
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="flex items-center gap-2 py-4 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span>Failed to load financial summary</span>
        </CardContent>
      </Card>
    );
  }

  const summary = data?.data;
  if (!summary) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No payment data available
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Financial Summary
        </CardTitle>
        <CardDescription>
          Payment progress and outstanding balance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Payment Progress</span>
            <span className="font-medium">{summary.paidPercent.toFixed(1)}%</span>
          </div>
          <Progress value={summary.paidPercent} className="h-3" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Paid: {formatCurrency(summary.totalPaid)}</span>
            <span>Total: {formatCurrency(summary.totalContractValue)}</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Total Value</p>
            <p className="text-lg font-semibold">{formatCurrency(summary.totalContractValue)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Total Paid</p>
            <p className="text-lg font-semibold text-green-600">{formatCurrency(summary.totalPaid)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Outstanding</p>
            <p className={cn(
              "text-lg font-semibold",
              summary.outstanding > 0 && "text-red-600"
            )}>
              {formatCurrency(summary.outstanding)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Remaining</p>
            <p className="text-lg font-semibold text-amber-600">{formatCurrency(summary.remainingBalance)}</p>
          </div>
        </div>

        {/* Next Due */}
        {summary.nextDue && (
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Next Payment Due</span>
                </div>
                <p className="text-sm text-muted-foreground">{summary.nextDue.periodLabel}</p>
                <p className="text-lg font-semibold">{formatCurrency(summary.nextDue.expectedAmount)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Due Date</p>
                <p className="font-medium">{formatDate(summary.nextDue.dueDate)}</p>
                {getStatusBadge(summary.nextDue.status)}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ContractFinancialSummaryCard;
