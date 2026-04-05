'use client';

import { ParkingSlot, useAssignParkingSlot, useUnassignParkingSlot } from '@/hooks/use-parking';
import { useToast } from '@/hooks/use-toast';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ParkingAssignSlotProps {
  slot: ParkingSlot;
  buildingId: string;
  zoneId: string;
  apartmentSearch: string;
  onApartmentSearchChange: (value: string) => void;
  filteredApartments: Array<{
    id: string;
    unit_number: string;
    apartmentCode?: string | null;
    floorIndex: number;
  }>;
  onClose: () => void;
}

export function ParkingAssignSlot({
  slot,
  buildingId,
  zoneId,
  apartmentSearch,
  onApartmentSearchChange,
  filteredApartments,
  onClose,
}: ParkingAssignSlotProps) {
  const { toast } = useToast();
  const assignSlot = useAssignParkingSlot(buildingId, zoneId, slot.id);

  const handleAssign = async (apartmentId: string) => {
    try {
      await assignSlot.mutateAsync({ apartmentId });
      toast({
        title: 'Slot Assigned',
        description: `Slot ${slot.fullCode} has been assigned`,
      });
      onClose();
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Failed to assign slot';
      toast({
        title: 'Error',
        description: errMsg,
        variant: 'destructive',
      });
    }
  };

  return (
    <Command>
      <CommandInput
        placeholder="Search apartments..."
        value={apartmentSearch}
        onValueChange={onApartmentSearchChange}
      />
      <CommandList>
        <CommandEmpty>No apartments found</CommandEmpty>
        <CommandGroup>
          {filteredApartments.slice(0, 10).map((apt) => (
            <CommandItem
              key={apt.id}
              value={apt.id}
              onSelect={() => handleAssign(apt.id)}
              disabled={assignSlot.isPending}
            >
              <span className="font-medium">{apt.apartmentCode || apt.unit_number}</span>
              <span className="ml-2 text-muted-foreground text-sm">
                Floor {apt.floorIndex + 1}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

interface ParkingUnassignSlotProps {
  slot: ParkingSlot;
  buildingId: string;
  zoneId: string;
  onClose: () => void;
}

export function ParkingUnassignSlot({
  slot,
  buildingId,
  zoneId,
  onClose,
}: ParkingUnassignSlotProps) {
  const { toast } = useToast();
  const unassignSlot = useUnassignParkingSlot(buildingId, zoneId, slot.id);

  const handleUnassign = async () => {
    try {
      await unassignSlot.mutateAsync();
      toast({
        title: 'Slot Unassigned',
        description: `Slot ${slot.fullCode} has been unassigned`,
      });
      onClose();
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Failed to unassign slot';
      toast({
        title: 'Error',
        description: errMsg,
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>Unassign Parking Slot</AlertDialogTitle>
        <AlertDialogDescription>
          Are you sure you want to unassign slot <strong>{slot.fullCode}</strong> from apartment{' '}
          <strong>{slot.assignedAptCode}</strong>?
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
        <AlertDialogAction onClick={handleUnassign} disabled={unassignSlot.isPending}>
          {unassignSlot.isPending ? 'Unassigning...' : 'Unassign'}
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  );
}
