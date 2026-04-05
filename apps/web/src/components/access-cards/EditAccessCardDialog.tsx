'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parseISO } from 'date-fns';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { DatePicker } from '@/components/date-picker';
import { useToast } from '@/hooks/use-toast';
import {
  useUpdateAccessCard,
  AccessCard,
  getCardTypeLabel,
  getStatusLabel,
} from '@/hooks/use-access-cards';
import { Loader2 } from 'lucide-react';

const ALL_ZONES = ['lobby', 'elevator', 'gym', 'pool', 'rooftop', 'laundry'];

const editCardSchema = z.object({
  accessZones: z.array(z.string()).min(1, 'Select at least one zone'),
  floorAccess: z.array(z.number()).optional(),
  expiresAt: z.string().nullable().optional(),
  notes: z.string().max(500).optional(),
});

type EditCardForm = z.infer<typeof editCardSchema>;

interface EditAccessCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: AccessCard | null;
  buildingFloorCount: number;
  onSuccess?: () => void;
}

export function EditAccessCardDialog({
  open,
  onOpenChange,
  card,
  buildingFloorCount,
  onSuccess,
}: EditAccessCardDialogProps) {
  const { toast } = useToast();
  const updateCard = useUpdateAccessCard();

  const floors = Array.from({ length: buildingFloorCount }, (_, i) => i + 1);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EditCardForm>({
    resolver: zodResolver(editCardSchema),
  });

  const watchedAccessZones = watch('accessZones') ?? [];
  const watchedFloorAccess = watch('floorAccess') ?? [];

  // Reset form when dialog opens or card changes
  useEffect(() => {
    if (open && card) {
      reset({
        accessZones: card.accessZones,
        floorAccess: card.floorAccess,
        expiresAt: card.expiresAt ? card.expiresAt.split('T')[0] : null,
        notes: card.notes ?? '',
      });
    }
  }, [open, card, reset]);

  const handleZoneToggle = (zone: string, checked: boolean) => {
    const current = watchedAccessZones;
    if (checked) {
      setValue('accessZones', [...current, zone]);
    } else {
      setValue(
        'accessZones',
        current.filter((z) => z !== zone),
      );
    }
  };

  const handleFloorToggle = (floor: number, checked: boolean) => {
    const current = watchedFloorAccess;
    if (checked) {
      setValue('floorAccess', [...current, floor].sort((a, b) => a - b));
    } else {
      setValue(
        'floorAccess',
        current.filter((f) => f !== floor),
      );
    }
  };

  const handleSelectAllFloors = () => {
    setValue('floorAccess', floors);
  };

  const handleClearAllFloors = () => {
    setValue('floorAccess', []);
  };

  const onSubmit = (data: EditCardForm) => {
    if (!card) return;

    updateCard.mutate(
      {
        id: card.id,
        data: {
          accessZones: data.accessZones,
          floorAccess: data.floorAccess,
          expiresAt: data.expiresAt || null,
          notes: data.notes || undefined,
        },
      },
      {
        onSuccess: () => {
          toast({
            title: 'Card updated',
            description: `Access card ${card.cardNumber} has been updated.`,
          });
          onOpenChange(false);
          onSuccess?.();
        },
        onError: (error: Error) => {
          toast({
            variant: 'destructive',
            title: 'Failed to update card',
            description: error.message || 'An error occurred',
          });
        },
      },
    );
  };

  if (!card) return null;

  const isBuildingCard = card.cardType === 'building';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Access Card</DialogTitle>
          <DialogDescription>
            Update zones and floor access for card{' '}
            <span className="font-medium">{card.cardNumber}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Card info badge */}
        <div className="flex gap-2">
          <Badge variant="outline">{getCardTypeLabel(card.cardType)}</Badge>
          <Badge variant="outline">{getStatusLabel(card.status)}</Badge>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Access zones (only for building cards) */}
          {isBuildingCard && (
            <div className="space-y-2">
              <Label>Access Zones *</Label>
              <div className="grid grid-cols-3 gap-2">
                {ALL_ZONES.map((zone) => (
                  <label
                    key={zone}
                    className="flex items-center gap-2 rounded border p-2 cursor-pointer hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={watchedAccessZones.includes(zone)}
                      onCheckedChange={(checked) =>
                        handleZoneToggle(zone, !!checked)
                      }
                    />
                    <span className="text-sm capitalize">{zone}</span>
                  </label>
                ))}
              </div>
              {errors.accessZones && (
                <p className="text-sm text-destructive">
                  {errors.accessZones.message}
                </p>
              )}
            </div>
          )}

          {/* Floor access (only for building cards with elevator) */}
          {isBuildingCard && watchedAccessZones.includes('elevator') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Floor Access</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleSelectAllFloors}
                  >
                    Select All
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAllFloors}
                  >
                    Clear
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-6 gap-1 max-h-[120px] overflow-y-auto border rounded p-2">
                {floors.map((floor) => (
                  <label
                    key={floor}
                    className="flex items-center justify-center gap-1 rounded p-1 cursor-pointer hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={watchedFloorAccess.includes(floor)}
                      onCheckedChange={(checked) =>
                        handleFloorToggle(floor, !!checked)
                      }
                    />
                    <span className="text-xs">{floor}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Expiry date */}
          <div className="space-y-2">
            <Label>Expiry Date</Label>
            <DatePicker
              value={watch('expiresAt') ? parseISO(watch('expiresAt')!) : undefined}
              onChange={(date) => setValue('expiresAt', date ? format(date, 'yyyy-MM-dd') : null)}
              placeholder="Select expiry date"
              fromDate={new Date()}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to remove expiry date
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes..."
              {...register('notes')}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateCard.isPending}>
              {updateCard.isPending && (
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
