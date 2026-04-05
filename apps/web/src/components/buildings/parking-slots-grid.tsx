'use client';

import { Settings, Plus } from 'lucide-react';
import { ParkingZone, ParkingSlot } from '@/hooks/use-parking';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { STATUS_COLORS } from './parking-constants';
import { ParkingAssignSlot } from './parking-assign-dialog';

interface ParkingSlotsGridProps {
  selectedZone: ParkingZone | null;
  slots: ParkingSlot[];
  slotsLoading: boolean;
  buildingId: string;
  // Add slots dialog
  slotsDialogOpen: boolean;
  onSlotsDialogChange: (open: boolean) => void;
  slotsCount: number;
  onSlotsCountChange: (count: number) => void;
  currentSlotCount: number;
  remainingCapacity: number;
  wouldExceedCapacity: boolean;
  onCreateSlots: () => void;
  isCreatingSlots: boolean;
  // Slot interactions
  selectedSlot: ParkingSlot | null;
  assignPopoverOpen: boolean;
  onSlotClick: (slot: ParkingSlot) => void;
  onAssignPopoverClose: () => void;
  // Apartment search for assign
  apartmentSearch: string;
  onApartmentSearchChange: (value: string) => void;
  filteredApartments: Array<{
    id: string;
    unit_number: string;
    apartmentCode?: string | null;
    floorIndex: number;
  }>;
}

export function ParkingSlotsGrid({
  selectedZone,
  slots,
  slotsLoading,
  buildingId,
  slotsDialogOpen,
  onSlotsDialogChange,
  slotsCount,
  onSlotsCountChange,
  currentSlotCount,
  remainingCapacity,
  wouldExceedCapacity,
  onCreateSlots,
  isCreatingSlots,
  selectedSlot,
  assignPopoverOpen,
  onSlotClick,
  onAssignPopoverClose,
  apartmentSearch,
  onApartmentSearchChange,
  filteredApartments,
}: ParkingSlotsGridProps) {
  return (
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
          <Dialog open={slotsDialogOpen} onOpenChange={onSlotsDialogChange}>
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
                    onChange={(e) => onSlotsCountChange(Number(e.target.value))}
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
                <Button variant="outline" onClick={() => onSlotsDialogChange(false)}>Cancel</Button>
                <Button 
                  onClick={onCreateSlots} 
                  disabled={isCreatingSlots || wouldExceedCapacity || slotsCount < 1}
                >
                  {isCreatingSlots ? 'Creating...' : `Create ${slotsCount} Slots`}
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
                      onAssignPopoverClose();
                    }
                  }}
                >
                  <PopoverTrigger asChild>
                    <button
                      onClick={() => onSlotClick(slot)}
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
                      <ParkingAssignSlot
                        slot={slot}
                        buildingId={buildingId}
                        zoneId={selectedZone?.id || ''}
                        apartmentSearch={apartmentSearch}
                        onApartmentSearchChange={onApartmentSearchChange}
                        filteredApartments={filteredApartments}
                        onClose={onAssignPopoverClose}
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
  );
}
