'use client';

import React from 'react';
import {
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
  Calendar,
  Shield,
  Wifi,
  Compass,
  Layers,
  KeyRound,
  Receipt,
} from 'lucide-react';
import { Apartment } from '@/hooks/use-apartments';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ORIENTATION_LABELS, getBillingCycleDescription } from './apartment-detail-helpers';

export function DetailRow({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: React.ComponentType<{ className?: string }> }) {
  if (value == null || value === '' || value === false) return null;
  return (
    <div className="flex items-start justify-between py-1.5 gap-4">
      <span className="text-sm text-muted-foreground flex items-center gap-2 shrink-0">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}

export function SectionHeader({ title }: { title: string }) {
  return (
    <>
      <Separator />
      <h3 className="text-sm font-semibold pt-2">{title}</h3>
    </>
  );
}

interface ApartmentDetailInfoSectionsProps {
  apartment: Apartment;
}

export function ApartmentDetailInfoSections({ apartment }: ApartmentDetailInfoSectionsProps) {
  return (
    <>
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

      {/* Service Fees (Recurring) */}
      <div className="space-y-1">
        <SectionHeader title="Service Fees (Recurring)" />
        <p className="text-xs text-muted-foreground mb-2">
          Management fees, parking, utilities billed separately from rent/purchase payments
        </p>
        <DetailRow 
          label="Billing Cycle" 
          value={apartment.billingCycle ? getBillingCycleDescription(apartment.billingCycle) : null} 
          icon={Receipt} 
        />
        <DetailRow label="Billing Start Date" value={apartment.billingStartDate} icon={Calendar} />
        <DetailRow label="Virtual Bank Account" value={apartment.bankAccountVirtual} />
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
    </>
  );
}
