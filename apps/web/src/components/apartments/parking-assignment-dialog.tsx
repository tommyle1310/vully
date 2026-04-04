'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Car, Bike, Building, MapPin, Loader2, Check, X, ChevronRight } from 'lucide-react';
import { useApartmentParkingSlots } from '@/hooks/use-apartments';
import { useParkingZones, useParkingSlots } from '@/hooks/use-parking';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api-client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ParkingAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apartmentId: string;
  apartmentCode?: string;
  buildingId: string;
}

const TYPE_ICONS = {
  car: Car,
  motorcycle: Bike,
  bicycle: Bike,
} as const;

const TYPE_LABELS: Record<string, string> = {
  car: 'Car',
  motorcycle: 'Motorcycle',
  bicycle: 'Bicycle',
};

export function ParkingAssignmentDialog({
  open,
  onOpenChange,
  apartmentId,
  apartmentCode = 'this unit',
  buildingId,
}: ParkingAssignmentDialogProps) {
  const { toast } = useToast();
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [unassignSlotId, setUnassignSlotId] = useState<string | null>(null);
  const [unassignSlotCode, setUnassignSlotCode] = useState<string>('');

  // Fetch assigned slots for this apartment
  const { data: assignedSlotsData, isLoading: assignedLoading, refetch: refetchAssignedSlots } = useApartmentParkingSlots(apartmentId);
  const assignedSlots = assignedSlotsData?.data || [];

  // Fetch parking zones for the building
  const { data: zonesData, isLoading: zonesLoading } = useParkingZones(buildingId);
  const zones = zonesData?.data || [];

  // Fetch slots for selected zone
  const { data: slotsData, isLoading: slotsLoading, refetch: refetchSlots } = useParkingSlots(
    buildingId,
    selectedZoneId || '',
  );
  const slots = slotsData?.data || [];
  const availableSlots = slots.filter((s) => s.status === 'available');

  // State for mutation loading
  const [isAssigning, setIsAssigning] = useState(false);

  const handleAssign = async (slotId: string) => {
    setIsAssigning(true);
    try {
      await apiClient.post(
        `/buildings/${buildingId}/parking/zones/${selectedZoneId}/slots/${slotId}/assign`,
        { apartmentId }
      );

      toast({
        title: 'Slot Assigned',
        description: `Parking slot has been assigned to unit ${apartmentCode}`,
      });
      
      // Refetch both assigned slots and available slots
      refetchSlots();
      refetchAssignedSlots();
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Failed to assign slot';
      toast({
        title: 'Error',
        description: errMsg,
        variant: 'destructive',
      });
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUnassign = async () => {
    if (!unassignSlotId) return;
    
    const slot = assignedSlots.find((s) => s.id === unassignSlotId);
    if (!slot) return;

    try {
      await apiClient.post(
        `/buildings/${buildingId}/parking/zones/${slot.zoneId}/slots/${unassignSlotId}/unassign`,
        {}
      );

      toast({
        title: 'Slot Unassigned',
        description: `Slot ${unassignSlotCode} has been unassigned`,
      });
      
      // Refetch assigned slots
      refetchAssignedSlots();
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Failed to unassign slot';
      toast({
        title: 'Error',
        description: errMsg,
        variant: 'destructive',
      });
    } finally {
      setUnassignSlotId(null);
      setUnassignSlotCode('');
    }
  };

  // Calculate totals
  const totalMonthlyFee = assignedSlots.reduce((sum, slot) => sum + slot.monthlyFee, 0);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              Parking Assignments - {apartmentCode}
            </DialogTitle>
            <DialogDescription>
              Manage parking slots assigned to this apartment
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {/* Currently Assigned Slots */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Assigned Slots</h4>
              {assignedLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : assignedSlots.length === 0 ? (
                <div className="text-center py-6 border rounded-lg bg-muted/50">
                  <MapPin className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No parking slots assigned</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence>
                    {assignedSlots.map((slot) => {
                      const Icon = TYPE_ICONS[slot.type as keyof typeof TYPE_ICONS] || Car;
                      return (
                        <motion.div
                          key={slot.id}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-md">
                              <Icon className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{slot.fullCode}</p>
                              <p className="text-xs text-muted-foreground">
                                {slot.zone.name} • {TYPE_LABELS[slot.type] || slot.type}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium">
                              {new Intl.NumberFormat('vi-VN', {
                                style: 'currency',
                                currency: 'VND',
                              }).format(slot.monthlyFee)}/mo
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setUnassignSlotId(slot.id);
                                setUnassignSlotCode(slot.fullCode);
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>

                  {/* Total fees */}
                  <div className="flex justify-between items-center pt-2 border-t mt-3">
                    <span className="text-sm font-medium">Total Monthly Fee</span>
                    <span className="font-semibold">
                      {new Intl.NumberFormat('vi-VN', {
                        style: 'currency',
                        currency: 'VND',
                      }).format(totalMonthlyFee)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Available Parking Zones */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Available Zones</h4>
              {zonesLoading ? (
                <div className="grid grid-cols-2 gap-2">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : zones.length === 0 ? (
                <div className="text-center py-6 border rounded-lg bg-muted/50">
                  <Building className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No parking zones configured</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Go to Building → Parking tab to set up parking zones
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {zones.map((zone) => {
                    const Icon = TYPE_ICONS[zone.slotType as keyof typeof TYPE_ICONS] || Car;
                    const isSelected = selectedZoneId === zone.id;
                    return (
                      <Card
                        key={zone.id}
                        className={`cursor-pointer transition-all hover:border-primary ${
                          isSelected ? 'border-primary bg-primary/5' : ''
                        }`}
                        onClick={() => setSelectedZoneId(isSelected ? null : zone.id)}
                      >
                        <CardHeader className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              <CardTitle className="text-sm">{zone.name}</CardTitle>
                            </div>
                            <ChevronRight
                              className={`h-4 w-4 transition-transform ${
                                isSelected ? 'rotate-90' : ''
                              }`}
                            />
                          </div>
                          <CardDescription className="text-xs">
                            {TYPE_LABELS[zone.slotType] || zone.slotType} • {zone.availableSlots} available of {zone.totalSlots}
                          </CardDescription>
                        </CardHeader>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Slots for selected zone */}
            <AnimatePresence>
              {selectedZoneId && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <h4 className="text-sm font-semibold mb-3">
                    Available Slots in{' '}
                    {zones.find((z) => z.id === selectedZoneId)?.name}
                  </h4>
                  {slotsLoading ? (
                    <div className="grid grid-cols-4 gap-2">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="text-center py-4 border rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">No available slots</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[200px]">
                      <div className="grid grid-cols-4 gap-2 pr-4">
                        {availableSlots.map((slot) => (
                          <Button
                            key={slot.id}
                            variant="outline"
                            size="sm"
                            className="justify-start h-auto py-2 flex-col items-start"
                            onClick={() => handleAssign(slot.id)}
                            disabled={isAssigning}
                          >
                            <span className="font-medium text-xs">{slot.slotNumber}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {slot.effectiveFee ? new Intl.NumberFormat('vi-VN', {
                                style: 'currency',
                                currency: 'VND',
                                notation: 'compact',
                              }).format(slot.effectiveFee) : '-'}
                            </span>
                          </Button>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </DialogContent>
      </Dialog>

      {/* Unassign Confirmation Dialog */}
      <AlertDialog
        open={!!unassignSlotId}
        onOpenChange={(open) => {
          if (!open) {
            setUnassignSlotId(null);
            setUnassignSlotCode('');
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unassign Parking Slot?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unassign slot <strong>{unassignSlotCode}</strong> from{' '}
              <strong>{apartmentCode}</strong>? The slot will become available for other apartments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnassign}>Unassign</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
