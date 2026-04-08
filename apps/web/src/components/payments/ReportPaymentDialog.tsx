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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DatePicker } from '@/components/date-picker';
import { useToast } from '@/hooks/use-toast';
import { useReportPayment, PaymentSchedule, PaymentMethod } from '@/hooks/use-payments';
import { useContract } from '@/hooks/use-contracts';
import { ScheduleQRDisplay } from './ScheduleQRDisplay';
import { Loader2, Send, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const reportPaymentSchema = z.object({
  amount: z.coerce.number().positive('Amount must be positive'),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  paymentMethod: z.enum(['bank_transfer', 'cash']).optional(),
  referenceNumber: z.string().max(100).optional(),
  notes: z.string().optional(),
});

type ReportPaymentForm = z.infer<typeof reportPaymentSchema>;

interface ReportPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: PaymentSchedule | null;
  onSuccess?: () => void;
}

const paymentMethods: Record<PaymentMethod, string> = {
  bank_transfer: 'Bank Transfer',
  cash: 'Cash',
  check: 'Check',
  card: 'Card',
  other: 'Other',
};

export function ReportPaymentDialog({
  open,
  onOpenChange,
  schedule,
  onSuccess,
}: ReportPaymentDialogProps) {
  const { toast } = useToast();
  const reportPayment = useReportPayment();
  
  // Fetch contract info to get building ID for QR code
  const { data: contractData } = useContract(schedule?.contractId ?? '');
  const contract = contractData?.data;
  const buildingId = contract?.apartment?.buildingId;
  // TODO: Get owner ID if rental - for now we'll use building's bank account
  
  const balance = schedule ? schedule.expectedAmount - schedule.receivedAmount : 0;
  
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ReportPaymentForm>({
    resolver: zodResolver(reportPaymentSchema),
    defaultValues: {
      amount: balance > 0 ? balance : 0,
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'bank_transfer',
    },
  });

  const watchedAmount = watch('amount');
  const watchedMethod = watch('paymentMethod');

  const onSubmit = (data: ReportPaymentForm) => {
    if (!schedule) return;

    reportPayment.mutate(
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
            title: 'Payment reported',
            description: 'Your payment has been reported. Admin will verify your transfer shortly.',
          });
          reset();
          onOpenChange(false);
          onSuccess?.();
        },
        onError: (error: Error) => {
          toast({
            title: 'Error',
            description: error.message || 'Failed to report payment',
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
            <Send className="h-5 w-5" />
            Report Payment Transfer
          </DialogTitle>
          <DialogDescription>
            Report your transfer for: <span className="font-medium">{schedule.periodLabel}</span>
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            After submitting, an admin will verify your payment against bank statements. 
            You&apos;ll receive a notification once verified.
          </AlertDescription>
        </Alert>

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

        {/* VietQR Display for bank transfers */}
        {watchedMethod === 'bank_transfer' && buildingId && (
          <ScheduleQRDisplay
            buildingId={buildingId}
            amount={watchedAmount > 0 ? watchedAmount : balance}
            reference={`RENT_${schedule.periodLabel.replace(/\s+/g, '_')}`}
            isRentPayment={true}
          />
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Amount */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="amount">Transfer Amount (VND)</Label>
              {balance > 0 && (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={handlePayFullBalance}
                >
                  Use full balance
                </Button>
              )}
            </div>
            <Input
              id="amount"
              type="number"
              {...register('amount')}
              placeholder="Enter amount transferred"
            />
            {errors.amount && (
              <p className="text-xs text-destructive">{errors.amount.message}</p>
            )}
            {watchedAmount > balance && balance > 0 && (
              <p className="text-xs text-amber-600">
                Amount exceeds outstanding balance
              </p>
            )}
          </div>

          {/* Payment Date */}
          <div className="space-y-2">
            <Label>Transfer Date</Label>
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
            <Select 
              value={watchedMethod}
              onValueChange={(value) => setValue('paymentMethod', value as 'bank_transfer' | 'cash')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reference Number */}
          <div className="space-y-2">
            <Label htmlFor="referenceNumber">Transfer Reference Number</Label>
            <Input
              id="referenceNumber"
              {...register('referenceNumber')}
              placeholder="Bank transfer reference (helps admin verify faster)"
            />
            <p className="text-xs text-muted-foreground">
              You can find this in your banking app after the transfer completes
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Any additional information..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={reportPayment.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={reportPayment.isPending}>
              {reportPayment.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Report Payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default ReportPaymentDialog;
