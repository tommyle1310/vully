'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  SortingState,
} from '@tanstack/react-table';
import {
  DollarSign,
  Plus,
  Wand2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  usePaymentSchedules,
  useDeletePaymentSchedule,
  useGenerateRentSchedule,
  useGeneratePurchaseMilestones,
  PaymentSchedule,
} from '@/hooks/use-payments';
import { RecordPaymentDialog } from './RecordPaymentDialog';
import { EditPaymentScheduleDialog } from './EditPaymentScheduleDialog';
import { usePaymentColumns, PaymentTableSkeleton } from './payment-schedule-columns';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/authStore';

interface PaymentScheduleTableProps {
  contractId: string;
  contractType?: 'rental' | 'purchase' | 'lease_to_own';
  rentAmount?: number;
}

export function PaymentScheduleTable({
  contractId,
  contractType = 'rental',
  rentAmount: _rentAmount,
}: PaymentScheduleTableProps) {
  const { toast } = useToast();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<PaymentSchedule | null>(null);
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [editScheduleOpen, setEditScheduleOpen] = useState(false);
  const isAdmin = useAuthStore((s) => s.hasRole('admin') || s.hasRole('technician'));

  const { data, isLoading, error, refetch } = usePaymentSchedules(contractId);
  const deleteSchedule = useDeletePaymentSchedule();
  const generateRentSchedule = useGenerateRentSchedule(contractId);
  const generatePurchaseMilestones = useGeneratePurchaseMilestones(contractId);

  const schedules = data?.data || [];

  const handleRecordPayment = useCallback((schedule: PaymentSchedule) => {
    setSelectedSchedule(schedule);
    setRecordPaymentOpen(true);
  }, []);

  const handleDeleteSchedule = useCallback((scheduleId: string) => {
    if (!confirm('Are you sure you want to delete this payment schedule?')) return;

    deleteSchedule.mutate(scheduleId, {
      onSuccess: () => {
        toast({ title: 'Schedule deleted', description: 'Payment schedule has been deleted.' });
        refetch();
      },
      onError: (error: Error) => {
        toast({ title: 'Error', description: error.message || 'Failed to delete schedule', variant: 'destructive' });
      },
    });
  }, [deleteSchedule, toast, refetch]);

  const handleEditSchedule = useCallback((schedule: PaymentSchedule) => {
    setSelectedSchedule(schedule);
    setEditScheduleOpen(true);
  }, []);

  const columns = usePaymentColumns(handleRecordPayment, handleDeleteSchedule, handleEditSchedule, isAdmin);

  const table = useReactTable({
    data: schedules,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const handleGenerateSchedules = () => {
    generateRentSchedule.mutate(
      { months: 12 },
      {
        onSuccess: (result) => {
          toast({ title: 'Schedules generated', description: `Generated ${result.data?.length || 0} payment schedules.` });
          refetch();
        },
        onError: (error: Error) => {
          toast({ title: 'Error', description: error.message || 'Failed to generate schedules', variant: 'destructive' });
        },
      }
    );
  };

  const handleGeneratePurchaseMilestones = () => {
    generatePurchaseMilestones.mutate(
      { progressPaymentCount: 3 },
      {
        onSuccess: (result) => {
          toast({ title: 'Milestones generated', description: `Generated ${result.data?.length || 0} payment milestones.` });
          refetch();
        },
        onError: (error: Error) => {
          toast({ title: 'Error', description: error.message || 'Failed to generate milestones', variant: 'destructive' });
        },
      }
    );
  };

  if (isLoading) return <PaymentTableSkeleton />;

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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Payment Schedule</h3>
            <Badge variant="outline" className="ml-2">
              {schedules.length} entries
            </Badge>
          </div>
          <div className="flex gap-2">
            {isAdmin && contractType === 'rental' && schedules.length === 0 && (
              <Button variant="outline" size="sm" onClick={handleGenerateSchedules} disabled={generateRentSchedule.isPending}>
                <Wand2 className="mr-2 h-4 w-4" />
                Auto-Generate (12 months)
              </Button>
            )}
            {isAdmin && contractType === 'purchase' && schedules.length === 0 && (
              <Button variant="outline" size="sm" onClick={handleGeneratePurchaseMilestones} disabled={generatePurchaseMilestones.isPending}>
                <Wand2 className="mr-2 h-4 w-4" />
                Generate Payment Milestones
              </Button>
            )}
            {isAdmin && (
              <Button size="sm" disabled>
                <Plus className="mr-2 h-4 w-4" />
                Add Entry
              </Button>
            )}
          </div>
        </div>

        {schedules.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
            <DollarSign className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-4">No payment schedules yet</p>
            {isAdmin && contractType === 'rental' && (
              <Button variant="outline" onClick={handleGenerateSchedules} disabled={generateRentSchedule.isPending}>
                <Wand2 className="mr-2 h-4 w-4" />
                Generate Rent Schedule
              </Button>
            )}
            {isAdmin && contractType === 'purchase' && (
              <Button variant="outline" onClick={handleGeneratePurchaseMilestones} disabled={generatePurchaseMilestones.isPending}>
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
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
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
      </div>

      <RecordPaymentDialog
        open={recordPaymentOpen}
        onOpenChange={setRecordPaymentOpen}
        schedule={selectedSchedule}
        onSuccess={() => refetch()}
      />

      <EditPaymentScheduleDialog
        open={editScheduleOpen}
        onOpenChange={setEditScheduleOpen}
        schedule={selectedSchedule}
        onSuccess={() => refetch()}
      />
    </>
  );
}

export default PaymentScheduleTable;
