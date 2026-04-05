'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  useReactivateAccessCard,
  AccessCard,
  getStatusLabel,
} from '@/hooks/use-access-cards';
import { Loader2 } from 'lucide-react';

interface ReactivateCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: AccessCard | null;
  onSuccess?: () => void;
}

export function ReactivateCardDialog({
  open,
  onOpenChange,
  card,
  onSuccess,
}: ReactivateCardDialogProps) {
  const { toast } = useToast();
  const reactivateCard = useReactivateAccessCard();

  const handleReactivate = () => {
    if (!card) return;

    if (card.status === 'expired') {
      toast({
        variant: 'destructive',
        title: 'Cannot reactivate',
        description: 'Expired cards cannot be reactivated. Please issue a new card.',
      });
      onOpenChange(false);
      return;
    }

    reactivateCard.mutate(card.id, {
      onSuccess: () => {
        toast({
          title: 'Card reactivated',
          description: `Access card ${card.cardNumber} is now active.`,
        });
        onOpenChange(false);
        onSuccess?.();
      },
      onError: (error: Error) => {
        toast({
          variant: 'destructive',
          title: 'Failed to reactivate',
          description: error.message || 'An error occurred',
        });
      },
    });
  };

  if (!card) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reactivate Access Card</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Are you sure you want to reactivate card{' '}
                <span className="font-medium">{card.cardNumber}</span>?
              </p>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Current status:</span>
                <Badge variant="outline">{getStatusLabel(card.status)}</Badge>
              </div>
              <p>
                The card will immediately regain access to the configured zones
                and floors.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleReactivate}
            disabled={reactivateCard.isPending}
          >
            {reactivateCard.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Reactivate
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
