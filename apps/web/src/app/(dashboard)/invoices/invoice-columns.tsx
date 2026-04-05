import {
  createColumnHelper,
} from '@tanstack/react-table';
import {
  FileText,
  Check,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { Invoice } from '@/hooks/use-invoices';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDate } from '@/lib/format';

const columnHelper = createColumnHelper<Invoice>();

export const statusConfig: Record<
  Invoice['status'],
  { label: string; variant: 'default' | 'success' | 'warning' | 'destructive'; icon: typeof Clock }
> = {
  draft: { label: 'Draft', variant: 'default', icon: FileText },
  pending: { label: 'Pending', variant: 'warning', icon: Clock },
  paid: { label: 'Paid', variant: 'success', icon: Check },
  overdue: { label: 'Overdue', variant: 'destructive', icon: AlertCircle },
  cancelled: { label: 'Cancelled', variant: 'default', icon: FileText },
};

export const columns = [
  columnHelper.accessor('invoice_number', {
    header: 'Invoice #',
    cell: (info) => (
      <span className="font-mono text-sm font-medium">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor('contract.apartments.unit_number', {
    header: 'Unit',
    cell: (info) => {
      const invoice = info.row.original;
      return (
        <div>
          <span className="font-medium">
            {invoice.contract?.apartments.unit_number || '-'}
          </span>
          <span className="block text-xs text-muted-foreground">
            {invoice.contract?.apartments.buildings.name || ''}
          </span>
        </div>
      );
    },
  }),
  columnHelper.accessor('contract.tenant.firstName', {
    header: 'Tenant',
    cell: (info) => {
      const tenant = info.row.original.contract?.tenant;
      if (!tenant) return '-';
      return `${tenant.firstName} ${tenant.lastName}`;
    },
  }),
  columnHelper.accessor('billingPeriod', {
    header: 'Period',
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor('totalAmount', {
    header: 'Amount',
    cell: (info) => (
      <span className="font-medium">{formatCurrency(info.getValue())}</span>
    ),
  }),
  columnHelper.accessor('dueDate', {
    header: 'Due Date',
    cell: (info) => formatDate(info.getValue()),
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => {
      const status = info.getValue();
      const config = statusConfig[status];
      const Icon = config.icon;
      return (
        <Badge variant={config.variant} className="gap-1">
          <Icon className="h-3 w-3" />
          {config.label}
        </Badge>
      );
    },
  }),
];

export function InvoiceTableSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-64" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
      <div className="rounded-md border">
        <div className="border-b p-4">
          <div className="flex gap-4">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <Skeleton key={i} className="h-4 w-20" />
            ))}
          </div>
        </div>
        {[1, 2, 3, 4, 5].map((row) => (
          <div key={row} className="border-b p-4">
            <div className="flex gap-4">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <Skeleton key={i} className="h-4 w-20" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
