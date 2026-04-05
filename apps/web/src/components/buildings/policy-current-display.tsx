'use client';

import { 
  PawPrint, 
  CreditCard, 
  Trash2,
  Settings, 
} from 'lucide-react';
import { BuildingPolicy } from '@/hooks/use-building-policies';

interface PolicyCurrentDisplayProps {
  policy: BuildingPolicy | undefined;
}

export function PolicyCurrentDisplay({ policy }: PolicyCurrentDisplayProps) {
  if (!policy) {
    return (
      <div className="text-center py-8">
        <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="font-medium mb-2">No Policy Configured</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Create a building policy to set default rules for apartments
        </p>
      </div>
    );
  }

  return (
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
              {policy.defaultMaxResidents ?? 'Auto (by area)'}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Access Cards</dt>
            <dd className="font-medium">{policy.accessCardLimitDefault}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Pets</dt>
            <dd className="font-medium">
              {policy.petAllowed 
                ? `Allowed (max ${policy.petLimitDefault})` 
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
            <dd className="font-medium capitalize">{policy.defaultBillingCycle}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Late Fee</dt>
            <dd className="font-medium">
              {policy.lateFeeRatePercent
                ? `${policy.lateFeeRatePercent}%`
                : 'None'
              }
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Grace Period</dt>
            <dd className="font-medium">{policy.lateFeeGraceDays} days</dd>
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
              {policy.trashCollectionDays?.length 
                ? policy.trashCollectionDays.map(d => d.slice(0, 3)).join(', ')
                : 'Not set'
              }
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Time</dt>
            <dd className="font-medium">
              {policy.trashCollectionTime || 'Not set'}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Monthly Fee</dt>
            <dd className="font-medium">
              {policy.trashFeePerMonth 
                ? `${policy.trashFeePerMonth.toLocaleString()}₫`
                : 'Free'
              }
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
