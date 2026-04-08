'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, parseISO, addMonths } from 'date-fns';
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
import { useCreatePaymentSchedule, PaymentType } from '@/hooks/use-payments';
import { Loader2, Plus } from 'lucide-react';

const addScheduleSchema = z.object({
  periodLabel: z.string().min(1, 'Period label is required').max(100),
  paymentType: z.enum(['rent', 'deposit', 'installment', 'milestone', 'other']),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  expectedAmount: z.coerce.number().positive('Amount must be positive'),
  notes: z.string().optional(),
});

type AddScheduleForm = z.infer<typeof addScheduleSchema>;

const paymentTypeLabels: Record<PaymentType, string> = {
  rent: 'Rent',
  deposit: 'Deposit',
  installment: 'Installment',
  milestone: 'Milestone',
  other: 'Other',
};

interface AddPaymentScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId: string;
  existingCount: number;
  rentAmount?: number;
  onSuccess?: () => void;
}

export function AddPaymentScheduleDialog({
  open,
  onOpenChange,
  contractId,
  existingCount,
  rentAmount = 0,
  onSuccess,
}: AddPaymentScheduleDialogProps) {
  const { toast } = useToast();
  const createSchedule = useCreatePaymentSchedule(contractId);

  // Generate default values
  const nextMonth = addMonths(new Date(), existingCount > 0 ? 1 : 0);
  const defaultPeriodLabel = format(nextMonth, 'MMMM yyyy');
  const defaultDueDate = format(new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 5), 'yyyy-MM-dd');

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AddScheduleForm>({
    resolver: zodResolver(addScheduleSchema),
    defaultValues: {
      periodLabel: `Rent ${defaultPeriodLabel}`,
      paymentType: 'rent',
      dueDate: defaultDueDate,
      expectedAmount: rentAmount, // Auto-fill with contract rent amount
      notes: '',
    },
  });

  const onSubmit = (data: AddScheduleForm) => {
    createSchedule.mutate(
      {
        periodLabel: data.periodLabel,
        paymentType: data.paymentType as PaymentType,
        sequenceNumber: existingCount + 1,
        dueDate: data.dueDate,
        expectedAmount: data.expectedAmount,
        notes: data.notes,
      },
      {
        onSuccess: () => {
          toast({
            title: 'Schedule created',
            description: `Added payment schedule: ${data.periodLabel}`,
          });
          reset();
          onOpenChange(false);
          onSuccess?.();
        },
        onError: (error: Error) => {
          toast({
            title: 'Error',
            description: error.message || 'Failed to create schedule',
            variant: 'destructive',
          });
        },
      }
    );
  };

  const handlePaymentTypeChange = (type: string) => {
    setValue('paymentType', type as PaymentType);
    // Update period label based on type
    const typeLabel = paymentTypeLabels[type as PaymentType] || type;
    setValue('periodLabel', `${typeLabel} ${defaultPeriodLabel}`);
    
    // Auto-fill amount based on type
    if (type === 'rent' && rentAmount > 0) {
      setValue('expectedAmount', rentAmount);
    } else if (type === 'deposit' && rentAmount > 0) {
      // Default deposit is typically 2 months rent
      setValue('expectedAmount', rentAmount * 2);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Payment Schedule
          </DialogTitle>
          <DialogDescription>
            Add a new payment entry to this contract&apos;s schedule.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Payment Type</Label>
            <Select
              value={watch('paymentType')}
              onValueChange={handlePaymentTypeChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(paymentTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="periodLabel">Period Label</Label>
            <Input
              id="periodLabel"
              {...register('periodLabel')}
              placeholder="e.g., Rent January 2026"
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
            <Label htmlFor="expectedAmount">Expected Amount</Label>
            <Input
              id="expectedAmount"
              type="number"
              {...register('expectedAmount')}
              placeholder="Enter amount"
            />
            {(watch('expectedAmount') ?? 0) > 0 && (watch('paymentType') === 'rent' || watch('paymentType') === 'installment' || watch('paymentType') === 'milestone') && (
              <div className="rounded-md bg-muted/50 px-3 py-2 text-xs space-y-1">
                <div className="flex justify-between text-muted-foreground">
                  <span>VAT (10%)</span>
                  <span>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format((watch('expectedAmount') ?? 0) * 0.1)}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Total incl. VAT</span>
                  <span>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format((watch('expectedAmount') ?? 0) * 1.1)}</span>
                </div>
              </div>
            )}
            {(watch('expectedAmount') ?? 0) > 0 && watch('paymentType') !== 'rent' && watch('paymentType') !== 'installment' && watch('paymentType') !== 'milestone' && (
              <p className="text-xs text-muted-foreground">VAT calculated at invoice generation based on category</p>
            )}
            {errors.expectedAmount && (
              <p className="text-xs text-destructive">{errors.expectedAmount.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Additional notes"
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createSchedule.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createSchedule.isPending}>
              {createSchedule.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Add Schedule
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default AddPaymentScheduleDialog;
