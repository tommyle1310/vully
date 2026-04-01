'use client';

import { motion } from 'framer-motion';
import {
  Building,
  Bed,
  Bath,
  Square,
  Wrench,
  Pencil,
  User,
  Users,
  PawPrint,
  Zap,
  Droplets,
  Flame,
  Car,
  Bike,
  Mail,
  Package,
  CreditCard,
  Calendar,
  Shield,
  Wifi,
  Compass,
  Layers,
  KeyRound,
} from 'lucide-react';
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
import { Separator } from '@/components/ui/separator';
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
  vacant: 'success',
  occupied: 'default',
  maintenance: 'warning',
  reserved: 'default',
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
  vacant: [
    { label: 'Mark as Occupied', newStatus: 'occupied' },
    { label: 'Set Maintenance', newStatus: 'maintenance' },
  ],
  occupied: [
    { label: 'Mark as Vacant', newStatus: 'vacant' },
    { label: 'Set Maintenance', newStatus: 'maintenance' },
  ],
  maintenance: [
    { label: 'Mark as Vacant', newStatus: 'vacant' },
    { label: 'Mark as Occupied', newStatus: 'occupied' },
  ],
};

const UNIT_TYPE_LABELS: Record<string, string> = {
  studio: 'Studio',
  one_bedroom: '1 Bedroom',
  two_bedroom: '2 Bedrooms',
  three_bedroom: '3 Bedrooms',
  duplex: 'Duplex',
  penthouse: 'Penthouse',
  shophouse: 'Shophouse',
};

const ORIENTATION_LABELS: Record<string, string> = {
  north: 'North',
  south: 'South',
  east: 'East',
  west: 'West',
  northeast: 'Northeast',
  northwest: 'Northwest',
  southeast: 'Southeast',
  southwest: 'Southwest',
};

function DetailRow({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: React.ComponentType<{ className?: string }> }) {
  if (value == null || value === '' || value === false) return null;
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-muted-foreground flex items-center gap-2">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </span>
      <span className="text-sm font-medium text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <>
      <Separator />
      <h3 className="text-sm font-semibold pt-2">{title}</h3>
    </>
  );
}

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
            {apartment.apartmentCode || `Unit ${apartment.unitNumber}`}
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
              <Badge variant={statusVariants[apartment.status] || 'default'} className="text-sm">
                {apartment.status.charAt(0).toUpperCase() + apartment.status.slice(1).toLowerCase()}
              </Badge>
              {apartment.isRented && (
                <Badge variant="outline" className="text-sm">Rented</Badge>
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
                    {apartment.currentResidentCount}
                    {apartment.maxResidents ? ` / ${apartment.maxResidents}` : ''}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Spatial Details */}
          <div className="space-y-1">
            <DetailRow label="Orientation" value={apartment.orientation ? ORIENTATION_LABELS[apartment.orientation] : null} icon={Compass} />
            <DetailRow label="Balcony Direction" value={apartment.balconyDirection ? ORIENTATION_LABELS[apartment.balconyDirection] : null} icon={Compass} />
            <DetailRow label="Ceiling Height" value={apartment.ceilingHeight ? `${apartment.ceilingHeight}m` : null} icon={Layers} />
            <DetailRow label="Corner Unit" value={apartment.isCornerUnit ? 'Yes' : null} />
          </div>

          {/* Ownership & Legal */}
          {(apartment.ownerId || apartment.ownershipType || apartment.handoverDate || apartment.warrantyExpiryDate) && (
            <div className="space-y-1">
              <SectionHeader title="Ownership & Legal" />
              <DetailRow label="Ownership Type" value={apartment.ownershipType ? apartment.ownershipType.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) : null} icon={User} />
              <DetailRow label="Handover Date" value={apartment.handoverDate} icon={Calendar} />
              <DetailRow label="Warranty Expiry" value={apartment.warrantyExpiryDate} icon={Shield} />
              <DetailRow label="VAT Rate" value={apartment.vatRate != null ? `${apartment.vatRate}%` : null} />
            </div>
          )}

          {/* Occupancy */}
          <div className="space-y-1">
            <SectionHeader title="Occupancy" />
            <DetailRow label="Max Residents" value={apartment.maxResidents} icon={Users} />
            <DetailRow label="Current Residents" value={apartment.currentResidentCount} icon={Users} />
            <DetailRow label="Pets Allowed" value={apartment.petAllowed != null ? (apartment.petAllowed ? `Yes${apartment.petLimit ? ` (max ${apartment.petLimit})` : ''}` : 'No') : null} icon={PawPrint} />
            <DetailRow label="Access Cards" value={apartment.accessCardLimit != null ? `Up to ${apartment.accessCardLimit}` : null} icon={KeyRound} />
            <DetailRow label="Intercom Code" value={apartment.intercomCode} />
          </div>

          {/* Utility & Technical */}
          {(apartment.electricMeterId || apartment.waterMeterId || apartment.gasMeterId || apartment.powerCapacity || apartment.acUnitCount) && (
            <div className="space-y-1">
              <SectionHeader title="Utility & Technical" />
              <DetailRow label="Electric Meter" value={apartment.electricMeterId} icon={Zap} />
              <DetailRow label="Water Meter" value={apartment.waterMeterId} icon={Droplets} />
              <DetailRow label="Gas Meter" value={apartment.gasMeterId} icon={Flame} />
              <DetailRow label="Power Capacity" value={apartment.powerCapacity ? `${apartment.powerCapacity}A` : null} icon={Zap} />
              <DetailRow label="AC Units" value={apartment.acUnitCount} />
              <DetailRow label="Fire Detector" value={apartment.fireDetectorId} icon={Shield} />
              <DetailRow label="Sprinklers" value={apartment.sprinklerCount} />
              <DetailRow label="Internet Terminal" value={apartment.internetTerminalLoc} icon={Wifi} />
            </div>
          )}

          {/* Parking & Assets */}
          {(apartment.assignedCarSlot || apartment.assignedMotoSlot || apartment.mailboxNumber || apartment.storageUnitId) && (
            <div className="space-y-1">
              <SectionHeader title="Parking & Assets" />
              <DetailRow label="Car Slot" value={apartment.assignedCarSlot} icon={Car} />
              <DetailRow label="Moto Slot" value={apartment.assignedMotoSlot} icon={Bike} />
              <DetailRow label="Mailbox" value={apartment.mailboxNumber} icon={Mail} />
              <DetailRow label="Storage Unit" value={apartment.storageUnitId} icon={Package} />
            </div>
          )}

          {/* Billing Config */}
          <div className="space-y-1">
            <SectionHeader title="Billing" />
            <DetailRow label="Billing Cycle" value={apartment.billingCycle ? apartment.billingCycle.charAt(0).toUpperCase() + apartment.billingCycle.slice(1) : null} icon={CreditCard} />
            <DetailRow label="Billing Start" value={apartment.billingStartDate} icon={Calendar} />
            <DetailRow label="Virtual Account" value={apartment.bankAccountVirtual} />
            <DetailRow label="Late Fee Waived" value={apartment.lateFeeWaived ? 'Yes' : null} />
          </div>

          {/* System */}
          {(apartment.syncStatus !== 'disconnected' || apartment.isMerged || !apartment.portalAccessEnabled) && (
            <div className="space-y-1">
              <SectionHeader title="System" />
              <DetailRow label="Sync Status" value={apartment.syncStatus !== 'disconnected' ? apartment.syncStatus : null} />
              <DetailRow label="Merged Unit" value={apartment.isMerged ? 'Yes' : null} />
              <DetailRow label="Portal Access" value={!apartment.portalAccessEnabled ? 'Disabled' : null} />
            </div>
          )}

          {/* Building Info */}
          {apartment.building && (
            <div>
              <SectionHeader title="Building Information" />
              <Card className="mt-2">
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
