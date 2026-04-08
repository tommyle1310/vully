'use client';

import { useState } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { useCreateIncident } from '@/hooks/use-incidents';
import { Loader2, Send, CheckCircle2, Info } from 'lucide-react';

const requestCardSchema = z.object({
  cardType: z.enum(['building', 'parking']),
  reason: z.string().min(10, 'Please provide a reason (at least 10 characters)').max(500),
});

type RequestCardForm = z.infer<typeof requestCardSchema>;

interface RequestAccessCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apartmentId: string;
  onSuccess?: () => void;
}

export function RequestAccessCardDialog({
  open,
  onOpenChange,
  apartmentId,
  onSuccess,
}: RequestAccessCardDialogProps) {
  const { toast } = useToast();
  const createIncident = useCreateIncident();
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RequestCardForm>({
    resolver: zodResolver(requestCardSchema),
    defaultValues: {
      cardType: 'building',
      reason: '',
    },
  });

  const watchedCardType = watch('cardType');

  const onSubmit = (data: RequestCardForm) => {
    // Create an incident as access card request
    createIncident.mutate(
      {
        apartmentId,
        title: `Access Card Request: ${data.cardType === 'building' ? 'Building' : 'Parking'} Card`,
        description: `Request Type: ${data.cardType === 'building' ? 'Building Access Card' : 'Parking Access Card'}\n\nReason:\n${data.reason}`,
        category: 'security', // Access card requests are security-related
        priority: 'low',
      },
      {
        onSuccess: () => {
          setSubmitted(true);
          toast({
            title: 'Request submitted',
            description: 'Your access card request has been submitted. Management will review it shortly.',
          });
          onSuccess?.();
        },
        onError: (error: Error) => {
          toast({
            title: 'Error',
            description: error.message || 'Failed to submit request',
            variant: 'destructive',
          });
        },
      }
    );
  };

  const handleClose = () => {
    reset();
    setSubmitted(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Request Access Card
          </DialogTitle>
          <DialogDescription>
            Submit a request for a new access card. Management will review and process your request.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-lg font-medium mb-2">Request Submitted!</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Your access card request has been submitted. You will be notified once it has been processed.
            </p>
            <Button onClick={handleClose}>Close</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Access card requests are typically processed within 1-2 business days.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label>Card Type</Label>
              <Select
                value={watchedCardType}
                onValueChange={(value) => setValue('cardType', value as 'building' | 'parking')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select card type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="building">Building Access Card</SelectItem>
                  <SelectItem value="parking">Parking Card</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Request</Label>
              <Textarea
                id="reason"
                {...register('reason')}
                placeholder="Please explain why you need this access card (e.g., new resident, replacement for lost card, additional family member)"
                rows={4}
              />
              {errors.reason && (
                <p className="text-xs text-destructive">{errors.reason.message}</p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={createIncident.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createIncident.isPending}>
                {createIncident.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Submit Request
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default RequestAccessCardDialog;
