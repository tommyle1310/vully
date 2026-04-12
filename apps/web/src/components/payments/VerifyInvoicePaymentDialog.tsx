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
import { Invoice, useVerifyInvoicePayment } from '@/hooks/use-invoices';
import { Loader2, CheckCircle, XCircle, Eye, User, Calendar, Banknote, FileText, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Structured rejection reasons
const REJECTION_REASONS = [
  { value: 'insufficient_amount', label: 'Insufficient Amount' },
  { value: 'wrong_reference', label: 'Wrong Reference Number' },
  { value: 'blurry_receipt', label: 'Blurry/Unreadable Receipt' },
  { value: 'duplicate_payment', label: 'Duplicate Payment' },
  { value: 'expired_receipt', label: 'Expired Receipt' },
  { value: 'other', label: 'Other (Specify in Notes)' },
] as const;

const verifyInvoicePaymentSchema = z.object({
  status: z.enum(['confirmed', 'rejected']),
  notes: z.string().optional(),
  actualAmount: z.coerce.number().positive().optional(),
  rejectionReason: z.enum(['insufficient_amount', 'wrong_reference', 'blurry_receipt', 'duplicate_payment', 'expired_receipt', 'other']).optional(),
});

type VerifyInvoicePaymentForm = z.infer<typeof verifyInvoicePaymentSchema>;

interface ReportedPaymentInfo {
  amount: number;
  paymentDate: string;
  paymentMethod?: string;
  referenceNumber?: string;
  notes?: string;
  reportedBy: string;
  reportedAt: string;
}

interface VerifyInvoicePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | null;
  reportedPayment: ReportedPaymentInfo | null;
  onSuccess?: () => void;
}

export function VerifyInvoicePaymentDialog({
  open,
  onOpenChange,
  invoice,
  reportedPayment,
  onSuccess,
}: VerifyInvoicePaymentDialogProps) {
  const { toast } = useToast();
  const verifyPayment = useVerifyInvoicePayment();
  
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<VerifyInvoicePaymentForm>({
    resolver: zodResolver(verifyInvoicePaymentSchema),
    defaultValues: {
      status: 'confirmed',
      actualAmount: reportedPayment?.amount,
    },
  });

  const watchedStatus = watch('status');
  const watchedAmount = watch('actualAmount');
  const watchedRejectionReason = watch('rejectionReason');

  const onSubmit = (data: VerifyInvoicePaymentForm) => {
    if (!invoice || !reportedPayment) return;

    verifyPayment.mutate(
      {
        invoiceId: invoice.id,
        data: {
          status: data.status,
          notes: data.notes,
          actualAmount: data.status === 'confirmed' && data.actualAmount !== reportedPayment.amount 
            ? data.actualAmount 
            : undefined,
          rejectionReason: data.status === 'rejected' ? data.rejectionReason : undefined,
        },
      },
      {
        onSuccess: () => {
          toast({
            title: data.status === 'confirmed' ? 'Payment Confirmed' : 'Payment Rejected',
            description: data.status === 'confirmed'
              ? `Payment of ${formatCurrency(data.actualAmount ?? reportedPayment.amount)} has been verified.`
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

  const handleStatusChange = (value: 'confirmed' | 'rejected') => {
    setValue('status', value);
    // Reset amount to reported amount when switching to confirmed
    if (value === 'confirmed' && reportedPayment) {
      setValue('actualAmount', reportedPayment.amount);
    }
    // Reset rejection reason when switching to confirmed
    if (value === 'confirmed') {
      setValue('rejectionReason', undefined);
    }
  };

  if (!invoice || !reportedPayment) return null;

  const tenant = invoice.contract?.tenant;
  const apartment = invoice.contract?.apartments;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Review Invoice Payment
          </DialogTitle>
          <DialogDescription>
            Verify or reject the reported payment for invoice <span className="font-medium">{invoice.invoice_number}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Invoice Info */}
          <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{invoice.invoice_number}</span>
              </div>
              <Badge variant="outline">{invoice.billingPeriod}</Badge>
            </div>
            
            {tenant && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{tenant.firstName} {tenant.lastName}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">{apartment?.unit_number}</span>
              </div>
            )}

            <Separator />

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Invoice Total:</span>
                <p className="font-semibold">{formatCurrency(invoice.totalAmount)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Due Date:</span>
                <p className="font-medium">{formatDate(invoice.dueDate)}</p>
              </div>
            </div>
          </div>

          {/* Reported Payment Details */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Banknote className="h-4 w-4" />
              Reported Payment
            </h4>
            <div className="rounded-lg border p-4 space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Amount:</span>
                  <p className="font-semibold text-lg text-green-600">
                    {formatCurrency(reportedPayment.amount)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Payment Date:</span>
                  <p className="font-medium">{formatDate(reportedPayment.paymentDate)}</p>
                </div>
                {reportedPayment.paymentMethod && (
                  <div>
                    <span className="text-muted-foreground">Method:</span>
                    <p className="font-medium capitalize">
                      {reportedPayment.paymentMethod.replace('_', ' ')}
                    </p>
                  </div>
                )}
                {reportedPayment.referenceNumber && (
                  <div>
                    <span className="text-muted-foreground">Reference:</span>
                    <p className="font-mono text-sm">{reportedPayment.referenceNumber}</p>
                  </div>
                )}
              </div>
              
              <Separator />
              
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>Reported {formatDate(reportedPayment.reportedAt)}</span>
              </div>
              
              {reportedPayment.notes && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Notes:</span>
                  <p className="mt-1 text-sm bg-muted p-2 rounded">{reportedPayment.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Verification Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Decision</Label>
              <Select value={watchedStatus} onValueChange={handleStatusChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmed">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Confirm Payment
                    </div>
                  </SelectItem>
                  <SelectItem value="rejected">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-600" />
                      Reject Payment
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {watchedStatus === 'confirmed' && (
              <div className="space-y-2">
                <Label htmlFor="actualAmount">
                  Verified Amount
                  <span className="text-muted-foreground text-xs ml-2">
                    (adjust if different from reported)
                  </span>
                </Label>
                <Input
                  id="actualAmount"
                  type="number"
                  step="0.01"
                  {...register('actualAmount')}
                  className={cn(
                    watchedAmount !== reportedPayment.amount && 'border-amber-500'
                  )}
                />
                {watchedAmount !== reportedPayment.amount && (
                  <p className="text-xs text-amber-600">
                    Different from reported amount ({formatCurrency(reportedPayment.amount)})
                  </p>
                )}
                {errors.actualAmount && (
                  <p className="text-xs text-destructive">{errors.actualAmount.message}</p>
                )}
              </div>
            )}

            {watchedStatus === 'rejected' && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Rejection Reason
                </Label>
                <Select
                  value={watchedRejectionReason}
                  onValueChange={(value) => setValue('rejectionReason', value as VerifyInvoicePaymentForm['rejectionReason'])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a reason..." />
                  </SelectTrigger>
                  <SelectContent>
                    {REJECTION_REASONS.map((reason) => (
                      <SelectItem key={reason.value} value={reason.value}>
                        {reason.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">
                {watchedStatus === 'confirmed' ? 'Verification Notes' : 'Additional Notes'}
              </Label>
              <Textarea
                id="notes"
                placeholder={
                  watchedStatus === 'confirmed'
                    ? 'Optional notes about the verification...'
                    : watchedRejectionReason === 'other'
                      ? 'Required: explain the rejection reason...'
                      : 'Optional additional details...'
                }
                {...register('notes')}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                verifyPayment.isPending ||
                (watchedStatus === 'rejected' && !watchedRejectionReason)
              }
              variant={watchedStatus === 'confirmed' ? 'default' : 'destructive'}
            >
              {verifyPayment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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

export default VerifyInvoicePaymentDialog;
