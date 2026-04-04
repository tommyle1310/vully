'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';
import {
  FileText,
  Search,
  ChevronLeft,
  ChevronRight,
  Check,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { useInvoices, Invoice } from '@/hooks/use-invoices';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { InvoiceDetailSheet } from './invoice-detail-sheet';
import { BulkGenerateInvoicesDialog } from './bulk-generate-dialog';

const columnHelper = createColumnHelper<Invoice>();

const statusConfig: Record<
  Invoice['status'],
  { label: string; variant: 'default' | 'success' | 'warning' | 'destructive'; icon: typeof Clock }
> = {
  draft: { label: 'Draft', variant: 'default', icon: FileText },
  pending: { label: 'Pending', variant: 'warning', icon: Clock },
  paid: { label: 'Paid', variant: 'success', icon: Check },
  overdue: { label: 'Overdue', variant: 'destructive', icon: AlertCircle },
  cancelled: { label: 'Cancelled', variant: 'default', icon: FileText },
};

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

const columns = [
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

function TableSkeleton() {
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

export default function InvoicesPage() {
  const { hasAnyRole } = useAuthStore();
  const isAdmin = hasAnyRole(['admin', 'technician']);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<Invoice['status'] | 'all'>('all');

  const { data, isLoading, error } = useInvoices({
    page,
    limit: 20,
    status: statusFilter === 'all' ? undefined : statusFilter,
  });

  const invoices = data?.data || [];
  const meta = data?.meta;

  const table = useReactTable({
    data: invoices,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isAdmin ? 'Invoices' : 'My Invoices'}
          </h1>
          <p className="text-muted-foreground">
            {isAdmin
              ? 'Manage billing and invoices for all tenants.'
              : 'View your billing history and invoices.'}
          </p>
        </div>
        <TableSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-lg font-semibold">Failed to load invoices</h2>
        <p className="text-muted-foreground">
          {error.message || 'An error occurred while loading invoices.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isAdmin ? 'Invoices' : 'My Invoices'}
          </h1>
          <p className="text-muted-foreground">
            {isAdmin
              ? 'Manage billing and invoices for all tenants.'
              : 'View your billing history and invoices.'}
          </p>
        </div>
        {isAdmin && <BulkGenerateInvoicesDialog />}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search invoices..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as Invoice['status'] | 'all')}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            <AnimatePresence mode="popLayout">
              {table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    <FileText className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No invoices found.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <motion.tr
                    key={row.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="border-b cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setSelectedInvoice(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </motion.tr>
                ))
              )}
            </AnimatePresence>
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {meta && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * meta.limit + 1} to{' '}
            {Math.min(page * meta.limit, meta.total)} of {meta.total} invoices
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page * meta.limit >= meta.total}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Sheet */}
      <InvoiceDetailSheet
        invoice={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
      />
    </div>
  );
}
