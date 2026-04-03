'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
} from '@tanstack/react-table';
import {
  DollarSign,
  Plus,
  MoreVertical,
  Trash2,
  Edit,
  Receipt,
  Calendar,
  Wand2,
  AlertCircle,
  ArrowUpDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  usePaymentSchedules,
  useDeletePaymentSchedule,
  useGenerateRentSchedule,
  useGeneratePurchaseMilestones,
  PaymentSchedule,
  PaymentType,
  PaymentStatus,
} from '@/hooks/use-payments';
import { RecordPaymentDialog } from './RecordPaymentDialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface PaymentScheduleTableProps {
  contractId: string;
  contractType?: 'rental' | 'purchase' | 'lease_to_own';
  rentAmount?: number;
}

const columnHelper = createColumnHelper<PaymentSchedule>();

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

const statusConfig: Record<PaymentStatus, { label: string; variant: 'default' | 'success' | 'warning' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pending', variant: 'default' },
  partial: { label: 'Partial', variant: 'warning' },
  paid: { label: 'Paid', variant: 'success' },
  overdue: { label: 'Overdue', variant: 'destructive' },
  waived: { label: 'Waived', variant: 'outline' },
};

const paymentTypeLabels: Record<PaymentType, string> = {
  downpayment: 'Down Payment',
  installment: 'Installment',
  rent: 'Rent',
  deposit: 'Deposit',
  option_fee: 'Option Fee',
  penalty: 'Penalty',
  adjustment: 'Adjustment',
};

function TableSkeleton() {
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

export function PaymentScheduleTable({
  contractId,
  contractType = 'rental',
  rentAmount,
}: PaymentScheduleTableProps) {
  const { toast } = useToast();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<PaymentSchedule | null>(null);
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);

  const { data, isLoading, error, refetch } = usePaymentSchedules(contractId);
  const deleteSchedule = useDeletePaymentSchedule();
  const generateRentSchedule = useGenerateRentSchedule(contractId);
  const generatePurchaseMilestones = useGeneratePurchaseMilestones(contractId);

  const schedules = data?.data || [];

  const columns = useMemo(
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
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedSchedule(schedule);
                      setRecordPaymentOpen(true);
                    }}
                  >
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
                  onClick={() => handleDeleteSchedule(schedule.id)}
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
    []
  );

  const table = useReactTable({
    data: schedules,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const handleDeleteSchedule = (scheduleId: string) => {
    if (!confirm('Are you sure you want to delete this payment schedule?')) {
      return;
    }

    deleteSchedule.mutate(scheduleId, {
      onSuccess: () => {
        toast({
          title: 'Schedule deleted',
          description: 'Payment schedule has been deleted.',
        });
        refetch();
      },
      onError: (error: Error) => {
        toast({
          title: 'Error',
          description: error.message || 'Failed to delete schedule',
          variant: 'destructive',
        });
      },
    });
  };

  const handleGenerateSchedules = () => {
    generateRentSchedule.mutate(
      { months: 12 },
      {
        onSuccess: (result) => {
          toast({
            title: 'Schedules generated',
            description: `Generated ${result.data?.length || 0} payment schedules.`,
          });
          refetch();
        },
        onError: (error: Error) => {
          toast({
            title: 'Error',
            description: error.message || 'Failed to generate schedules',
            variant: 'destructive',
          });
        },
      }
    );
  };

  const handleGeneratePurchaseMilestones = () => {
    generatePurchaseMilestones.mutate(
      { progressPaymentCount: 3 },
      {
        onSuccess: (result) => {
          toast({
            title: 'Milestones generated',
            description: `Generated ${result.data?.length || 0} payment milestones.`,
          });
          refetch();
        },
        onError: (error: Error) => {
          toast({
            title: 'Error',
            description: error.message || 'Failed to generate milestones',
            variant: 'destructive',
          });
        },
      }
    );
  };

  if (isLoading) {
    return <TableSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <AlertCircle className="h-8 w-8 text-destructive mb-2" />
        <p className="text-sm text-muted-foreground">Failed to load payment schedules</p>
        <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Payment Schedule</h3>
            <Badge variant="outline" className="ml-2">
              {schedules.length} entries
            </Badge>
          </div>
          <div className="flex gap-2">
            {contractType === 'rental' && schedules.length === 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateSchedules}
                disabled={generateRentSchedule.isPending}
              >
                <Wand2 className="mr-2 h-4 w-4" />
                Auto-Generate (12 months)
              </Button>
            )}
            {contractType === 'purchase' && schedules.length === 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleGeneratePurchaseMilestones}
                disabled={generatePurchaseMilestones.isPending}
              >
                <Wand2 className="mr-2 h-4 w-4" />
                Generate Payment Milestones
              </Button>
            )}
            <Button size="sm" disabled>
              <Plus className="mr-2 h-4 w-4" />
              Add Entry
            </Button>
          </div>
        </div>

        {/* Table */}
        {schedules.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
            <DollarSign className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-4">
              No payment schedules yet
            </p>
            {contractType === 'rental' && (
              <Button
                variant="outline"
                onClick={handleGenerateSchedules}
                disabled={generateRentSchedule.isPending}
              >
                <Wand2 className="mr-2 h-4 w-4" />
                Generate Rent Schedule
              </Button>
            )}
            {contractType === 'purchase' && (
              <Button
                variant="outline"
                onClick={handleGeneratePurchaseMilestones}
                disabled={generatePurchaseMilestones.isPending}
              >
                <Wand2 className="mr-2 h-4 w-4" />
                Generate Payment Milestones
              </Button>
            )}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} style={{ width: header.getSize() }}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
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
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="border-b transition-colors hover:bg-muted/50"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Record Payment Dialog */}
      <RecordPaymentDialog
        open={recordPaymentOpen}
        onOpenChange={setRecordPaymentOpen}
        schedule={selectedSchedule}
        onSuccess={() => refetch()}
      />
    </>
  );
}

export default PaymentScheduleTable;
