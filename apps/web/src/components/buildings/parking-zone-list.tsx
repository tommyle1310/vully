'use client';

import { Car, Plus, Pencil } from 'lucide-react';
import { 
  ParkingZone,
  ParkingType,
  CreateParkingZoneInput,
} from '@/hooks/use-parking';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { cn } from '@/lib/utils';
import { PARKING_TYPE_ICONS } from './parking-constants';
import { ParkingSlot } from '@/hooks/use-parking';

interface ParkingZoneListProps {
  zones: ParkingZone[];
  slots: ParkingSlot[];
  selectedZone: ParkingZone | null;
  onSelectZone: (zone: ParkingZone) => void;
  zoneDialogOpen: boolean;
  onZoneDialogChange: (open: boolean) => void;
  editingZone: ParkingZone | null;
  zoneForm: Partial<CreateParkingZoneInput>;
  onZoneFormChange: (update: Partial<CreateParkingZoneInput>) => void;
  onEditZone: (zone: ParkingZone) => void;
  onSaveZone: () => void;
  isSaving: boolean;
}

export function ParkingZoneList({
  zones,
  slots,
  selectedZone,
  onSelectZone,
  zoneDialogOpen,
  onZoneDialogChange,
  editingZone,
  zoneForm,
  onZoneFormChange,
  onEditZone,
  onSaveZone,
  isSaving,
}: ParkingZoneListProps) {
  return (
    <Card className="lg:col-span-1">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">Parking Zones</CardTitle>
          <CardDescription>Select a zone to manage slots</CardDescription>
        </div>
        <Dialog open={zoneDialogOpen} onOpenChange={onZoneDialogChange}>
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
                  onChange={(e) => onZoneFormChange({ name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zoneCode">Zone Code</Label>
                <Input
                  id="zoneCode"
                  placeholder="e.g., B1-A"
                  value={zoneForm.code}
                  onChange={(e) => onZoneFormChange({ code: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Slot Type</Label>
                <Select
                  value={zoneForm.slotType}
                  onValueChange={(value) => onZoneFormChange({ slotType: value as ParkingType })}
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
                  onChange={(e) => onZoneFormChange({ totalSlots: Number(e.target.value) })}
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
                  onChange={(e) => onZoneFormChange({ feePerMonth: e.target.value ? Number(e.target.value) : undefined })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onZoneDialogChange(false)}>Cancel</Button>
              <Button onClick={onSaveZone} disabled={isSaving}>
                {isSaving 
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
                  onClick={() => onSelectZone(zone)}
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
                    onEditZone(zone);
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
  );
}
