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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/date-picker';
import { useToast } from '@/hooks/use-toast';
import {
  useIssueAccessCard,
  AccessCardType,
  getCardTypeLabel,
} from '@/hooks/use-access-cards';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const DEFAULT_ZONES = ['lobby', 'elevator'];
const ALL_ZONES = ['lobby', 'elevator', 'gym', 'pool', 'rooftop', 'laundry'];

const issueCardSchema = z.object({
  cardType: z.enum(['building', 'parking']),
  accessZones: z.array(z.string()).min(1, 'Select at least one zone'),
  floorAccess: z.array(z.number()).optional(),
  expiresAt: z.string().optional(),
  notes: z.string().max(500).optional(),
});

type IssueCardForm = z.infer<typeof issueCardSchema>;

interface IssueAccessCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apartmentId: string;
  buildingFloorCount: number;
  currentCardCount: number;
  cardLimit: number;
  onSuccess?: () => void;
}

export function IssueAccessCardDialog({
  open,
  onOpenChange,
  apartmentId,
  buildingFloorCount,
  currentCardCount,
  cardLimit,
  onSuccess,
}: IssueAccessCardDialogProps) {
  const { toast } = useToast();
  const issueCard = useIssueAccessCard();

  const isAtLimit = currentCardCount >= cardLimit;
  const floors = Array.from({ length: buildingFloorCount }, (_, i) => i + 1);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<IssueCardForm>({
    resolver: zodResolver(issueCardSchema),
    defaultValues: {
      cardType: 'building',
      accessZones: DEFAULT_ZONES,
      floorAccess: floors,
      expiresAt: '',
      notes: '',
    },
  });

  const watchedCardType = watch('cardType');
  const watchedAccessZones = watch('accessZones');
  const watchedFloorAccess = watch('floorAccess') ?? [];

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      reset({
        cardType: 'building',
        accessZones: DEFAULT_ZONES,
        floorAccess: floors,
        expiresAt: '',
        notes: '',
      });
    }
  }, [open, reset, floors.length]);

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

  const onSubmit = (data: IssueCardForm) => {
    // For parking cards, limit is not enforced
    if (data.cardType === 'building' && isAtLimit) {
      toast({
        variant: 'destructive',
        title: 'Card limit reached',
        description: `Deactivate an existing card to issue a new one (${currentCardCount}/${cardLimit})`,
      });
      return;
    }

    issueCard.mutate(
      {
        apartmentId,
        cardType: data.cardType as AccessCardType,
        accessZones: data.accessZones,
        floorAccess: data.floorAccess,
        expiresAt: data.expiresAt || undefined,
        notes: data.notes || undefined,
      },
      {
        onSuccess: () => {
          toast({
            title: 'Card issued',
            description: `Access card has been issued successfully.`,
          });
          onOpenChange(false);
          onSuccess?.();
        },
        onError: (error: Error) => {
          toast({
            variant: 'destructive',
            title: 'Failed to issue card',
            description: error.message || 'An error occurred',
          });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Issue Access Card</DialogTitle>
          <DialogDescription>
            Create a new access card for this apartment.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Limit warning */}
          {watchedCardType === 'building' && isAtLimit && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Building card limit reached ({currentCardCount}/{cardLimit}).
                Deactivate an existing card first.
              </AlertDescription>
            </Alert>
          )}

          {/* Card type */}
          <div className="space-y-2">
            <Label htmlFor="cardType">Card Type *</Label>
            <Select
              value={watchedCardType}
              onValueChange={(v) => setValue('cardType', v as AccessCardType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select card type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="building">Building (Lobby, Elevator)</SelectItem>
                <SelectItem value="parking">Parking (Lot Gates)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Access zones (only for building cards) */}
          {watchedCardType === 'building' && (
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
          {watchedCardType === 'building' &&
            watchedAccessZones.includes('elevator') && (
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
            <Label>Expiry Date (Optional)</Label>
            <DatePicker
              value={watch('expiresAt') ? parseISO(watch('expiresAt')!) : undefined}
              onChange={(date) => setValue('expiresAt', date ? format(date, 'yyyy-MM-dd') : '')}
              placeholder="Select expiry date"
              fromDate={new Date()}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
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
            <Button
              type="submit"
              disabled={
                issueCard.isPending ||
                (watchedCardType === 'building' && isAtLimit)
              }
            >
              {issueCard.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Issue Card
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
