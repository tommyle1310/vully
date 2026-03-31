'use client';

import { motion } from 'framer-motion';
import { Building, Bed, Bath, Square, Wrench, Pencil } from 'lucide-react';
import { Apartment, useUpdateApartmentStatus } from '@/hooks/use-apartments';
import { Badge } from '@/components/ui/badge';
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

interface ApartmentDetailSheetProps {
  apartment: Apartment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (apartment: Apartment) => void;
}

const statusVariants: Record<string, 'default' | 'success' | 'warning' | 'destructive'> = {
  VACANT: 'success',
  OCCUPIED: 'default',
  MAINTENANCE: 'warning',
};

const statusActions: Record<string, { label: string; newStatus: string }[]> = {
  VACANT: [
    { label: 'Mark as Occupied', newStatus: 'OCCUPIED' },
    { label: 'Set Maintenance', newStatus: 'MAINTENANCE' },
  ],
  OCCUPIED: [
    { label: 'Mark as Vacant', newStatus: 'VACANT' },
    { label: 'Set Maintenance', newStatus: 'MAINTENANCE' },
  ],
  MAINTENANCE: [
    { label: 'Mark as Vacant', newStatus: 'VACANT' },
    { label: 'Mark as Occupied', newStatus: 'OCCUPIED' },
  ],
};

export function ApartmentDetailSheet({
  apartment,
  open,
  onOpenChange,
  onEdit,
}: ApartmentDetailSheetProps) {
  const { toast } = useToast();
  const updateStatus = useUpdateApartmentStatus();

  if (!apartment) return null;

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateStatus.mutateAsync({
        id: apartment.id,
        status: newStatus,
      });
      toast({
        title: 'Status updated',
        description: `Apartment ${apartment.unitNumber} is now ${newStatus.toLowerCase()}`,
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
            Unit {apartment.unitNumber}
          </SheetTitle>
          <SheetDescription>
            {apartment.building?.name || 'Building'} · Floor {apartment.floor}
          </SheetDescription>
        </SheetHeader>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-6 space-y-6"
        >
          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <div className="flex items-center gap-2">
              <Badge variant={statusVariants[apartment.status] || 'default'} className="text-sm">
                {apartment.status.charAt(0) + apartment.status.slice(1).toLowerCase()}
              </Badge>
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
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Square className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Area</p>
                  <p className="text-lg font-semibold">{apartment.areaSqm} m²</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Bed className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Bedrooms</p>
                  <p className="text-lg font-semibold">{apartment.bedroomCount}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Bath className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Bathrooms</p>
                  <p className="text-lg font-semibold">{apartment.bathroomCount}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Building className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Floor</p>
                  <p className="text-lg font-semibold">{apartment.floor}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Features */}
          {apartment.features && Object.keys(apartment.features).length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-3">Features</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(apartment.features).map(([key, value]) => (
                  <Badge key={key} variant="outline">
                    {key}: {String(value)}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Building Info */}
          {apartment.building && (
            <div>
              <h3 className="text-sm font-medium mb-3">Building Information</h3>
              <Card>
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Name</span>
                    <span className="text-sm font-medium">{apartment.building.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Address</span>
                    <span className="text-sm font-medium">{apartment.building.address}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

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
            <p>Created: {new Date(apartment.createdAt).toLocaleDateString()}</p>
            <p>Updated: {new Date(apartment.updatedAt).toLocaleDateString()}</p>
          </div>
        </motion.div>
      </SheetContent>
    </Sheet>
  );
}
