import { useMemo } from 'react';
import { formatCurrency, formatDate } from '@/lib/format';
import { createColumnHelper } from '@tanstack/react-table';
import {
  MoreVertical,
  Trash2,
  Edit,
  Receipt,
  Calendar,
  ArrowUpDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PaymentSchedule, PaymentType, PaymentStatus } from '@/hooks/use-payments';
import { cn } from '@/lib/utils';

const columnHelper = createColumnHelper<PaymentSchedule>();

export const statusConfig: Record<PaymentStatus, { label: string; variant: 'default' | 'success' | 'warning' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pending', variant: 'default' },
  partial: { label: 'Partial', variant: 'warning' },
  paid: { label: 'Paid', variant: 'success' },
  overdue: { label: 'Overdue', variant: 'destructive' },
  waived: { label: 'Waived', variant: 'outline' },
};

export const paymentTypeLabels: Record<PaymentType, string> = {
  downpayment: 'Down Payment',
  installment: 'Installment',
  rent: 'Rent',
  deposit: 'Deposit',
  option_fee: 'Option Fee',
  penalty: 'Penalty',
  adjustment: 'Adjustment',
};

export function usePaymentColumns(
  onRecordPayment: (schedule: PaymentSchedule) => void,
  onDelete: (scheduleId: string) => void,
) {
  return useMemo(
    () => [
      columnHelper.accessor('sequenceNumber', {
        header: '#',
        cell: (info) => (
          <span className="font-mono text-sm text-muted-foreground">
            {info.getValue()}
          </span>
        ),
        size: 60,
      }),
      columnHelper.accessor('periodLabel', {
        header: 'Period',
        cell: (info) => (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{info.getValue()}</span>
          </div>
        ),
      }),
      columnHelper.accessor('paymentType', {
        header: 'Type',
        cell: (info) => (
          <Badge variant="outline" className="text-xs">
            {paymentTypeLabels[info.getValue()] || info.getValue()}
          </Badge>
        ),
      }),
      columnHelper.accessor('dueDate', {
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Due Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: (info) => {
          const dueDate = new Date(info.getValue());
          const isOverdue = dueDate < new Date() && info.row.original.status !== 'paid';
          return (
            <span className={cn(isOverdue && 'text-red-600 font-medium')}>
              {formatDate(info.getValue())}
            </span>
          );
        },
      }),
      columnHelper.accessor('expectedAmount', {
        header: 'Expected',
        cell: (info) => (
          <span className="font-medium">{formatCurrency(info.getValue())}</span>
        ),
      }),
      columnHelper.accessor('receivedAmount', {
        header: 'Received',
        cell: (info) => {
          const received = info.getValue();
          const expected = info.row.original.expectedAmount;
          return (
            <span className={cn(
              "font-medium",
              received > 0 && received >= expected && "text-green-600",
              received > 0 && received < expected && "text-amber-600"
            )}>
              {formatCurrency(received)}
            </span>
          );
        },
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: (info) => {
          const status = info.getValue();
          const config = statusConfig[status];
          return (
            <Badge variant={config.variant}>
              {config.label}
            </Badge>
          );
        },
      }),
      columnHelper.display({
        id: 'actions',
        cell: (info) => {
          const schedule = info.row.original;
          const canRecordPayment = schedule.status !== 'paid' && schedule.status !== 'waived';
          
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canRecordPayment && (
                  <DropdownMenuItem onClick={() => onRecordPayment(schedule)}>
                    <Receipt className="mr-2 h-4 w-4" />
                    Record Payment
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem disabled>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Schedule
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => onDelete(schedule.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
        size: 50,
      }),
    ],
    [onRecordPayment, onDelete]
  );
}

export function PaymentTableSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="rounded-md border">
        <div className="border-b p-4">
          <div className="flex gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-4 w-20" />
            ))}
          </div>
        </div>
        {[1, 2, 3, 4, 5].map((row) => (
          <div key={row} className="border-b p-4">
            <div className="flex gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-4 w-20" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
