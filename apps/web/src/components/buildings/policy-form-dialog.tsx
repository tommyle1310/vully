'use client';

import { format } from 'date-fns';
import { 
  PawPrint, 
  CreditCard, 
  Trash2,
  Plus,
  CalendarIcon,
  Users,
  Dumbbell,
  Waves,
  Trophy,
  Clock,
  Phone,
  Package,
  Hammer,
  Building2,
  Key,
  Car,
} from 'lucide-react';
import { CreateBuildingPolicyInput, BuildingPolicy } from '@/hooks/use-building-policies';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
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

function SectionIcon({ icon: Icon }: { icon: React.ElementType }) {
  return (
    <div className="rounded-md bg-primary/10 p-1.5">
      <Icon className="h-4 w-4 text-primary" />
    </div>
  );
}

function FormField({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
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
      <DialogContent className="max-w-3xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>Create New Building Policy</DialogTitle>
          <DialogDescription>
            {currentPolicy 
              ? 'This will create a new policy version. The current policy will remain active until the new effective date.'
              : 'Configure default policies for apartments in this building.'
            }
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-180px)] px-6">
          <div className="space-y-4 pb-4">
            {/* Effective Date */}
            <div className="rounded-lg border bg-muted/30 p-4">
              <FormField label="Effective From" hint="Policy takes effect on this date">
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
              </FormField>
            </div>

            <Accordion type="multiple" defaultValue={['occupancy', 'billing']} className="space-y-2">
              {/* Occupancy Rules */}
              <AccordionItem value="occupancy" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-3">
                    <SectionIcon icon={Users} />
                    <span className="font-medium">Occupancy & Pets</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField label="Default Max Residents" hint="Leave empty to calculate by area (25m²/person)">
                      <Input
                        type="number"
                        placeholder="Auto-calculate"
                        value={formData.defaultMaxResidents ?? ''}
                        onChange={(e) => onFormDataChange({
                          defaultMaxResidents: e.target.value ? Number(e.target.value) : undefined,
                        })}
                      />
                    </FormField>
                    <FormField label="Access Card Limit">
                      <Input
                        type="number"
                        value={formData.accessCardLimitDefault ?? 4}
                        onChange={(e) => onFormDataChange({
                          accessCardLimitDefault: Number(e.target.value),
                        })}
                      />
                    </FormField>
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <PawPrint className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <Label>Pets Allowed</Label>
                          <p className="text-xs text-muted-foreground">Allow residents to keep pets</p>
                        </div>
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
                      <div className="grid gap-4 sm:grid-cols-2 pl-7">
                        <FormField label="Pet Limit per Apartment">
                          <Input
                            type="number"
                            value={formData.petLimitDefault ?? 2}
                            onChange={(e) => onFormDataChange({
                              petLimitDefault: Number(e.target.value),
                            })}
                          />
                        </FormField>
                        <div className="sm:col-span-2">
                          <FormField label="Pet Rules" hint="Detailed rules for keeping pets">
                            <Textarea
                              placeholder="e.g., Dogs must be leashed in common areas..."
                              value={formData.petRules ?? ''}
                              onChange={(e) => onFormDataChange({ petRules: e.target.value })}
                            />
                          </FormField>
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Billing Configuration */}
              <AccordionItem value="billing" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-3">
                    <SectionIcon icon={CreditCard} />
                    <span className="font-medium">Billing & Fees</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField label="Billing Cycle">
                      <Select
                        value={formData.defaultBillingCycle ?? 'monthly'}
                        onValueChange={(value) => onFormDataChange({
                          defaultBillingCycle: value as 'monthly' | 'quarterly' | 'yearly',
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="Payment Due Day" hint="Day of month (1-28)">
                      <Input
                        type="number"
                        min={1}
                        max={28}
                        value={formData.paymentDueDay ?? 10}
                        onChange={(e) => onFormDataChange({
                          paymentDueDay: Number(e.target.value),
                        })}
                      />
                    </FormField>
                    <FormField label="Late Fee Rate (%)" hint="Percentage of overdue amount">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="e.g., 5"
                        value={formData.lateFeeRatePercent ?? ''}
                        onChange={(e) => onFormDataChange({
                          lateFeeRatePercent: e.target.value ? Number(e.target.value) : undefined,
                        })}
                      />
                    </FormField>
                    <FormField label="Late Fee Grace Days">
                      <Input
                        type="number"
                        value={formData.lateFeeGraceDays ?? 7}
                        onChange={(e) => onFormDataChange({
                          lateFeeGraceDays: Number(e.target.value),
                        })}
                      />
                    </FormField>
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField label="Car Parking Fee (VND/month)">
                      <Input
                        type="number"
                        placeholder="e.g., 1200000"
                        value={formData.carParkingFee ?? ''}
                        onChange={(e) => onFormDataChange({
                          carParkingFee: e.target.value ? Number(e.target.value) : undefined,
                        })}
                      />
                    </FormField>
                    <FormField label="Motorcycle Parking Fee (VND/month)">
                      <Input
                        type="number"
                        placeholder="e.g., 100000"
                        value={formData.motorcycleParkingFee ?? ''}
                        onChange={(e) => onFormDataChange({
                          motorcycleParkingFee: e.target.value ? Number(e.target.value) : undefined,
                        })}
                      />
                    </FormField>
                    <FormField label="Access Card Replacement Fee (VND)">
                      <Input
                        type="number"
                        placeholder="e.g., 200000"
                        value={formData.accessCardReplacementFee ?? ''}
                        onChange={(e) => onFormDataChange({
                          accessCardReplacementFee: e.target.value ? Number(e.target.value) : undefined,
                        })}
                      />
                    </FormField>
                    <FormField label="Access Card Replacement Process">
                      <Input
                        placeholder="e.g., Submit request at reception"
                        value={formData.accessCardReplacementProcess ?? ''}
                        onChange={(e) => onFormDataChange({
                          accessCardReplacementProcess: e.target.value,
                        })}
                      />
                    </FormField>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Amenities */}
              <AccordionItem value="amenities" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-3">
                    <SectionIcon icon={Dumbbell} />
                    <span className="font-medium">Amenities</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4 space-y-6">
                  {/* Pool */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Waves className="h-4 w-4 text-muted-foreground" />
                        <Label>Swimming Pool</Label>
                      </div>
                      <Switch
                        checked={formData.poolAvailable ?? false}
                        onCheckedChange={(checked) => onFormDataChange({ poolAvailable: checked })}
                      />
                    </div>
                    {formData.poolAvailable && (
                      <div className="grid gap-4 sm:grid-cols-2 pl-7">
                        <FormField label="Operating Hours">
                          <Input
                            placeholder="e.g., 06:00-22:00"
                            value={formData.poolHours ?? ''}
                            onChange={(e) => onFormDataChange({ poolHours: e.target.value })}
                          />
                        </FormField>
                        <FormField label="Monthly Fee (VND)" hint="Leave empty if free">
                          <Input
                            type="number"
                            placeholder="Free"
                            value={formData.poolFeePerMonth ?? ''}
                            onChange={(e) => onFormDataChange({
                              poolFeePerMonth: e.target.value ? Number(e.target.value) : undefined,
                            })}
                          />
                        </FormField>
                      </div>
                    )}
                  </div>
                  
                  {/* Gym */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Dumbbell className="h-4 w-4 text-muted-foreground" />
                        <Label>Fitness Center</Label>
                      </div>
                      <Switch
                        checked={formData.gymAvailable ?? false}
                        onCheckedChange={(checked) => onFormDataChange({ gymAvailable: checked })}
                      />
                    </div>
                    {formData.gymAvailable && (
                      <div className="grid gap-4 sm:grid-cols-2 pl-7">
                        <FormField label="Operating Hours">
                          <Input
                            placeholder="e.g., 05:00-23:00"
                            value={formData.gymHours ?? ''}
                            onChange={(e) => onFormDataChange({ gymHours: e.target.value })}
                          />
                        </FormField>
                        <FormField label="Monthly Fee (VND)">
                          <Input
                            type="number"
                            placeholder="Free"
                            value={formData.gymFeePerMonth ?? ''}
                            onChange={(e) => onFormDataChange({
                              gymFeePerMonth: e.target.value ? Number(e.target.value) : undefined,
                            })}
                          />
                        </FormField>
                        <div className="sm:col-span-2 flex items-center gap-3">
                          <Switch
                            checked={formData.gymBookingRequired ?? false}
                            onCheckedChange={(checked) => onFormDataChange({ gymBookingRequired: checked })}
                          />
                          <Label>Booking Required</Label>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Sports Courts */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Trophy className="h-4 w-4 text-muted-foreground" />
                        <Label>Sports Courts</Label>
                      </div>
                      <Switch
                        checked={formData.sportsCourtAvailable ?? false}
                        onCheckedChange={(checked) => onFormDataChange({ sportsCourtAvailable: checked })}
                      />
                    </div>
                    {formData.sportsCourtAvailable && (
                      <div className="grid gap-4 sm:grid-cols-2 pl-7">
                        <FormField label="Operating Hours">
                          <Input
                            placeholder="e.g., 06:00-21:00"
                            value={formData.sportsCourtHours ?? ''}
                            onChange={(e) => onFormDataChange({ sportsCourtHours: e.target.value })}
                          />
                        </FormField>
                        <div className="sm:col-span-2">
                          <FormField label="Booking Rules">
                            <Textarea
                              placeholder="e.g., Book via app, max 2 hours per day..."
                              value={formData.sportsCourtBookingRules ?? ''}
                              onChange={(e) => onFormDataChange({ sportsCourtBookingRules: e.target.value })}
                            />
                          </FormField>
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Rules & Hours */}
              <AccordionItem value="rules" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-3">
                    <SectionIcon icon={Clock} />
                    <span className="font-medium">Rules & Hours</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4 space-y-6">
                  {/* Quiet Hours */}
                  <div className="space-y-4">
                    <Label className="flex items-center gap-2">
                      <Clock className="h-4 w-4" /> Quiet Hours
                    </Label>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField label="Start Time">
                        <Input
                          placeholder="e.g., 22:00"
                          value={formData.quietHoursStart ?? ''}
                          onChange={(e) => onFormDataChange({ quietHoursStart: e.target.value })}
                        />
                      </FormField>
                      <FormField label="End Time">
                        <Input
                          placeholder="e.g., 07:00"
                          value={formData.quietHoursEnd ?? ''}
                          onChange={(e) => onFormDataChange({ quietHoursEnd: e.target.value })}
                        />
                      </FormField>
                    </div>
                    <FormField label="Noise Complaint Process">
                      <Textarea
                        placeholder="Steps to report noise complaints..."
                        value={formData.noiseComplaintProcess ?? ''}
                        onChange={(e) => onFormDataChange({ noiseComplaintProcess: e.target.value })}
                      />
                    </FormField>
                  </div>
                  
                  <Separator />
                  
                  {/* Guest & Visitor */}
                  <div className="space-y-4">
                    <Label className="flex items-center gap-2">
                      <Users className="h-4 w-4" /> Guest & Visitor Rules
                    </Label>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={formData.guestRegistrationRequired ?? true}
                        onCheckedChange={(checked) => onFormDataChange({ guestRegistrationRequired: checked })}
                      />
                      <Label>Guest Registration Required</Label>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField label="Visitor Hours">
                        <Input
                          placeholder="e.g., 08:00-22:00"
                          value={formData.visitorHours ?? ''}
                          onChange={(e) => onFormDataChange({ visitorHours: e.target.value })}
                        />
                      </FormField>
                      <FormField label="Guest Parking Rules">
                        <Input
                          placeholder="e.g., Register at security booth"
                          value={formData.guestParkingRules ?? ''}
                          onChange={(e) => onFormDataChange({ guestParkingRules: e.target.value })}
                        />
                      </FormField>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Renovation */}
                  <div className="space-y-4">
                    <Label className="flex items-center gap-2">
                      <Hammer className="h-4 w-4" /> Renovation Rules
                    </Label>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={formData.renovationApprovalRequired ?? true}
                        onCheckedChange={(checked) => onFormDataChange({ renovationApprovalRequired: checked })}
                      />
                      <Label>Approval Required</Label>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField label="Allowed Hours">
                        <Input
                          placeholder="e.g., 08:00-17:00 Mon-Sat"
                          value={formData.renovationAllowedHours ?? ''}
                          onChange={(e) => onFormDataChange({ renovationAllowedHours: e.target.value })}
                        />
                      </FormField>
                      <FormField label="Deposit (VND)">
                        <Input
                          type="number"
                          placeholder="e.g., 10000000"
                          value={formData.renovationDeposit ?? ''}
                          onChange={(e) => onFormDataChange({
                            renovationDeposit: e.target.value ? Number(e.target.value) : undefined,
                          })}
                        />
                      </FormField>
                    </div>
                    <FormField label="Approval Process">
                      <Textarea
                        placeholder="Steps to get renovation approval..."
                        value={formData.renovationApprovalProcess ?? ''}
                        onChange={(e) => onFormDataChange({ renovationApprovalProcess: e.target.value })}
                      />
                    </FormField>
                  </div>
                  
                  <Separator />
                  
                  {/* Move In/Out */}
                  <div className="space-y-4">
                    <Label className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" /> Move In/Out
                    </Label>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField label="Allowed Hours">
                        <Input
                          placeholder="e.g., 08:00-18:00"
                          value={formData.moveAllowedHours ?? ''}
                          onChange={(e) => onFormDataChange({ moveAllowedHours: e.target.value })}
                        />
                      </FormField>
                      <FormField label="Moving Deposit (VND)">
                        <Input
                          type="number"
                          placeholder="e.g., 5000000"
                          value={formData.moveDeposit ?? ''}
                          onChange={(e) => onFormDataChange({
                            moveDeposit: e.target.value ? Number(e.target.value) : undefined,
                          })}
                        />
                      </FormField>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={formData.moveElevatorBookingRequired ?? true}
                        onCheckedChange={(checked) => onFormDataChange({ moveElevatorBookingRequired: checked })}
                      />
                      <Label>Elevator Booking Required</Label>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Trash Collection */}
              <AccordionItem value="trash" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-3">
                    <SectionIcon icon={Trash2} />
                    <span className="font-medium">Trash Collection</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <div className="space-y-4">
                    <FormField label="Collection Days">
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
                    </FormField>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField label="Collection Time Window">
                        <Input
                          placeholder="e.g., 07:00-09:00"
                          value={formData.trashCollectionTime ?? ''}
                          onChange={(e) => onFormDataChange({ trashCollectionTime: e.target.value })}
                        />
                      </FormField>
                      <FormField label="Monthly Fee (VND)">
                        <Input
                          type="number"
                          placeholder="e.g., 50000"
                          value={formData.trashFeePerMonth ?? ''}
                          onChange={(e) => onFormDataChange({
                            trashFeePerMonth: e.target.value ? Number(e.target.value) : undefined,
                          })}
                        />
                      </FormField>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Package & Contacts */}
              <AccordionItem value="package-contacts" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-3">
                    <SectionIcon icon={Package} />
                    <span className="font-medium">Package & Emergency</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4 space-y-6">
                  {/* Package */}
                  <div className="space-y-4">
                    <Label className="flex items-center gap-2">
                      <Package className="h-4 w-4" /> Package Delivery
                    </Label>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField label="Pickup Location">
                        <Input
                          placeholder="e.g., Reception desk, Building A"
                          value={formData.packagePickupLocation ?? ''}
                          onChange={(e) => onFormDataChange({ packagePickupLocation: e.target.value })}
                        />
                      </FormField>
                      <FormField label="Pickup Hours">
                        <Input
                          placeholder="e.g., 08:00-20:00"
                          value={formData.packagePickupHours ?? ''}
                          onChange={(e) => onFormDataChange({ packagePickupHours: e.target.value })}
                        />
                      </FormField>
                      <FormField label="Holding Days" hint="Days before return to sender">
                        <Input
                          type="number"
                          value={formData.packageHoldingDays ?? 7}
                          onChange={(e) => onFormDataChange({
                            packageHoldingDays: Number(e.target.value),
                          })}
                        />
                      </FormField>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Emergency Contacts */}
                  <div className="space-y-4">
                    <Label className="flex items-center gap-2">
                      <Phone className="h-4 w-4" /> Emergency Contacts
                    </Label>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField label="Management Office Hours">
                        <Input
                          placeholder="e.g., 08:00-17:00 Mon-Fri"
                          value={formData.managementOfficeHours ?? ''}
                          onChange={(e) => onFormDataChange({ managementOfficeHours: e.target.value })}
                        />
                      </FormField>
                      <FormField label="24h Security Phone">
                        <Input
                          placeholder="e.g., 0901234567"
                          value={formData.security24hPhone ?? ''}
                          onChange={(e) => onFormDataChange({ security24hPhone: e.target.value })}
                        />
                      </FormField>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting || !effectiveDate}>
            {isSubmitting ? 'Creating...' : 'Create Policy'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
