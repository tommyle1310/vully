'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Car, 
  Bike, 
  Plus,
  Settings,
  Search,
  RefreshCcw,
  Pencil,
} from 'lucide-react';
import { 
  useParkingStats,
  useParkingZones,
  useParkingSlots,
  useCreateParkingZone,
  useUpdateParkingZone,
  useCreateParkingSlots,
  useAssignParkingSlot,
  useUnassignParkingSlot,
  ParkingZone,
  ParkingSlot,
  ParkingType,
  CreateParkingZoneInput,
  UpdateParkingZoneInput,
} from '@/hooks/use-parking';
import { useApartments } from '@/hooks/use-apartments';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
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
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface BuildingParkingTabProps {
  buildingId: string;
}

const PARKING_TYPE_ICONS = {
  car: Car,
  motorcycle: Bike,
  bicycle: Bike,
};

const PARKING_TYPE_LABELS = {
  car: 'Car',
  motorcycle: 'Motorcycle',
  bicycle: 'Bicycle',
};

const STATUS_COLORS = {
  available: 'bg-green-100 hover:bg-green-200 border-green-300 text-green-800',
  assigned: 'bg-blue-100 hover:bg-blue-200 border-blue-300 text-blue-800',
  reserved: 'bg-yellow-100 hover:bg-yellow-200 border-yellow-300 text-yellow-800',
  maintenance: 'bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-600',
};

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
  const { data: zonesData, isLoading: zonesLoading, refetch: refetchZones } = useParkingZones(buildingId);
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

  // Filter apartments for assignment
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

  // Slots form state
  const [slotsCount, setSlotsCount] = useState(10);

  // Open edit dialog
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

  // Reset form when closing dialog
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
        // Update existing zone
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
        // Create new zone
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

  // Calculate current slot count for the selected zone
  const currentSlotCount = slots.length;
  const remainingCapacity = selectedZone ? selectedZone.totalSlots - currentSlotCount : 0;
  const wouldExceedCapacity = selectedZone ? (currentSlotCount + slotsCount) > selectedZone.totalSlots : false;

  const handleCreateSlots = async () => {
    if (!selectedZone || slotsCount < 1) {
      return;
    }

    // Validate: warn user if exceeding capacity
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

  // Lazy-loaded assign/unassign hooks
  const AssignSlotComponent = ({ slot, onClose }: { slot: ParkingSlot; onClose: () => void }) => {
    const assignSlot = useAssignParkingSlot(buildingId, selectedZone?.id || '', slot.id);

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
          onValueChange={setApartmentSearch}
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
  };

  const UnassignSlotComponent = ({ slot, onClose }: { slot: ParkingSlot; onClose: () => void }) => {
    const unassignSlot = useUnassignParkingSlot(buildingId, selectedZone?.id || '', slot.id);

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
      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Slots
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSlots}</div>
              <p className="text-xs text-muted-foreground">
                across {stats.totalZones} zones
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Available
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.availableSlots}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalSlots > 0 
                  ? Math.round((stats.availableSlots / stats.totalSlots) * 100) 
                  : 0}% free
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Assigned
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.assignedSlots}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                By Type
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1">
                  <Car className="h-3 w-3" /> Car
                </span>
                <span>{stats.byType.car.total}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1">
                  <Bike className="h-3 w-3" /> Moto
                </span>
                <span>{stats.byType.motorcycle.total}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content: Zones + Slots */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Zone List */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Parking Zones</CardTitle>
              <CardDescription>Select a zone to manage slots</CardDescription>
            </div>
            <Dialog open={zoneDialogOpen} onOpenChange={handleZoneDialogClose}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-1 h-4 w-4" />
                  Add
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingZone ? 'Edit Parking Zone' : 'Create Parking Zone'}</DialogTitle>
                  <DialogDescription>
                    {editingZone ? 'Update zone settings' : 'Add a new parking zone to this building'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="zoneName">Zone Name</Label>
                    <Input
                      id="zoneName"
                      placeholder="e.g., Basement 1 - Zone A"
                      value={zoneForm.name}
                      onChange={(e) => setZoneForm(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zoneCode">Zone Code</Label>
                    <Input
                      id="zoneCode"
                      placeholder="e.g., B1-A"
                      value={zoneForm.code}
                      onChange={(e) => setZoneForm(prev => ({ ...prev, code: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Slot Type</Label>
                    <Select
                      value={zoneForm.slotType}
                      onValueChange={(value) => setZoneForm(prev => ({ 
                        ...prev, 
                        slotType: value as ParkingType 
                      }))}
                      disabled={!!editingZone}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="car">Car</SelectItem>
                        <SelectItem value="motorcycle">Motorcycle</SelectItem>
                        <SelectItem value="bicycle">Bicycle</SelectItem>
                      </SelectContent>
                    </Select>
                    {editingZone && (
                      <p className="text-xs text-muted-foreground">Slot type cannot be changed after creation</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="totalSlots">Total Slots (capacity)</Label>
                    <Input
                      id="totalSlots"
                      type="number"
                      value={zoneForm.totalSlots}
                      onChange={(e) => setZoneForm(prev => ({ 
                        ...prev, 
                        totalSlots: Number(e.target.value) 
                      }))}
                    />
                    {editingZone && editingZone.totalSlots < (zoneForm.totalSlots || 0) && (
                      <p className="text-xs text-muted-foreground">Note: Existing slots will not be removed</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="feePerMonth">Monthly Fee (VND, optional)</Label>
                    <Input
                      id="feePerMonth"
                      type="number"
                      placeholder="e.g., 500000"
                      value={zoneForm.feePerMonth ?? ''}
                      onChange={(e) => setZoneForm(prev => ({ 
                        ...prev, 
                        feePerMonth: e.target.value ? Number(e.target.value) : undefined 
                      }))}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => handleZoneDialogClose(false)}>Cancel</Button>
                  <Button onClick={handleSaveZone} disabled={createZone.isPending || updateZone.isPending}>
                    {(createZone.isPending || updateZone.isPending) 
                      ? (editingZone ? 'Updating...' : 'Creating...') 
                      : (editingZone ? 'Update Zone' : 'Create Zone')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="space-y-2">
            {zones.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Car className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No parking zones yet</p>
                <p className="text-sm">Create your first zone to get started</p>
              </div>
            ) : (
              zones.map((zone) => {
                const Icon = PARKING_TYPE_ICONS[zone.slotType];
                const isSelected = selectedZone?.id === zone.id;
                const currentSlots = zone.assignedSlots !== undefined 
                  ? (zone.availableSlots ?? 0) + zone.assignedSlots 
                  : slots.length;
                const isOverCapacity = currentSlots > zone.totalSlots;
                return (
                  <div
                    key={zone.id}
                    className={cn(
                      'w-full text-left p-3 rounded-lg border transition-colors relative group',
                      isSelected 
                        ? 'bg-primary/10 border-primary' 
                        : 'hover:bg-muted/50 border-transparent'
                    )}
                  >
                    <button
                      onClick={() => setSelectedZone(zone)}
                      className="w-full text-left"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{zone.name}</p>
                          <p className="text-sm text-muted-foreground">{zone.code}</p>
                        </div>
                        <Badge 
                          variant={isOverCapacity ? "destructive" : "secondary"}
                          title={isOverCapacity ? 'Over capacity!' : undefined}
                        >
                          {currentSlots}/{zone.totalSlots}
                        </Badge>
                      </div>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditZone(zone);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Slot Grid */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">
                {selectedZone ? selectedZone.name : 'Parking Slots'}
              </CardTitle>
              <CardDescription>
                {selectedZone 
                  ? `${slots.length} slots • ${selectedZone.feePerMonth?.toLocaleString() ?? 'Free'}₫/month`
                  : 'Select a zone to view slots'
                }
              </CardDescription>
            </div>
            {selectedZone && (
              <Dialog open={slotsDialogOpen} onOpenChange={setSlotsDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Plus className="mr-1 h-4 w-4" />
                    Add Slots
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Parking Slots</DialogTitle>
                    <DialogDescription>
                      Create multiple parking slots at once
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <div className="space-y-2">
                      <Label htmlFor="slotsCount">Number of Slots</Label>
                      <Input
                        id="slotsCount"
                        type="number"
                        min={1}
                        max={Math.max(1, remainingCapacity)}
                        value={slotsCount}
                        onChange={(e) => setSlotsCount(Number(e.target.value))}
                      />
                      <p className="text-sm text-muted-foreground">
                        Current: {currentSlotCount} / {selectedZone?.totalSlots} (Remaining capacity: {remainingCapacity})
                      </p>
                      {wouldExceedCapacity && (
                        <p className="text-sm text-destructive font-medium">
                          ⚠️ This would exceed the zone capacity!
                        </p>
                      )}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setSlotsDialogOpen(false)}>Cancel</Button>
                    <Button 
                      onClick={handleCreateSlots} 
                      disabled={createSlots.isPending || wouldExceedCapacity || slotsCount < 1}
                    >
                      {createSlots.isPending ? 'Creating...' : `Create ${slotsCount} Slots`}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </CardHeader>
          <CardContent>
            {!selectedZone ? (
              <div className="text-center py-16 text-muted-foreground">
                <Settings className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Select a parking zone from the left</p>
              </div>
            ) : slotsLoading ? (
              <div className="grid grid-cols-6 gap-2">
                {[...Array(20)].map((_, i) => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : slots.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Plus className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No slots in this zone</p>
                <p className="text-sm">Add slots to start assigning them</p>
              </div>
            ) : (
              <>
                {/* Legend */}
                <div className="flex flex-wrap gap-4 mb-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-green-100 border border-green-300" />
                    <span>Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-blue-100 border border-blue-300" />
                    <span>Assigned</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-yellow-100 border border-yellow-300" />
                    <span>Reserved</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-gray-100 border border-gray-300" />
                    <span>Maintenance</span>
                  </div>
                </div>

                {/* Slot Grid */}
                <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
                  {slots.map((slot) => (
                    <Popover 
                      key={slot.id}
                      open={selectedSlot?.id === slot.id && assignPopoverOpen}
                      onOpenChange={(open) => {
                        if (!open) {
                          setSelectedSlot(null);
                          setAssignPopoverOpen(false);
                        }
                      }}
                    >
                      <PopoverTrigger asChild>
                        <button
                          onClick={() => {
                            setSelectedSlot(slot);
                            if (slot.status === 'available') {
                              setAssignPopoverOpen(true);
                            } else if (slot.status === 'assigned') {
                              setUnassignDialogOpen(true);
                            }
                          }}
                          className={cn(
                            'p-2 rounded border text-xs font-medium text-center transition-colors',
                            STATUS_COLORS[slot.status]
                          )}
                          title={slot.assignedAptCode ? `Assigned to ${slot.assignedAptCode}` : 'Available'}
                        >
                          <div>{slot.slotNumber}</div>
                          {slot.assignedAptCode && (
                            <div className="text-[10px] truncate opacity-75">
                              {slot.assignedAptCode}
                            </div>
                          )}
                        </button>
                      </PopoverTrigger>
                      {slot.status === 'available' && (
                        <PopoverContent className="w-64 p-0" align="start">
                          <AssignSlotComponent 
                            slot={slot} 
                            onClose={() => {
                              setSelectedSlot(null);
                              setAssignPopoverOpen(false);
                            }} 
                          />
                        </PopoverContent>
                      )}
                    </Popover>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Unassign Dialog */}
      <AlertDialog 
        open={unassignDialogOpen && selectedSlot?.status === 'assigned'} 
        onOpenChange={(open: boolean) => {
          if (!open) {
            setUnassignDialogOpen(false);
            setSelectedSlot(null);
          }
        }}
      >
        <AlertDialogContent>
          {selectedSlot && (
            <UnassignSlotComponent 
              slot={selectedSlot} 
              onClose={() => {
                setUnassignDialogOpen(false);
                setSelectedSlot(null);
              }} 
            />
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
