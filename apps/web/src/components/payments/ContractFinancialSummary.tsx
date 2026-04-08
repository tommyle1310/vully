'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/format';
import { Progress } from '@/components/ui/progress';
import { useContractFinancialSummary, Payment } from '@/hooks/use-payments';
import { AlertCircle, Calendar, TrendingUp, QrCode, Clock, CheckCircle2, XCircle, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface ContractFinancialSummaryCardProps {
  contractId: string;
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

function getPaymentStatusBadge(status: string) {
  switch (status) {
    case 'confirmed':
      return <Badge variant="success" className="text-xs"><CheckCircle2 className="mr-1 h-3 w-3" />Confirmed</Badge>;
    case 'reported':
      return <Badge variant="secondary" className="text-xs"><Clock className="mr-1 h-3 w-3" />Pending</Badge>;
    case 'rejected':
      return <Badge variant="destructive" className="text-xs"><XCircle className="mr-1 h-3 w-3" />Rejected</Badge>;
    default:
      return <Badge variant="default" className="text-xs">{status}</Badge>;
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
  const [historyOpen, setHistoryOpen] = useState(false);

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

  const hasReportedPending = summary.reportedPending > 0;
  const recentPayments = summary.recentPayments || [];

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

        {/* Reported Pending Alert */}
        {hasReportedPending && (
          <div className="rounded-lg border-l-4 border-l-amber-500 bg-amber-50 dark:bg-amber-950/20 p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Pending Verification
              </span>
            </div>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              {formatCurrency(summary.reportedPending)} reported - awaiting admin confirmation
            </p>
          </div>
        )}

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
                <p className="text-lg font-semibold">
                  {formatCurrency(summary.nextDue.expectedAmount)}
                  <span className="text-xs font-normal text-muted-foreground ml-1">(excl. VAT)</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Due Date</p>
                <p className="font-medium">{formatDate(summary.nextDue.dueDate)}</p>
                {getStatusBadge(summary.nextDue.status)}
              </div>
            </div>
            {summary.outstanding > 0 && (
              <div className="mt-3 pt-3 border-t">
                <Link
                  href={`/invoices?contractId=${contractId}`}
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                >
                  <QrCode className="h-3 w-3" />
                  View invoices for VietQR payment
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Payment History */}
        {recentPayments.length > 0 && (
          <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between px-0 hover:bg-transparent">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Payment History</span>
                  <Badge variant="outline" className="text-xs">{recentPayments.length}</Badge>
                </div>
                <ChevronDown className={cn("h-4 w-4 transition-transform", historyOpen && "rotate-180")} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {recentPayments.map((payment) => (
                  <PaymentHistoryItem key={payment.id} payment={payment} />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}

function PaymentHistoryItem({ payment }: { payment: Payment }) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3 text-sm">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{formatCurrency(payment.amount)}</span>
          {getPaymentStatusBadge(payment.status)}
        </div>
        <p className="text-xs text-muted-foreground">
          {formatDate(payment.paymentDate)} • {payment.paymentMethod?.replace('_', ' ') || 'Bank Transfer'}
          {payment.referenceNumber && <span className="ml-1">• Ref: {payment.referenceNumber}</span>}
        </p>
        {payment.reportedByUser && (
          <p className="text-xs text-muted-foreground">
            Reported by {payment.reportedByUser.firstName} {payment.reportedByUser.lastName}
          </p>
        )}
      </div>
    </div>
  );
}

export default ContractFinancialSummaryCard;
