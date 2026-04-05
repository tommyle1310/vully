'use client';

import { format } from 'date-fns';
import { 
  PawPrint, 
  CreditCard, 
  Trash2,
  Plus,
  CalendarIcon,
} from 'lucide-react';
import { CreateBuildingPolicyInput, BuildingPolicy } from '@/hooks/use-building-policies';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const DAYS_OF_WEEK = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
] as const;

interface PolicyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPolicy: BuildingPolicy | undefined;
  effectiveDate: Date | undefined;
  onEffectiveDateChange: (date: Date | undefined) => void;
  formData: Partial<CreateBuildingPolicyInput>;
  onFormDataChange: (update: Partial<CreateBuildingPolicyInput>) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export function PolicyFormDialog({
  open,
  onOpenChange,
  currentPolicy,
  effectiveDate,
  onEffectiveDateChange,
  formData,
  onFormDataChange,
  onSubmit,
  isSubmitting,
}: PolicyFormDialogProps) {
  const toggleTrashDay = (day: string) => {
    onFormDataChange({
      trashCollectionDays: formData.trashCollectionDays?.includes(day)
        ? formData.trashCollectionDays.filter(d => d !== day)
        : [...(formData.trashCollectionDays || []), day],
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          {currentPolicy ? 'Create New Policy' : 'Create Policy'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Building Policy</DialogTitle>
          <DialogDescription>
            {currentPolicy 
              ? 'This will create a new policy version. The current policy will remain in effect until the new effective date.'
              : 'Configure default policies for apartments in this building.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Effective Date */}
          <div className="space-y-2">
            <Label>Effective From</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !effectiveDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {effectiveDate ? format(effectiveDate, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={effectiveDate}
                  onSelect={onEffectiveDateChange}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Occupancy Rules */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <PawPrint className="h-4 w-4" />
              Occupancy Rules
            </h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="maxResidents">Default Max Residents</Label>
                <Input
                  id="maxResidents"
                  type="number"
                  placeholder="Auto-calculate by area"
                  value={formData.defaultMaxResidents ?? ''}
                  onChange={(e) => onFormDataChange({
                    defaultMaxResidents: e.target.value ? Number(e.target.value) : undefined,
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accessCards">Access Card Limit</Label>
                <Input
                  id="accessCards"
                  type="number"
                  value={formData.accessCardLimitDefault ?? 4}
                  onChange={(e) => onFormDataChange({
                    accessCardLimitDefault: Number(e.target.value),
                  })}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Pets Allowed</Label>
                <p className="text-sm text-muted-foreground">
                  Allow residents to keep pets
                </p>
              </div>
              <Switch
                checked={formData.petAllowed}
                onCheckedChange={(checked) => onFormDataChange({
                  petAllowed: checked,
                  petLimitDefault: checked ? formData.petLimitDefault || 2 : 0,
                })}
              />
            </div>
            {formData.petAllowed && (
              <div className="space-y-2">
                <Label htmlFor="petLimit">Pet Limit per Apartment</Label>
                <Input
                  id="petLimit"
                  type="number"
                  value={formData.petLimitDefault ?? 0}
                  onChange={(e) => onFormDataChange({
                    petLimitDefault: Number(e.target.value),
                  })}
                />
              </div>
            )}
          </div>

          {/* Billing Configuration */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Billing Configuration
            </h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Default Billing Cycle</Label>
                <Select
                  value={formData.defaultBillingCycle}
                  onValueChange={(value) => onFormDataChange({
                    defaultBillingCycle: value as 'monthly' | 'quarterly' | 'yearly',
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select cycle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lateFeeRate">Late Fee Rate (%)</Label>
                <Input
                  id="lateFeeRate"
                  type="number"
                  step="0.01"
                  placeholder="e.g., 5"
                  value={formData.lateFeeRatePercent ?? ''}
                  onChange={(e) => onFormDataChange({
                    lateFeeRatePercent: e.target.value ? Number(e.target.value) : undefined,
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="graceDays">Late Fee Grace Days</Label>
                <Input
                  id="graceDays"
                  type="number"
                  value={formData.lateFeeGraceDays ?? 7}
                  onChange={(e) => onFormDataChange({
                    lateFeeGraceDays: Number(e.target.value),
                  })}
                />
              </div>
            </div>
          </div>

          {/* Trash Collection */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              Trash Collection
            </h4>
            <div className="space-y-3">
              <Label>Collection Days</Label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <Button
                    key={day}
                    type="button"
                    variant={formData.trashCollectionDays?.includes(day) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleTrashDay(day)}
                  >
                    {day.charAt(0).toUpperCase() + day.slice(1, 3)}
                  </Button>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="trashTime">Collection Time Window</Label>
                <Input
                  id="trashTime"
                  placeholder="e.g., 07:00-09:00"
                  value={formData.trashCollectionTime ?? ''}
                  onChange={(e) => onFormDataChange({
                    trashCollectionTime: e.target.value,
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="trashFee">Monthly Fee (VND)</Label>
                <Input
                  id="trashFee"
                  type="number"
                  placeholder="e.g., 50000"
                  value={formData.trashFeePerMonth ?? ''}
                  onChange={(e) => onFormDataChange({
                    trashFeePerMonth: e.target.value ? Number(e.target.value) : undefined,
                  })}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Policy'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
