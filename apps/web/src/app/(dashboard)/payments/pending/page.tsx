'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  SortingState,
  createColumnHelper,
} from '@tanstack/react-table';
import { Search, Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw, ArrowUpDown } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/format';
import { usePendingPayments, PendingPayment } from '@/hooks/use-payments';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { VerifyPaymentDialog } from '@/components/payments/VerifyPaymentDialog';

const columnHelper = createColumnHelper<PendingPayment>();

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-10 w-64 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-96" />
    </div>
  );
}

export default function PendingPaymentsPage() {
  const { hasRole } = useAuthStore();
  const isAdmin = hasRole('admin');

  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<PendingPayment | null>(null);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);

  const { data, isLoading, error, refetch } = usePendingPayments();
  const payments = data?.data || [];

  const columns = useMemo(
    () => [
      columnHelper.accessor('reportedAt', {
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Reported
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: (info) => (
          <div className="space-y-1">
            <div className="font-medium">{formatDate(info.getValue() || '')}</div>
            <div className="text-xs text-muted-foreground">
              {info.row.original.reportedByUser
                ? `${info.row.original.reportedByUser.firstName} ${info.row.original.reportedByUser.lastName}`
                : 'Unknown'}
            </div>
          </div>
        ),
        sortingFn: 'datetime',
      }),
      columnHelper.accessor('contract', {
        header: 'Contract / Apartment',
        cell: (info) => {
          const contract = info.getValue();
          return (
            <div className="space-y-1">
              <div className="font-medium">{contract?.apartmentCode || 'Unknown'}</div>
              <div className="text-xs text-muted-foreground">{contract?.tenantName || 'Unknown tenant'}</div>
            </div>
          );
        },
      }),
      columnHelper.accessor('schedule', {
        header: 'Payment For',
        cell: (info) => {
          const schedule = info.getValue();
          return (
            <div className="space-y-1">
              <div className="font-medium">{schedule.periodLabel}</div>
              <div className="text-xs text-muted-foreground">
                Due: {formatDate(schedule.dueDate)}
              </div>
            </div>
          );
        },
      }),
      columnHelper.accessor('amount', {
        header: 'Amount',
        cell: (info) => (
          <div className="space-y-1">
            <div className="font-semibold text-green-600">{formatCurrency(info.getValue())}</div>
            <div className="text-xs text-muted-foreground">
              Expected: {formatCurrency(info.row.original.schedule.expectedAmount)}
            </div>
          </div>
        ),
      }),
      columnHelper.accessor('paymentMethod', {
        header: 'Method',
        cell: (info) => (
          <Badge variant="outline" className="capitalize">
            {info.getValue()?.replace('_', ' ') || 'Unknown'}
          </Badge>
        ),
      }),
      columnHelper.accessor('referenceNumber', {
        header: 'Reference',
        cell: (info) => (
          <span className="font-mono text-xs">{info.getValue() || '-'}</span>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        cell: (info) => (
          <Button
            size="sm"
            onClick={() => {
              setSelectedPayment(info.row.original);
              setVerifyDialogOpen(true);
            }}
          >
            Review
          </Button>
        ),
        size: 100,
      }),
    ],
    []
  );

  const table = useReactTable({
    data: payments,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  // Access denied for non-admins
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">Only administrators can view pending payments.</p>
      </div>
    );
  }

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Failed to load payments</h2>
        <p className="text-muted-foreground mb-4">{error.message}</p>
        <Button onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pending Payments</h1>
          <p className="text-muted-foreground">
            Review and verify resident-reported payments
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payments.length}</div>
            <p className="text-xs text-muted-foreground">Awaiting verification</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Total Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(payments.reduce((sum, p) => sum + p.amount, 0))}
            </div>
            <p className="text-xs text-muted-foreground">Reported payments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              Oldest Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {payments.length > 0
                ? formatDate(
                    payments.reduce((oldest, p) =>
                      new Date(p.reportedAt || '') < new Date(oldest.reportedAt || '')
                        ? p
                        : oldest
                    ).reportedAt || ''
                  )
                : '-'}
            </div>
            <p className="text-xs text-muted-foreground">Needs attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by tenant, apartment, reference..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Table */}
      {payments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CheckCircle2 className="h-12 w-12 text-green-600 mb-4" />
            <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
            <p className="text-muted-foreground text-center">
              There are no pending payments to review.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              <AnimatePresence mode="popLayout">
                {table.getRowModel().rows.map((row) => (
                  <motion.tr
                    key={row.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="border-b transition-colors hover:bg-muted/50"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </motion.tr>
                ))}
              </AnimatePresence>
            </TableBody>
          </Table>
        </div>
      )}

      {/* Verify Dialog */}
      <VerifyPaymentDialog
        open={verifyDialogOpen}
        onOpenChange={setVerifyDialogOpen}
        payment={selectedPayment}
        onSuccess={() => refetch()}
      />
    </motion.div>
  );
}
