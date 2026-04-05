'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Building,
  Bed,
  Bath,
  Square,
  ArrowLeft,
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
  FileText,
  DollarSign,
  AlertCircle,
} from 'lucide-react';
import { useApartment, useUpdateApartmentStatus, Apartment } from '@/hooks/use-apartments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { ApartmentFormDialog } from '../apartment-form-dialog';
import { AccessCardsTab } from '@/components/access-cards';
import { useAccessCardStats } from '@/hooks/use-access-cards';

const statusVariants: Record<string, 'default' | 'success' | 'warning' | 'destructive'> = {
  VACANT: 'success',
  OCCUPIED: 'default',
  MAINTENANCE: 'warning',
  vacant: 'success',
  occupied: 'default',
  maintenance: 'warning',
  reserved: 'default',
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
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-muted-foreground flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4" />}
        {label}
      </span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function SectionCard({ title, children, icon: Icon }: { title: string; children: React.ReactNode; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {Icon && <Icon className="h-5 w-5" />}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {children}
      </CardContent>
    </Card>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-5 w-48" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}

export default function ApartmentDetailPage() {
  const params = useParams();
  const apartmentId = params.id as string;
  const { toast } = useToast();

  const { data: apartmentData, isLoading, error } = useApartment(apartmentId);
  const updateStatus = useUpdateApartmentStatus();
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const { data: cardStats } = useAccessCardStats(apartmentId);

  const apartment = apartmentData?.data;
  // Building floor count for floor access selection (fallback to 20)
  const buildingFloorCount = (apartment?.building as { floorCount?: number })?.floorCount ?? 20;

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (error || !apartment) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px]">
        <Building className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Apartment Not Found</h2>
        <p className="text-muted-foreground mb-4">
          {error?.message || "The apartment you're looking for doesn't exist."}
        </p>
        <Button asChild>
          <a href="/apartments">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Apartments
          </a>
        </Button>
      </div>
    );
  }

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
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to update apartment status',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button variant="ghost" size="sm" asChild>
          <a href="/apartments">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Apartments
          </a>
        </Button>
        {apartment.building && (
          <>
            <span>/</span>
            <Button variant="ghost" size="sm" asChild>
              <a href={`/buildings/${apartment.building.id}`}>
                {apartment.building.name}
              </a>
            </Button>
          </>
        )}
      </div>

      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Building className="h-8 w-8" />
            {apartment.apartmentCode || `Unit ${apartment.unit_number}`}
          </h1>
          <p className="text-muted-foreground">
            {apartment.building?.name || 'Building'} · Floor {apartment.floorLabel || apartment.floorIndex}
            {apartment.unitType && ` · ${UNIT_TYPE_LABELS[apartment.unitType] || apartment.unitType}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={statusVariants[apartment.status] || 'default'} className="text-base px-3 py-1">
            {apartment.status.charAt(0).toUpperCase() + apartment.status.slice(1).toLowerCase()}
          </Badge>
          <Button onClick={() => setFormDialogOpen(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="access-cards" className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            Access Cards
            {cardStats?.data && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                {cardStats.data.active}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-4 md:grid-cols-4"
          >
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Square className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Gross Area</p>
              <p className="text-xl font-bold">{apartment.grossArea ? `${apartment.grossArea} m²` : '-'}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Bed className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Bedrooms</p>
              <p className="text-xl font-bold">{apartment.bedroomCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Bath className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Bathrooms</p>
              <p className="text-xl font-bold">{apartment.bathroomCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Residents</p>
              <p className="text-xl font-bold">
                {apartment.currentResidentCount}
                {apartment.maxResidents ? ` / ${apartment.maxResidents}` : ''}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Active Contract Card */}
      {apartment.activeContract && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-blue-700 dark:text-blue-300">
                <FileText className="h-5 w-5" />
                Active Contract
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">Tenant</p>
                  <p className="font-medium">
                    {apartment.activeContract.tenant.firstName} {apartment.activeContract.tenant.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Monthly Rent</p>
                  <p className="font-medium">
                    ${apartment.activeContract.monthlyRent.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Start Date</p>
                  <p className="font-medium">
                    {new Date(apartment.activeContract.startDate).toLocaleDateString()}
                  </p>
                </div>
                {apartment.activeContract.endDate && (
                  <div>
                    <p className="text-xs text-muted-foreground">End Date</p>
                    <p className="font-medium">
                      {new Date(apartment.activeContract.endDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" asChild>
                  <a href={`/contracts/${apartment.activeContract.id}`}>
                    <FileText className="h-4 w-4 mr-2" />
                    View Contract
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href={`/invoices?apartmentId=${apartment.id}`}>
                    <DollarSign className="h-4 w-4 mr-2" />
                    View Invoices
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Details Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid gap-6 lg:grid-cols-2"
      >
        {/* Spatial Details */}
        <SectionCard title="Spatial Details" icon={Compass}>
          <DetailRow label="Net Area" value={apartment.netArea ? `${apartment.netArea} m²` : null} icon={Square} />
          <DetailRow label="Ceiling Height" value={apartment.ceilingHeight ? `${apartment.ceilingHeight}m` : null} icon={Layers} />
          <DetailRow label="Orientation" value={apartment.orientation ? ORIENTATION_LABELS[apartment.orientation] : null} icon={Compass} />
          <DetailRow label="Balcony Direction" value={apartment.balconyDirection ? ORIENTATION_LABELS[apartment.balconyDirection] : null} icon={Compass} />
          <DetailRow label="Corner Unit" value={apartment.isCornerUnit ? 'Yes' : null} />
        </SectionCard>

        {/* Ownership & Legal */}
        <SectionCard title="Ownership & Legal" icon={User}>
          <DetailRow label="Owner" value={apartment.owner ? `${apartment.owner.firstName} ${apartment.owner.lastName}` : (apartment.ownerId || null)} icon={User} />
          <DetailRow label="Ownership Type" value={apartment.ownershipType?.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())} />
          <DetailRow label="Handover Date" value={apartment.handoverDate} icon={Calendar} />
          <DetailRow label="Warranty Expiry" value={apartment.warrantyExpiryDate} icon={Shield} />
          <DetailRow label="VAT Rate" value={apartment.vatRate != null ? `${apartment.vatRate}%` : null} />
          <DetailRow label="Rented" value={apartment.isRented ? 'Yes' : 'No'} />
        </SectionCard>

        {/* Occupancy */}
        <SectionCard title="Occupancy" icon={Users}>
          <DetailRow label="Max Residents" value={apartment.maxResidents} icon={Users} />
          <DetailRow label="Current Residents" value={apartment.currentResidentCount} icon={Users} />
          <DetailRow 
            label="Pets Allowed" 
            value={apartment.petAllowed != null ? (apartment.petAllowed ? `Yes${apartment.petLimit ? ` (max ${apartment.petLimit})` : ''}` : 'No') : null} 
            icon={PawPrint} 
          />
          <DetailRow label="Access Cards" value={apartment.accessCardLimit != null ? `Up to ${apartment.accessCardLimit}` : null} icon={KeyRound} />
          <DetailRow label="Intercom Code" value={apartment.intercomCode} />
        </SectionCard>

        {/* Utility & Technical */}
        <SectionCard title="Utility & Technical" icon={Zap}>
          <DetailRow label="Electric Meter" value={apartment.electricMeterId} icon={Zap} />
          <DetailRow label="Water Meter" value={apartment.waterMeterId} icon={Droplets} />
          <DetailRow label="Gas Meter" value={apartment.gasMeterId} icon={Flame} />
          <DetailRow label="Power Capacity" value={apartment.powerCapacity ? `${apartment.powerCapacity}A` : null} icon={Zap} />
          <DetailRow label="AC Units" value={apartment.acUnitCount} />
          <DetailRow label="Fire Detector" value={apartment.fireDetectorId} icon={Shield} />
          <DetailRow label="Sprinklers" value={apartment.sprinklerCount} />
          <DetailRow label="Internet Terminal" value={apartment.internetTerminalLoc} icon={Wifi} />
        </SectionCard>

        {/* Parking & Assets */}
        <SectionCard title="Parking & Assets" icon={Car}>
          <DetailRow label="Car Slot" value={apartment.assignedCarSlot} icon={Car} />
          <DetailRow label="Moto Slot" value={apartment.assignedMotoSlot} icon={Bike} />
          <DetailRow label="Mailbox" value={apartment.mailboxNumber} icon={Mail} />
          <DetailRow label="Storage Unit" value={apartment.storageUnitId} icon={Package} />
        </SectionCard>

        {/* Billing Config */}
        <SectionCard title="Billing Configuration" icon={CreditCard}>
          <DetailRow label="Billing Cycle" value={apartment.billingCycle?.charAt(0).toUpperCase() + apartment.billingCycle?.slice(1)} icon={CreditCard} />
          <DetailRow label="Billing Start" value={apartment.billingStartDate} icon={Calendar} />
          <DetailRow label="Virtual Account" value={apartment.bankAccountVirtual} />
          <DetailRow label="Late Fee Waived" value={apartment.lateFeeWaived ? 'Yes' : null} />
        </SectionCard>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {apartment.status !== 'vacant' && (
              <Button variant="outline" size="sm" onClick={() => handleStatusChange('vacant')}>
                Mark as Vacant
              </Button>
            )}
            {apartment.status !== 'occupied' && (
              <Button variant="outline" size="sm" onClick={() => handleStatusChange('occupied')}>
                Mark as Occupied
              </Button>
            )}
            {apartment.status !== 'maintenance' && (
              <Button variant="outline" size="sm" onClick={() => handleStatusChange('maintenance')}>
                Set Maintenance
              </Button>
            )}
            <Separator orientation="vertical" className="h-8 mx-2" />
            <Button variant="outline" size="sm" asChild>
              <a href={`/invoices?apartmentId=${apartment.id}`}>
                <DollarSign className="h-4 w-4 mr-2" />
                View Invoices
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={`/incidents?apartmentId=${apartment.id}`}>
                <AlertCircle className="h-4 w-4 mr-2" />
                View Incidents
              </a>
            </Button>
          </CardContent>
        </Card>
      </motion.div>
        </TabsContent>

        <TabsContent value="access-cards">
          <AccessCardsTab
            apartmentId={apartment.id}
            buildingFloorCount={buildingFloorCount}
          />
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <ApartmentFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        apartment={apartment}
        mode="edit"
      />
    </div>
  );
}
