'use client';

import { format } from 'date-fns';
import { Clock } from 'lucide-react';
import { BuildingPolicy } from '@/hooks/use-building-policies';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface PolicyHistoryProps {
  policies: BuildingPolicy[];
}

export function PolicyHistory({ policies }: PolicyHistoryProps) {
  return (
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
        {policies.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No previous policy versions yet.
          </p>
        ) : (
        <Accordion type="single" collapsible className="w-full">
          {policies.map((policy, index) => (
            <AccordionItem key={policy.id} value={policy.id}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">
                    v{policies.length - index}
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
        )}
      </CardContent>
    </Card>
  );
}
