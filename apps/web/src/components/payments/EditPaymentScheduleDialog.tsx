'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { formatCurrency } from '@/lib/format';
import { format, parseISO } from 'date-fns';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/date-picker';
import { useToast } from '@/hooks/use-toast';
import { useUpdatePaymentSchedule, PaymentSchedule, PaymentStatus } from '@/hooks/use-payments';
import { Loader2, Edit } from 'lucide-react';

const editScheduleSchema = z.object({
  periodLabel: z.string().min(1, 'Period label is required').max(100),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  expectedAmount: z.coerce.number().nonnegative('Amount must be non-negative'),
  status: z.enum(['pending', 'partial', 'paid', 'overdue', 'waived']),
  notes: z.string().optional(),
});

type EditScheduleForm = z.infer<typeof editScheduleSchema>;

const statusLabels: Record<PaymentStatus, string> = {
  pending: 'Pending',
  partial: 'Partial',
  paid: 'Paid',
  overdue: 'Overdue',
  waived: 'Waived',
};

interface EditPaymentScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: PaymentSchedule | null;
  onSuccess?: () => void;
}

export function EditPaymentScheduleDialog({
  open,
  onOpenChange,
  schedule,
  onSuccess,
}: EditPaymentScheduleDialogProps) {
  const { toast } = useToast();
  const updateSchedule = useUpdatePaymentSchedule();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EditScheduleForm>({
    resolver: zodResolver(editScheduleSchema),
  });

  useEffect(() => {
    if (schedule && open) {
      reset({
        periodLabel: schedule.periodLabel,
        dueDate: schedule.dueDate.split('T')[0],
        expectedAmount: schedule.expectedAmount,
        status: schedule.status,
        notes: schedule.notes || '',
      });
    }
  }, [schedule, open, reset]);

  const onSubmit = (data: EditScheduleForm) => {
    if (!schedule) return;

    updateSchedule.mutate(
      {
        scheduleId: schedule.id,
        data: {
          periodLabel: data.periodLabel,
          dueDate: data.dueDate,
          expectedAmount: data.expectedAmount,
          status: data.status as PaymentStatus,
          notes: data.notes,
        },
      },
      {
        onSuccess: () => {
          toast({
            title: 'Schedule updated',
            description: `Updated payment schedule for ${data.periodLabel}`,
          });
          onOpenChange(false);
          onSuccess?.();
        },
        onError: (error: Error) => {
          toast({
            title: 'Error',
            description: error.message || 'Failed to update schedule',
            variant: 'destructive',
          });
        },
      }
    );
  };

  if (!schedule) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit Payment Schedule
          </DialogTitle>
          <DialogDescription>
            Update schedule: <span className="font-medium">{schedule.periodLabel}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="periodLabel">Period Label</Label>
            <Input
              id="periodLabel"
              {...register('periodLabel')}
              placeholder="e.g., January 2026"
            />
            {errors.periodLabel && (
              <p className="text-xs text-destructive">{errors.periodLabel.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Due Date</Label>
            <DatePicker
              value={watch('dueDate') ? parseISO(watch('dueDate')) : undefined}
              onChange={(date) => {
                if (date) setValue('dueDate', format(date, 'yyyy-MM-dd'));
              }}
            />
            {errors.dueDate && (
              <p className="text-xs text-destructive">{errors.dueDate.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="expectedAmount">Expected Amount (VND)</Label>
            <Input
              id="expectedAmount"
              type="number"
              {...register('expectedAmount')}
              placeholder="Enter amount"
            />
            {errors.expectedAmount && (
              <p className="text-xs text-destructive">{errors.expectedAmount.message}</p>
            )}
            {schedule.receivedAmount > 0 && (
              <p className="text-xs text-muted-foreground">
                Already received: {formatCurrency(schedule.receivedAmount)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={watch('status')}
              onValueChange={(value) => setValue('status', value as PaymentStatus)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Additional notes (optional)"
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateSchedule.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateSchedule.isPending}>
              {updateSchedule.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default EditPaymentScheduleDialog;
