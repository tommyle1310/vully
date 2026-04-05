'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Building,
  Bed,
  Bath,
  Square,
  Wrench,
  Pencil,
  Users,
  ExternalLink,
} from 'lucide-react';
import { Apartment, useUpdateApartmentStatus } from '@/hooks/use-apartments';
import { useContracts } from '@/hooks/use-contracts';
import { Badge, DotBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

import { statusActions, UNIT_TYPE_LABELS, getContractType } from './apartment-detail-helpers';
import { ApartmentDetailContract } from './apartment-detail-contract';
import { ApartmentDetailInfoSections } from './apartment-detail-info-sections';

interface ApartmentDetailSheetProps {
  apartment: Apartment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (apartments: Apartment) => void;
}

export function ApartmentDetailSheet({
  apartment,
  open,
  onOpenChange,
  onEdit,
}: ApartmentDetailSheetProps) {
  const { toast } = useToast();
  const updateStatus = useUpdateApartmentStatus();

  const { data: contractsData } = useContracts(
    apartment ? { apartmentId: apartment.id, status: 'active', limit: 1 } : {},
  );
  const activeContract = contractsData?.data?.[0];

  if (!apartment) return null;

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateStatus.mutateAsync({
        id: apartment.id,
        status: newStatus,
      });
      toast({
        title: 'Status updated',
        description: `Apartment ${apartment.unit_number} is now ${newStatus.toLowerCase()}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update apartment status',
        variant: 'destructive',
      });
    }
  };

  const actions = statusActions[apartment.status] || [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            {apartment.apartmentCode || `Unit ${apartment.unit_number}`}
             <DotBadge color={apartment.status === 'vacant' ? 'green' : apartment.status === 'occupied' ? 'blue' : apartment.status === 'maintenance' ? 'amber' : 'gray'} className="text-sm">
                {apartment.status.charAt(0).toUpperCase() + apartment.status.slice(1).toLowerCase()}
              </DotBadge>
          </SheetTitle>
          <SheetDescription>
            {apartment.building?.name || 'Building'} · Floor {apartment.floorLabel || apartment.floorIndex}
            {apartment.unitType && ` · ${UNIT_TYPE_LABELS[apartment.unitType] || apartment.unitType}`}
          </SheetDescription>
        </SheetHeader>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-6 space-y-4"
        >
          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/apartments/${apartment.id}`}>
                  <ExternalLink className="h-3.5 w-3.5 mr-1" />
                  View Details
                </Link>
              </Button>
             
              {apartment.isRented && activeContract && (
                <Badge variant="secondary" className="text-sm">
                  {(() => {
                    const contractType = getContractType(activeContract.termsNotes);
                    if (contractType === 'purchase') return 'Under Purchase';
                    if (contractType === 'lease_to_own') return 'Lease to Own';
                    return 'Rented';
                  })()}
                </Badge>
              )}
              {onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(apartment)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="flex items-center gap-3 p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <Square className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Gross Area</p>
                  <p className="text-base font-semibold">{apartment.grossArea ? `${apartment.grossArea} m²` : '-'}</p>
                </div>
              </CardContent>
            </Card>
            {apartment.netArea && (
              <Card>
                <CardContent className="flex items-center gap-3 p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <Square className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Net Area</p>
                    <p className="text-base font-semibold">{apartment.netArea} m²</p>
                  </div>
                </CardContent>
              </Card>
            )}
            <Card>
              <CardContent className="flex items-center gap-3 p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <Bed className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Bedrooms</p>
                  <p className="text-base font-semibold">{apartment.bedroomCount}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <Bath className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Bathrooms</p>
                  <p className="text-base font-semibold">{apartment.bathroomCount}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Residents</p>
                  <p className="text-base font-semibold">
                    {activeContract?.numberOfResidents ?? apartment.currentResidentCount}
                    {apartment.maxResidents ? ` / ${apartment.maxResidents}` : ''}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Active Contract */}
          {activeContract && <ApartmentDetailContract contract={activeContract} />}

          {/* All info sections */}
          <ApartmentDetailInfoSections apartment={apartment} />

          {/* Actions */}
          <div className="space-y-3 pt-4 border-t">
            <h3 className="text-sm font-medium">Quick Actions</h3>
            <div className="flex flex-wrap gap-2">
              {actions.map((action) => (
                <Button
                  key={action.newStatus}
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange(action.newStatus)}
                  disabled={updateStatus.isPending}
                >
                  {action.newStatus === 'MAINTENANCE' && (
                    <Wrench className="h-4 w-4 mr-2" />
                  )}
                  {action.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Metadata */}
          <div className="text-xs text-muted-foreground pt-4 border-t space-y-1">
            <p>Created: {new Date(apartment.created_at).toLocaleDateString()}</p>
            <p>Updated: {new Date(apartment.updatedAt).toLocaleDateString()}</p>
          </div>
        </motion.div>
      </SheetContent>
    </Sheet>
  );
}
