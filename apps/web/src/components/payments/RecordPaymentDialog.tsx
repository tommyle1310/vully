'use client';

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
import { useRecordPayment, PaymentSchedule, PaymentMethod } from '@/hooks/use-payments';
import { useAuthStore } from '@/stores/authStore';
import { VietQRDisplay } from './VietQRDisplay';
import { Loader2, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

const recordPaymentSchema = z.object({
  amount: z.coerce.number().positive('Amount must be positive'),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  paymentMethod: z.enum(['bank_transfer', 'cash', 'check', 'card', 'other']).optional(),
  referenceNumber: z.string().max(100).optional(),
  notes: z.string().optional(),
});

type RecordPaymentForm = z.infer<typeof recordPaymentSchema>;

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: PaymentSchedule | null;
  invoiceId?: string;
  onSuccess?: () => void;
}

const allPaymentMethods: Record<PaymentMethod, string> = {
  bank_transfer: 'Bank Transfer',
  cash: 'Cash',
  check: 'Check',
  card: 'Card',
  other: 'Other',
};

const residentPaymentMethods: PaymentMethod[] = ['bank_transfer', 'cash'];

export function RecordPaymentDialog({
  open,
  onOpenChange,
  schedule,
  invoiceId,
  onSuccess,
}: RecordPaymentDialogProps) {
  const { toast } = useToast();
  const recordPayment = useRecordPayment();
  const isResident = useAuthStore((s) => s.hasRole('resident') && !s.hasRole('admin'));
  
  const balance = schedule ? schedule.expectedAmount - schedule.receivedAmount : 0;
  
  const availableMethods = isResident
    ? residentPaymentMethods.map((m) => [m, allPaymentMethods[m]] as const)
    : (Object.entries(allPaymentMethods) as Array<[PaymentMethod, string]>);
  
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RecordPaymentForm>({
    resolver: zodResolver(recordPaymentSchema),
    defaultValues: {
      amount: balance > 0 ? balance : 0,
      paymentDate: new Date().toISOString().split('T')[0],
    },
  });

  const watchedAmount = watch('amount');
  const watchedMethod = watch('paymentMethod');

  const onSubmit = (data: RecordPaymentForm) => {
    if (!schedule) return;

    recordPayment.mutate(
      {
        scheduleId: schedule.id,
        data: {
          amount: data.amount,
          paymentDate: data.paymentDate,
          paymentMethod: data.paymentMethod as PaymentMethod | undefined,
          referenceNumber: data.referenceNumber,
          notes: data.notes,
        },
      },
      {
        onSuccess: () => {
          toast({
            title: 'Payment recorded',
            description: `Successfully recorded payment of ${formatCurrency(data.amount)}`,
          });
          reset();
          onOpenChange(false);
          onSuccess?.();
        },
        onError: (error: Error) => {
          toast({
            title: 'Error',
            description: error.message || 'Failed to record payment',
            variant: 'destructive',
          });
        },
      }
    );
  };

  const handlePayFullBalance = () => {
    setValue('amount', balance);
  };

  if (!schedule) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Record Payment
          </DialogTitle>
          <DialogDescription>
            Record a payment for: <span className="font-medium">{schedule.periodLabel}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Schedule Summary */}
        <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Expected Amount:</span>
            <span className="font-medium">{formatCurrency(schedule.expectedAmount)}</span>
          </div>
          {(schedule.paymentType === 'rent' || schedule.paymentType === 'installment') && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">VAT (10%):</span>
                <span className="font-medium">{formatCurrency(schedule.expectedAmount * 0.1)}</span>
              </div>
              <div className="flex justify-between text-sm border-t pt-1">
                <span className="font-medium">Total incl. VAT:</span>
                <span className="font-semibold">{formatCurrency(schedule.expectedAmount * 1.1)}</span>
              </div>
            </>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Already Paid:</span>
            <span className="text-green-600">{formatCurrency(schedule.receivedAmount)}</span>
          </div>
          <div className="flex justify-between text-sm border-t pt-2">
            <span className="font-medium">Outstanding Balance:</span>
            <span className={cn(
              "font-semibold",
              balance > 0 ? "text-red-600" : "text-green-600"
            )}>
              {formatCurrency(balance)}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Amount */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="amount">Payment Amount (VND)</Label>
              {balance > 0 && (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={handlePayFullBalance}
                >
                  Pay full balance
                </Button>
              )}
            </div>
            <Input
              id="amount"
              type="number"
              {...register('amount')}
              placeholder="Enter amount"
            />
            {errors.amount && (
              <p className="text-xs text-destructive">{errors.amount.message}</p>
            )}
            {watchedAmount > balance && balance > 0 && (
              <p className="text-xs text-amber-600">
                Amount exceeds outstanding balance (overpayment)
              </p>
            )}
          </div>

          {/* Payment Date */}
          <div className="space-y-2">
            <Label>Payment Date</Label>
            <DatePicker
              value={watch('paymentDate') ? parseISO(watch('paymentDate')) : new Date()}
              onChange={(date) => {
                if (date) setValue('paymentDate', format(date, 'yyyy-MM-dd'));
              }}
            />
            {errors.paymentDate && (
              <p className="text-xs text-destructive">{errors.paymentDate.message}</p>
            )}
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select onValueChange={(value) => setValue('paymentMethod', value as PaymentMethod)}>
              <SelectTrigger>
                <SelectValue placeholder="Select method (optional)" />
              </SelectTrigger>
              <SelectContent>
                {availableMethods.map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* VietQR Display for bank transfers */}
          {isResident && watchedMethod === 'bank_transfer' && invoiceId && (
            <VietQRDisplay invoiceId={invoiceId} amount={balance} />
          )}

          {/* Reference Number */}
          <div className="space-y-2">
            <Label htmlFor="referenceNumber">Reference Number</Label>
            <Input
              id="referenceNumber"
              {...register('referenceNumber')}
              placeholder="Bank ref, receipt no. (optional)"
            />
          </div>

          {/* Notes */}
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
              disabled={recordPayment.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={recordPayment.isPending}>
              {recordPayment.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Record Payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default RecordPaymentDialog;
