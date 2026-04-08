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
import { Search, Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw, ArrowUpDown, History } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/format';
import { usePendingPayments, usePaymentHistory, PendingPayment } from '@/hooks/use-payments';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
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

  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<PendingPayment | null>(null);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);

  const { data: pendingData, isLoading: pendingLoading, error: pendingError, refetch: refetchPending } = usePendingPayments();
  const { data: historyData, isLoading: historyLoading, refetch: refetchHistory } = usePaymentHistory(30);
  
  const pendingPayments = pendingData?.data || [];
  const historyPayments = historyData?.data || [];
  const payments = activeTab === 'pending' ? pendingPayments : historyPayments;

  const pendingColumns = useMemo(
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

  const historyColumns = useMemo(
    () => [
      columnHelper.accessor('verifiedAt', {
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Processed
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: (info) => (
          <div className="space-y-1">
            <div className="font-medium">{formatDate(info.getValue() || '')}</div>
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
          <span className="font-semibold">{formatCurrency(info.getValue())}</span>
        ),
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: (info) => {
          const status = info.getValue();
          return (
            <Badge variant={status === 'confirmed' ? 'success' : 'destructive'}>
              {status === 'confirmed' ? (
                <><CheckCircle2 className="h-3 w-3 mr-1" />Confirmed</>
              ) : (
                <><XCircle className="h-3 w-3 mr-1" />Rejected</>
              )}
            </Badge>
          );
        },
      }),
      columnHelper.accessor('referenceNumber', {
        header: 'Reference',
        cell: (info) => (
          <span className="font-mono text-xs">{info.getValue() || '-'}</span>
        ),
      }),
      columnHelper.accessor('reportedByUser', {
        header: 'Reported By',
        cell: (info) => {
          const user = info.getValue();
          return user ? `${user.firstName} ${user.lastName}` : '-';
        },
      }),
    ],
    []
  );

  const columns = activeTab === 'pending' ? pendingColumns : historyColumns;

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

  const refetch = () => {
    refetchPending();
    refetchHistory();
  };

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

  if (pendingLoading && historyLoading) {
    return <PageSkeleton />;
  }

  if (pendingError) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Failed to load payments</h2>
        <p className="text-muted-foreground mb-4">{pendingError.message}</p>
        <Button onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }

  const confirmedPayments = historyPayments.filter(p => p.status === 'confirmed');
  const rejectedPayments = historyPayments.filter(p => p.status === 'rejected');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payment Verification</h1>
          <p className="text-muted-foreground">
            Review resident-reported payments and view history
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingPayments.length}</div>
            <p className="text-xs text-muted-foreground">Awaiting verification</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Confirmed (30d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{confirmedPayments.length}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(confirmedPayments.reduce((sum, p) => sum + p.amount, 0))}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              Rejected (30d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{rejectedPayments.length}</div>
            <p className="text-xs text-muted-foreground">Invalid reports</p>
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
              {pendingPayments.length > 0
                ? formatDate(
                    pendingPayments.reduce((oldest, p) =>
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'pending' | 'history')}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending
              {pendingPayments.length > 0 && (
                <Badge variant="secondary" className="ml-1">{pendingPayments.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              History (30 days)
            </TabsTrigger>
          </TabsList>

          {/* Search */}
          <div className="relative flex-1 max-w-sm ml-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by tenant, apartment, reference..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <TabsContent value="pending" className="mt-4">
          {pendingPayments.length === 0 ? (
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
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          {historyLoading ? (
            <Skeleton className="h-96" />
          ) : historyPayments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <History className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No payment history</h3>
                <p className="text-muted-foreground text-center">
                  No payments have been processed in the last 30 days.
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
        </TabsContent>
      </Tabs>

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
