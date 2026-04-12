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
      const unit = invoice.contract?.apartments.unit_number
        ?? invoice.apartment?.unit_number;
      const building = invoice.contract?.apartments.buildings.name
        ?? invoice.apartment?.buildings.name;
      const isVacant = !invoice.contractId;

      return (
        <div>
          <span className="font-medium">
            {unit || '-'}
            {isVacant && (
              <Badge variant="outline" className="ml-1.5 text-[10px] px-1 py-0">
                Vacant
              </Badge>
            )}
          </span>
          <span className="block text-xs text-muted-foreground">
            {building || ''}
          </span>
        </div>
      );
    },
  }),
  columnHelper.accessor('contract.tenant.firstName', {
    header: 'Tenant',
    cell: (info) => {
      const invoice = info.row.original;
      const tenant = invoice.contract?.tenant;
      if (tenant) return `${tenant.firstName} ${tenant.lastName}`;
      const owner = invoice.apartment?.owner;
      if (owner) return (
        <span className="text-muted-foreground">{owner.firstName} {owner.lastName} (Owner)</span>
      );
      return '-';
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
