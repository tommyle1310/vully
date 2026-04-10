'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Settings } from 'lucide-react';
import { 
  useBuildingPolicies, 
  useCurrentBuildingPolicy,
  useCreateBuildingPolicy,
  CreateBuildingPolicyInput,
} from '@/hooks/use-building-policies';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

import { PolicyFormDialog } from './policy-form-dialog';
import { PolicyCurrentDisplay } from './policy-current-display';
import { PolicyHistory } from './policy-history';

interface BuildingPoliciesTabProps {
  buildingId: string;
  readOnly?: boolean;
}

export function BuildingPoliciesTab({ buildingId, readOnly = false }: BuildingPoliciesTabProps) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [effectiveDate, setEffectiveDate] = useState<Date | undefined>(new Date());

  const { data: policiesData, isLoading: policiesLoading } = useBuildingPolicies(buildingId);
  const { data: currentPolicyData, isLoading: currentLoading } = useCurrentBuildingPolicy(buildingId);
  const createPolicy = useCreateBuildingPolicy(buildingId);

  const currentPolicy = currentPolicyData?.data;
  const allPolicies = policiesData?.data || [];
  const historicalPolicies = allPolicies.filter(p => p.id !== currentPolicy?.id);

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

  const [formInitialized, setFormInitialized] = useState(false);

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
          {!readOnly && (
            <PolicyFormDialog
              open={dialogOpen}
              onOpenChange={setDialogOpen}
              currentPolicy={currentPolicy}
              effectiveDate={effectiveDate}
              onEffectiveDateChange={setEffectiveDate}
              formData={formData}
              onFormDataChange={(update) => setFormData(prev => ({ ...prev, ...update }))}
              onSubmit={handleCreatePolicy}
              isSubmitting={createPolicy.isPending}
            />
          )}
        </CardHeader>
        <CardContent>
          <PolicyCurrentDisplay policy={currentPolicy} />
        </CardContent>
      </Card>

      <PolicyHistory policies={historicalPolicies} />
    </div>
  );
}
