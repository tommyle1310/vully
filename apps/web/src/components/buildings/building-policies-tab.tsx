'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { 
  Settings, 
  PawPrint, 
  CreditCard, 
  Trash2,
  Calendar,
  Plus,
  ChevronDown,
  ChevronRight,
  Clock,
  Check,
  CalendarIcon,
} from 'lucide-react';
import { 
  useBuildingPolicies, 
  useCurrentBuildingPolicy,
  useCreateBuildingPolicy,
  BuildingPolicy,
  CreateBuildingPolicyInput,
} from '@/hooks/use-building-policies';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface BuildingPoliciesTabProps {
  buildingId: string;
}

const DAYS_OF_WEEK = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
] as const;

export function BuildingPoliciesTab({ buildingId }: BuildingPoliciesTabProps) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [effectiveDate, setEffectiveDate] = useState<Date | undefined>(new Date());

  // Fetch data
  const { data: policiesData, isLoading: policiesLoading } = useBuildingPolicies(buildingId);
  const { data: currentPolicyData, isLoading: currentLoading } = useCurrentBuildingPolicy(buildingId);

  const createPolicy = useCreateBuildingPolicy(buildingId);

  const currentPolicy = currentPolicyData?.data;
  const allPolicies = policiesData?.data || [];
  const historicalPolicies = allPolicies.filter(p => !p.isCurrent);

  // Form state
  const [formData, setFormData] = useState<Partial<CreateBuildingPolicyInput>>({
    defaultMaxResidents: currentPolicy?.defaultMaxResidents ?? undefined,
    accessCardLimitDefault: currentPolicy?.accessCardLimitDefault ?? 4,
    petAllowed: currentPolicy?.petAllowed ?? false,
    petLimitDefault: currentPolicy?.petLimitDefault ?? 0,
    defaultBillingCycle: currentPolicy?.defaultBillingCycle ?? 'monthly',
    lateFeeRatePercent: currentPolicy?.lateFeeRatePercent ?? undefined,
    lateFeeGraceDays: currentPolicy?.lateFeeGraceDays ?? 7,
    trashCollectionDays: currentPolicy?.trashCollectionDays ?? [],
    trashCollectionTime: currentPolicy?.trashCollectionTime ?? '',
    trashFeePerMonth: currentPolicy?.trashFeePerMonth ?? undefined,
  });

  // Track if form has been initialized with current policy
  const [formInitialized, setFormInitialized] = useState(false);

  // Update form when current policy loads (using useEffect to avoid infinite loop)
  useEffect(() => {
    if (currentPolicy && !formInitialized) {
      setFormData({
        defaultMaxResidents: currentPolicy.defaultMaxResidents ?? undefined,
        accessCardLimitDefault: currentPolicy.accessCardLimitDefault,
        petAllowed: currentPolicy.petAllowed,
        petLimitDefault: currentPolicy.petLimitDefault,
        defaultBillingCycle: currentPolicy.defaultBillingCycle,
        lateFeeRatePercent: currentPolicy.lateFeeRatePercent ?? undefined,
        lateFeeGraceDays: currentPolicy.lateFeeGraceDays,
        trashCollectionDays: currentPolicy.trashCollectionDays ?? [],
        trashCollectionTime: currentPolicy.trashCollectionTime ?? '',
        trashFeePerMonth: currentPolicy.trashFeePerMonth ?? undefined,
      });
      setFormInitialized(true);
    }
  }, [currentPolicy, formInitialized]);

  const handleCreatePolicy = async () => {
    if (!effectiveDate) {
      toast({
        title: 'Error',
        description: 'Please select an effective date',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createPolicy.mutateAsync({
        ...formData,
        effectiveFrom: format(effectiveDate, 'yyyy-MM-dd'),
      } as CreateBuildingPolicyInput);

      toast({
        title: 'Policy Created',
        description: 'New building policy has been created successfully',
      });
      setDialogOpen(false);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Failed to create policy';
      toast({
        title: 'Error',
        description: errMsg,
        variant: 'destructive',
      });
    }
  };

  const toggleTrashDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      trashCollectionDays: prev.trashCollectionDays?.includes(day)
        ? prev.trashCollectionDays.filter(d => d !== day)
        : [...(prev.trashCollectionDays || []), day],
    }));
  };

  if (policiesLoading || currentLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Policy Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Current Building Policy
            </CardTitle>
            <CardDescription>
              {currentPolicy 
                ? `Effective since ${format(new Date(currentPolicy.effectiveFrom), 'MMM d, yyyy')}`
                : 'No policy configured yet'
              }
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
                        onSelect={setEffectiveDate}
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
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          defaultMaxResidents: e.target.value ? Number(e.target.value) : undefined,
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="accessCards">Access Card Limit</Label>
                      <Input
                        id="accessCards"
                        type="number"
                        value={formData.accessCardLimitDefault ?? 4}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          accessCardLimitDefault: Number(e.target.value),
                        }))}
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
                      onCheckedChange={(checked) => setFormData(prev => ({
                        ...prev,
                        petAllowed: checked,
                        petLimitDefault: checked ? prev.petLimitDefault || 2 : 0,
                      }))}
                    />
                  </div>
                  {formData.petAllowed && (
                    <div className="space-y-2">
                      <Label htmlFor="petLimit">Pet Limit per Apartment</Label>
                      <Input
                        id="petLimit"
                        type="number"
                        value={formData.petLimitDefault ?? 0}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          petLimitDefault: Number(e.target.value),
                        }))}
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
                        onValueChange={(value) => setFormData(prev => ({
                          ...prev,
                          defaultBillingCycle: value as 'monthly' | 'quarterly' | 'yearly',
                        }))}
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
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          lateFeeRatePercent: e.target.value ? Number(e.target.value) : undefined,
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="graceDays">Late Fee Grace Days</Label>
                      <Input
                        id="graceDays"
                        type="number"
                        value={formData.lateFeeGraceDays ?? 7}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          lateFeeGraceDays: Number(e.target.value),
                        }))}
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
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          trashCollectionTime: e.target.value,
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="trashFee">Monthly Fee (VND)</Label>
                      <Input
                        id="trashFee"
                        type="number"
                        placeholder="e.g., 50000"
                        value={formData.trashFeePerMonth ?? ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          trashFeePerMonth: e.target.value ? Number(e.target.value) : undefined,
                        }))}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreatePolicy} disabled={createPolicy.isPending}>
                  {createPolicy.isPending ? 'Creating...' : 'Create Policy'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>

        <CardContent>
          {currentPolicy ? (
            <div className="grid gap-6 md:grid-cols-3">
              {/* Occupancy Rules */}
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2 text-sm">
                  <PawPrint className="h-4 w-4" />
                  Occupancy Rules
                </h4>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Max Residents</dt>
                    <dd className="font-medium">
                      {currentPolicy.defaultMaxResidents ?? 'Auto (by area)'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Access Cards</dt>
                    <dd className="font-medium">{currentPolicy.accessCardLimitDefault}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Pets</dt>
                    <dd className="font-medium">
                      {currentPolicy.petAllowed 
                        ? `Allowed (max ${currentPolicy.petLimitDefault})` 
                        : 'Not allowed'
                      }
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Billing Config */}
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2 text-sm">
                  <CreditCard className="h-4 w-4" />
                  Billing
                </h4>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Billing Cycle</dt>
                    <dd className="font-medium capitalize">{currentPolicy.defaultBillingCycle}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Late Fee</dt>
                    <dd className="font-medium">
                      {currentPolicy.lateFeeRatePercent
                        ? `${currentPolicy.lateFeeRatePercent}%`
                        : 'None'
                      }
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Grace Period</dt>
                    <dd className="font-medium">{currentPolicy.lateFeeGraceDays} days</dd>
                  </div>
                </dl>
              </div>

              {/* Trash Collection */}
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2 text-sm">
                  <Trash2 className="h-4 w-4" />
                  Trash Collection
                </h4>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Days</dt>
                    <dd className="font-medium">
                      {currentPolicy.trashCollectionDays?.length 
                        ? currentPolicy.trashCollectionDays.map(d => d.slice(0, 3)).join(', ')
                        : 'Not set'
                      }
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Time</dt>
                    <dd className="font-medium">
                      {currentPolicy.trashCollectionTime || 'Not set'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Monthly Fee</dt>
                    <dd className="font-medium">
                      {currentPolicy.trashFeePerMonth 
                        ? `${currentPolicy.trashFeePerMonth.toLocaleString()}₫`
                        : 'Free'
                      }
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">No Policy Configured</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create a building policy to set default rules for apartments
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Policy History */}
      {historicalPolicies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5" />
              Policy History
            </CardTitle>
            <CardDescription>
              Previous policy versions for audit and compliance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {historicalPolicies.map((policy, index) => (
                <AccordionItem key={policy.id} value={policy.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">
                        v{historicalPolicies.length - index}
                      </Badge>
                      <span>
                        {format(new Date(policy.effectiveFrom), 'MMM d, yyyy')}
                        {' - '}
                        {policy.effectiveTo 
                          ? format(new Date(policy.effectiveTo), 'MMM d, yyyy')
                          : 'Present'
                        }
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid gap-4 md:grid-cols-3 pt-4 text-sm">
                      <div>
                        <p className="text-muted-foreground mb-1">Occupancy</p>
                        <p>Max: {policy.defaultMaxResidents ?? 'Auto'}</p>
                        <p>Cards: {policy.accessCardLimitDefault}</p>
                        <p>Pets: {policy.petAllowed ? `Yes (${policy.petLimitDefault})` : 'No'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Billing</p>
                        <p className="capitalize">Cycle: {policy.defaultBillingCycle}</p>
                        <p>Late fee: {policy.lateFeeRatePercent ?? 0}%</p>
                        <p>Grace: {policy.lateFeeGraceDays} days</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Trash</p>
                        <p>Days: {policy.trashCollectionDays?.join(', ') || 'None'}</p>
                        <p>Fee: {policy.trashFeePerMonth?.toLocaleString() ?? 0}₫</p>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
