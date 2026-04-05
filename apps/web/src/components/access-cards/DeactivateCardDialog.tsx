'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import {
  useDeactivateAccessCard,
  AccessCard,
  DeactivationReason,
  getReasonLabel,
} from '@/hooks/use-access-cards';
import { Loader2, AlertTriangle } from 'lucide-react';

const REASONS: DeactivationReason[] = ['lost', 'stolen', 'resident_left', 'admin_action'];

const deactivateSchema = z.object({
  reason: z.enum(['lost', 'stolen', 'resident_left', 'admin_action']),
  notes: z.string().max(500).optional(),
});

type DeactivateForm = z.infer<typeof deactivateSchema>;

interface DeactivateCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: AccessCard | null;
  onSuccess?: () => void;
}

export function DeactivateCardDialog({
  open,
  onOpenChange,
  card,
  onSuccess,
}: DeactivateCardDialogProps) {
  const { toast } = useToast();
  const deactivateCard = useDeactivateAccessCard();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<DeactivateForm>({
    resolver: zodResolver(deactivateSchema),
    defaultValues: {
      reason: 'admin_action',
      notes: '',
    },
  });

  const watchedReason = watch('reason');

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      reset();
    }
    onOpenChange(newOpen);
  };

  const onSubmit = (data: DeactivateForm) => {
    if (!card) return;

    deactivateCard.mutate(
      {
        id: card.id,
        data: {
          reason: data.reason as DeactivationReason,
          notes: data.notes || undefined,
        },
      },
      {
        onSuccess: () => {
          toast({
            title: 'Card deactivated',
            description: `Access card ${card.cardNumber} has been deactivated.`,
          });
          handleOpenChange(false);
          onSuccess?.();
        },
        onError: (error: Error) => {
          toast({
            variant: 'destructive',
            title: 'Failed to deactivate card',
            description: error.message || 'An error occurred',
          });
        },
      },
    );
  };

  if (!card) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Deactivate Access Card</DialogTitle>
          <DialogDescription>
            This will immediately revoke access for card{' '}
            <span className="font-medium">{card.cardNumber}</span>.
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Important</AlertTitle>
          <AlertDescription>
            The card will no longer work for building access. This action can be
            reversed by reactivating the card later.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason *</Label>
            <Select
              value={watchedReason}
              onValueChange={(v) =>
                setValue('reason', v as DeactivationReason)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((reason) => (
                  <SelectItem key={reason} value={reason}>
                    {getReasonLabel(reason)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.reason && (
              <p className="text-sm text-destructive">{errors.reason.message}</p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="e.g., Reported lost on 2024-01-15"
              {...register('notes')}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={deactivateCard.isPending}
            >
              {deactivateCard.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Deactivate Card
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
