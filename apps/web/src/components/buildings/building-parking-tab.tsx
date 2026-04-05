'use client';

import { useState } from 'react';
import { 
  useParkingStats,
  useParkingZones,
  useParkingSlots,
  useCreateParkingZone,
  useUpdateParkingZone,
  useCreateParkingSlots,
  ParkingZone,
  ParkingSlot,
  CreateParkingZoneInput,
  UpdateParkingZoneInput,
} from '@/hooks/use-parking';
import { useApartments } from '@/hooks/use-apartments';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogContent,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

import { ParkingStatsCards } from './parking-stats-cards';
import { ParkingZoneList } from './parking-zone-list';
import { ParkingSlotsGrid } from './parking-slots-grid';
import { ParkingUnassignSlot } from './parking-assign-dialog';

interface BuildingParkingTabProps {
  buildingId: string;
}

export function BuildingParkingTab({ buildingId }: BuildingParkingTabProps) {
  const { toast } = useToast();
  const [selectedZone, setSelectedZone] = useState<ParkingZone | null>(null);
  const [zoneDialogOpen, setZoneDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<ParkingZone | null>(null);
  const [slotsDialogOpen, setSlotsDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<ParkingSlot | null>(null);
  const [assignPopoverOpen, setAssignPopoverOpen] = useState(false);
  const [unassignDialogOpen, setUnassignDialogOpen] = useState(false);
  const [apartmentSearch, setApartmentSearch] = useState('');

  // Fetch data
  const { data: statsData, isLoading: statsLoading } = useParkingStats(buildingId);
  const { data: zonesData, isLoading: zonesLoading } = useParkingZones(buildingId);
  const { data: slotsData, isLoading: slotsLoading } = useParkingSlots(
    buildingId, 
    selectedZone?.id || ''
  );
  const { data: apartmentsData } = useApartments({ buildingId, limit: 500 });

  const createZone = useCreateParkingZone(buildingId);
  const updateZone = useUpdateParkingZone(buildingId, editingZone?.id || '');
  const createSlots = useCreateParkingSlots(buildingId, selectedZone?.id || '');

  const stats = statsData?.data;
  const zones = zonesData?.data || [];
  const slots = slotsData?.data || [];
  const apartments = apartmentsData?.data || [];

  const filteredApartments = apartments.filter(apt => 
    apt.unit_number.toLowerCase().includes(apartmentSearch.toLowerCase()) ||
    apt.apartmentCode?.toLowerCase().includes(apartmentSearch.toLowerCase())
  );

  // Zone form state
  const [zoneForm, setZoneForm] = useState<Partial<CreateParkingZoneInput>>({
    name: '',
    code: '',
    slotType: 'car',
    totalSlots: 10,
    feePerMonth: undefined,
  });
  const [slotsCount, setSlotsCount] = useState(10);

  // Computed values
  const currentSlotCount = slots.length;
  const remainingCapacity = selectedZone ? selectedZone.totalSlots - currentSlotCount : 0;
  const wouldExceedCapacity = selectedZone ? (currentSlotCount + slotsCount) > selectedZone.totalSlots : false;

  // Handlers
  const handleEditZone = (zone: ParkingZone) => {
    setEditingZone(zone);
    setZoneForm({
      name: zone.name,
      code: zone.code,
      slotType: zone.slotType,
      totalSlots: zone.totalSlots,
      feePerMonth: zone.feePerMonth ?? undefined,
    });
    setZoneDialogOpen(true);
  };

  const handleZoneDialogClose = (open: boolean) => {
    if (!open) {
      setEditingZone(null);
      setZoneForm({ name: '', code: '', slotType: 'car', totalSlots: 10, feePerMonth: undefined });
    }
    setZoneDialogOpen(open);
  };

  const handleSaveZone = async () => {
    if (!zoneForm.name || !zoneForm.code || !zoneForm.slotType) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingZone) {
        await updateZone.mutateAsync({
          name: zoneForm.name,
          code: zoneForm.code,
          totalSlots: zoneForm.totalSlots,
          feePerMonth: zoneForm.feePerMonth,
        } as UpdateParkingZoneInput);
        toast({
          title: 'Zone Updated',
          description: `Parking zone "${zoneForm.name}" has been updated`,
        });
      } else {
        await createZone.mutateAsync(zoneForm as CreateParkingZoneInput);
        toast({
          title: 'Zone Created',
          description: `Parking zone "${zoneForm.name}" has been created`,
        });
      }
      handleZoneDialogClose(false);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : editingZone ? 'Failed to update zone' : 'Failed to create zone';
      toast({
        title: 'Error',
        description: errMsg,
        variant: 'destructive',
      });
    }
  };

  const handleCreateSlots = async () => {
    if (!selectedZone || slotsCount < 1) return;

    if (wouldExceedCapacity) {
      toast({
        title: 'Warning',
        description: `Adding ${slotsCount} slots would exceed zone capacity of ${selectedZone.totalSlots}. Current: ${currentSlotCount}`,
        variant: 'destructive',
      });
      return;
    }

    try {
      await createSlots.mutateAsync({ count: slotsCount });
      toast({
        title: 'Slots Created',
        description: `${slotsCount} parking slots have been created`,
      });
      setSlotsDialogOpen(false);
      setSlotsCount(10);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Failed to create slots';
      toast({
        title: 'Error',
        description: errMsg,
        variant: 'destructive',
      });
    }
  };

  const handleSlotClick = (slot: ParkingSlot) => {
    setSelectedSlot(slot);
    if (slot.status === 'available') {
      setAssignPopoverOpen(true);
    } else if (slot.status === 'assigned') {
      setUnassignDialogOpen(true);
    }
  };

  const handleAssignPopoverClose = () => {
    setSelectedSlot(null);
    setAssignPopoverOpen(false);
  };

  const handleUnassignClose = () => {
    setUnassignDialogOpen(false);
    setSelectedSlot(null);
  };

  if (statsLoading || zonesLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {stats && <ParkingStatsCards stats={stats} />}

      <div className="grid gap-6 lg:grid-cols-3">
        <ParkingZoneList
          zones={zones}
          slots={slots}
          selectedZone={selectedZone}
          onSelectZone={setSelectedZone}
          zoneDialogOpen={zoneDialogOpen}
          onZoneDialogChange={handleZoneDialogClose}
          editingZone={editingZone}
          zoneForm={zoneForm}
          onZoneFormChange={(update) => setZoneForm(prev => ({ ...prev, ...update }))}
          onEditZone={handleEditZone}
          onSaveZone={handleSaveZone}
          isSaving={createZone.isPending || updateZone.isPending}
        />

        <ParkingSlotsGrid
          selectedZone={selectedZone}
          slots={slots}
          slotsLoading={slotsLoading}
          buildingId={buildingId}
          slotsDialogOpen={slotsDialogOpen}
          onSlotsDialogChange={setSlotsDialogOpen}
          slotsCount={slotsCount}
          onSlotsCountChange={setSlotsCount}
          currentSlotCount={currentSlotCount}
          remainingCapacity={remainingCapacity}
          wouldExceedCapacity={wouldExceedCapacity}
          onCreateSlots={handleCreateSlots}
          isCreatingSlots={createSlots.isPending}
          selectedSlot={selectedSlot}
          assignPopoverOpen={assignPopoverOpen}
          onSlotClick={handleSlotClick}
          onAssignPopoverClose={handleAssignPopoverClose}
          apartmentSearch={apartmentSearch}
          onApartmentSearchChange={setApartmentSearch}
          filteredApartments={filteredApartments}
        />
      </div>

      <AlertDialog 
        open={unassignDialogOpen && selectedSlot?.status === 'assigned'} 
        onOpenChange={(open: boolean) => {
          if (!open) handleUnassignClose();
        }}
      >
        <AlertDialogContent>
          {selectedSlot && (
            <ParkingUnassignSlot
              slot={selectedSlot}
              buildingId={buildingId}
              zoneId={selectedZone?.id || ''}
              onClose={handleUnassignClose}
            />
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
