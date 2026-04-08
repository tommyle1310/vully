'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { formatCurrency, formatDate } from '@/lib/format';
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
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useVerifyPayment, PendingPayment, ContractPaymentStatus } from '@/hooks/use-payments';
import { Loader2, CheckCircle, XCircle, Eye, User, Calendar, Banknote } from 'lucide-react';
import { cn } from '@/lib/utils';

const verifyPaymentSchema = z.object({
  status: z.enum(['confirmed', 'rejected']),
  notes: z.string().optional(),
  actualAmount: z.coerce.number().positive().optional(),
});

type VerifyPaymentForm = z.infer<typeof verifyPaymentSchema>;

interface VerifyPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: PendingPayment | null;
  onSuccess?: () => void;
}

export function VerifyPaymentDialog({
  open,
  onOpenChange,
  payment,
  onSuccess,
}: VerifyPaymentDialogProps) {
  const { toast } = useToast();
  const verifyPayment = useVerifyPayment();
  
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<VerifyPaymentForm>({
    resolver: zodResolver(verifyPaymentSchema),
    defaultValues: {
      status: 'confirmed',
      actualAmount: payment?.amount,
    },
  });

  const watchedStatus = watch('status');
  const watchedAmount = watch('actualAmount');

  const onSubmit = (data: VerifyPaymentForm) => {
    if (!payment) return;

    verifyPayment.mutate(
      {
        paymentId: payment.id,
        data: {
          status: data.status as ContractPaymentStatus,
          notes: data.notes,
          actualAmount: data.status === 'confirmed' && data.actualAmount !== payment.amount 
            ? data.actualAmount 
            : undefined,
        },
      },
      {
        onSuccess: () => {
          toast({
            title: data.status === 'confirmed' ? 'Payment Confirmed' : 'Payment Rejected',
            description: data.status === 'confirmed'
              ? `Payment of ${formatCurrency(data.actualAmount ?? payment.amount)} has been verified.`
              : 'Payment has been rejected.',
            variant: data.status === 'confirmed' ? 'default' : 'destructive',
          });
          reset();
          onOpenChange(false);
          onSuccess?.();
        },
        onError: (error: Error) => {
          toast({
            title: 'Error',
            description: error.message || 'Failed to verify payment',
            variant: 'destructive',
          });
        },
      }
    );
  };

  if (!payment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Verify Payment
          </DialogTitle>
          <DialogDescription>
            Review and verify the reported payment
          </DialogDescription>
        </DialogHeader>

        {/* Payment Details */}
        <div className="space-y-4">
          {/* Resident Info */}
          <div className="rounded-lg border p-4 space-y-3">
            <h4 className="font-medium flex items-center gap-2 text-sm">
              <User className="h-4 w-4" />
              Reported By
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Resident:</span>
                <p className="font-medium">
                  {payment.reportedByUser 
                    ? `${payment.reportedByUser.firstName} ${payment.reportedByUser.lastName}`
                    : payment.contract?.tenantName || 'Unknown'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Apartment:</span>
                <p className="font-medium">{payment.contract?.apartmentCode || 'N/A'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Reported At:</span>
                <p className="font-medium">
                  {payment.reportedAt ? formatDate(new Date(payment.reportedAt).toISOString(), { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Amount Info */}
          <div className="rounded-lg border p-4 space-y-3">
            <h4 className="font-medium flex items-center gap-2 text-sm">
              <Banknote className="h-4 w-4" />
              Payment Details
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Schedule:</span>
                <p className="font-medium">{payment.schedule.periodLabel}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Expected:</span>
                <p className="font-medium">{formatCurrency(payment.schedule.expectedAmount)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Already Paid:</span>
                <p className="font-medium text-green-600">{formatCurrency(payment.schedule.receivedAmount)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">This Payment:</span>
                <p className="font-medium text-blue-600">{formatCurrency(payment.amount)}</p>
              </div>
            </div>

            {/* Payment Summary */}
            <div className="rounded-md bg-muted/50 p-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">After confirmation:</span>
                <span className="font-medium">
                  {formatCurrency(payment.schedule.receivedAmount + payment.amount)} / {formatCurrency(payment.schedule.expectedAmount)}
                </span>
              </div>
              {(() => {
                const remaining = payment.schedule.expectedAmount - payment.schedule.receivedAmount - payment.amount;
                if (remaining <= 0) {
                  return (
                    <p className="text-xs text-green-600 font-medium">
                      ✓ This will complete the payment for this period
                    </p>
                  );
                }
                return (
                  <p className="text-xs text-amber-600">
                    Remaining balance: {formatCurrency(remaining)}
                  </p>
                );
              })()}
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Transfer Date:</span>
                <p className="font-medium">{formatDate(new Date(payment.paymentDate).toISOString())}</p>
              </div>
              {payment.paymentMethod && (
                <div>
                  <span className="text-muted-foreground">Method:</span>
                  <p className="font-medium capitalize">{payment.paymentMethod.replace('_', ' ')}</p>
                </div>
              )}
              {payment.referenceNumber && (
                <div>
                  <span className="text-muted-foreground">Reference:</span>
                  <p className="font-medium font-mono text-xs">{payment.referenceNumber}</p>
                </div>
              )}
            </div>
            {payment.notes && (
              <div className="pt-2 border-t">
                <span className="text-muted-foreground text-sm">Notes:</span>
                <p className="text-sm">{payment.notes}</p>
              </div>
            )}
            {payment.receiptUrl && (
              <div className="pt-2">
                <a 
                  href={payment.receiptUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  View Receipt Image
                </a>
              </div>
            )}
          </div>
        </div>

        <Separator />

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Verification Decision */}
          <div className="space-y-2">
            <Label>Verification Decision</Label>
            <Select 
              value={watchedStatus}
              onValueChange={(value) => setValue('status', value as 'confirmed' | 'rejected')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="confirmed">
                  <span className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Confirm Payment
                  </span>
                </SelectItem>
                <SelectItem value="rejected">
                  <span className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    Reject Payment
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Actual Amount (only for confirmation) */}
          {watchedStatus === 'confirmed' && (
            <div className="space-y-2">
              <Label htmlFor="actualAmount">
                Actual Amount Received (VND)
                <span className="text-muted-foreground text-xs ml-2">
                  (override if different from reported)
                </span>
              </Label>
              <Input
                id="actualAmount"
                type="number"
                {...register('actualAmount')}
                defaultValue={payment.amount}
              />
              {watchedAmount && watchedAmount !== payment.amount && (
                <p className="text-xs text-amber-600">
                  Amount differs from reported ({formatCurrency(payment.amount)})
                </p>
              )}
            </div>
          )}

          {/* Admin Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">
              Admin Notes
              {watchedStatus === 'rejected' && (
                <span className="text-destructive ml-1">*</span>
              )}
            </Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder={
                watchedStatus === 'rejected'
                  ? 'Provide reason for rejection (required)...'
                  : 'Optional notes for the record...'
              }
              rows={3}
            />
            {watchedStatus === 'rejected' && !watch('notes') && (
              <p className="text-xs text-amber-600">
                Please provide a reason for rejection
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={verifyPayment.isPending}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={verifyPayment.isPending || (watchedStatus === 'rejected' && !watch('notes'))}
              variant={watchedStatus === 'rejected' ? 'destructive' : 'default'}
            >
              {verifyPayment.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {watchedStatus === 'confirmed' ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Confirm Payment
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject Payment
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default VerifyPaymentDialog;
