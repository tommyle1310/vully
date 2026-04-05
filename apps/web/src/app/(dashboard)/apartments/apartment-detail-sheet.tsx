'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
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
  FileText,
  Banknote,
  Receipt,
  TrendingUp,
  Clock,
  Home,
  Key,
  ExternalLink,
} from 'lucide-react';
import { Apartment, useUpdateApartmentStatus } from '@/hooks/use-apartments';
import { useContracts } from '@/hooks/use-contracts';
import { useAuthStore } from '@/stores/authStore';
import { Badge, DotBadge } from '@/components/ui/badge';
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
  onEdit?: (apartments: Apartment) => void;
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

// Helper to provide clear billing cycle descriptions (for SERVICE FEES only)
const BILLING_CYCLE_DESCRIPTIONS: Record<string, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

function getBillingCycleDescription(cycle: string): string {
  return BILLING_CYCLE_DESCRIPTIONS[cycle] || cycle.charAt(0).toUpperCase() + cycle.slice(1);
}

// Helper to parse contract type from termsNotes
function getContractType(termsNotes?: string): 'rental' | 'purchase' | 'lease_to_own' {
  if (!termsNotes) return 'rental';
  if (termsNotes.includes('[Contract Type: Purchase]')) return 'purchase';
  if (termsNotes.includes('[Contract Type: Lease to Own]')) return 'lease_to_own';
  return 'rental';
}

// Helper to parse financial details from termsNotes
interface ParsedContractDetails {
  purchasePrice?: number;
  downPayment?: number;
  transferDate?: string;
  paymentSchedule?: string;
  optionFee?: number;
  purchaseOptionPrice?: number;
  optionPeriodMonths?: number;
  rentCreditPercent?: number;
  paymentDueDay?: number;
}

function parseContractDetails(termsNotes?: string): ParsedContractDetails {
  const details: ParsedContractDetails = {};
  if (!termsNotes) return details;

  // Parse Vietnamese number format (1.000.000) or standard format
  const parseVndAmount = (str: string): number | undefined => {
    const cleaned = str.replace(/\s*VND\s*/gi, '').trim();
    if (cleaned.includes('.') && !cleaned.includes(',')) {
      const num = parseInt(cleaned.replace(/\./g, ''), 10);
      return isNaN(num) ? undefined : num;
    }
    const num = parseInt(cleaned.replace(/,/g, ''), 10);
    return isNaN(num) ? undefined : num;
  };

  const purchasePriceMatch = termsNotes.match(/Purchase Price:\s*([\d.,]+)\s*VND/i);
  if (purchasePriceMatch) details.purchasePrice = parseVndAmount(purchasePriceMatch[1]);

  const downPaymentMatch = termsNotes.match(/Down Payment:\s*([\d.,]+)\s*VND/i);
  if (downPaymentMatch) details.downPayment = parseVndAmount(downPaymentMatch[1]);

  const transferDateMatch = termsNotes.match(/Transfer Date:\s*(\d{4}-\d{2}-\d{2})/i);
  if (transferDateMatch) details.transferDate = transferDateMatch[1];

  const paymentScheduleMatch = termsNotes.match(/Payment Schedule:\s*(.+?)(?:\n|$)/i);
  if (paymentScheduleMatch) details.paymentSchedule = paymentScheduleMatch[1].trim();

  const optionFeeMatch = termsNotes.match(/Option Fee:\s*([\d.,]+)\s*VND/i);
  if (optionFeeMatch) details.optionFee = parseVndAmount(optionFeeMatch[1]);

  const purchaseOptionPriceMatch = termsNotes.match(/Purchase Option Price:\s*([\d.,]+)\s*VND/i);
  if (purchaseOptionPriceMatch) details.purchaseOptionPrice = parseVndAmount(purchaseOptionPriceMatch[1]);

  const optionPeriodMatch = termsNotes.match(/Option Period:\s*(\d+)\s*months/i);
  if (optionPeriodMatch) details.optionPeriodMonths = parseInt(optionPeriodMatch[1], 10);

  const rentCreditMatch = termsNotes.match(/Rent Credit:\s*(\d+)%/i);
  if (rentCreditMatch) details.rentCreditPercent = parseInt(rentCreditMatch[1], 10);

  const paymentDueDayMatch = termsNotes.match(/Payment Due:\s*Day\s*(\d+)/i);
  if (paymentDueDayMatch) details.paymentDueDay = parseInt(paymentDueDayMatch[1], 10);

  return details;
}

function DetailRow({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: React.ComponentType<{ className?: string }> }) {
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
  const { hasAnyRole } = useAuthStore();
  const isAdmin = hasAnyRole(['admin', 'technician']);
  const { toast } = useToast();
  const updateStatus = useUpdateApartmentStatus();

  // Fetch active contract for this apartment
  const { data: contractsData } = useContracts(
    apartment ? { apartmentId: apartment.id, status: 'active', limit: 1 } : {},
  );
  const activeContract = contractsData?.data?.[0];

  if (!apartment) return null;

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
            {apartment.apartmentCode || `Unit ${apartment.unit_number}`}
             <DotBadge color={apartment.status === 'vacant' ? 'green' : apartment.status === 'occupied' ? 'blue' : apartment.status === 'maintenance' ? 'amber' : 'gray'} className="text-sm">
                {apartment.status.charAt(0).toUpperCase() + apartment.status.slice(1).toLowerCase()}
              </DotBadge>
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
              <Button variant="outline" size="sm" asChild>
                <Link href={`/apartments/${apartment.id}`}>
                  <ExternalLink className="h-3.5 w-3.5 mr-1" />
                  View Details
                </Link>
              </Button>
             
              {apartment.isRented && activeContract && (
                <Badge variant="secondary" className="text-sm">
                  {(() => {
                    const contractType = getContractType(activeContract.termsNotes);
                    if (contractType === 'purchase') return 'Under Purchase';
                    if (contractType === 'lease_to_own') return 'Lease to Own';
                    return 'Rented';
                  })()}
                </Badge>
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
                    {activeContract?.numberOfResidents ?? apartment.currentResidentCount}
                    {apartment.maxResidents ? ` / ${apartment.maxResidents}` : ''}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Active Contract */}
          {activeContract && (() => {
            const contractType = getContractType(activeContract.termsNotes);
            const details = parseContractDetails(activeContract.termsNotes);
            const remainingBalance = details.purchasePrice && details.downPayment 
              ? details.purchasePrice - details.downPayment 
              : undefined;
            const paidPercent = details.purchasePrice && details.downPayment
              ? ((details.downPayment / details.purchasePrice) * 100).toFixed(1)
              : undefined;

            return (
              <div className="space-y-1">
                <SectionHeader title="Active Contract" />
                <Card className="mt-2">
                  <CardContent className="p-4 space-y-3">
                    {/* Contract Type & Basic Info */}
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5" />
                        Type
                      </span>
                      <Badge variant={contractType === 'purchase' ? 'default' : contractType === 'lease_to_own' ? 'secondary' : 'outline'}>
                        {contractType === 'purchase' ? 'Purchase' : contractType === 'lease_to_own' ? 'Lease to Own' : 'Rental'}
                      </Badge>
                    </div>
                    
                    {/* Dates */}
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5" />
                        Contract Date
                      </span>
                      <span className="text-sm font-medium">
                        {new Date(activeContract.start_date).toLocaleDateString()}
                        {activeContract.endDate && ` - ${new Date(activeContract.endDate).toLocaleDateString()}`}
                      </span>
                    </div>

                    {/* Party Info */}
                    {activeContract.tenant && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground flex items-center gap-2">
                          <User className="h-3.5 w-3.5" />
                          {contractType === 'purchase' ? 'Buyer' : contractType === 'lease_to_own' ? 'Lessee/Buyer' : 'Tenant'}
                        </span>
                        <span className="text-sm font-medium">
                          {activeContract.tenant.firstName} {activeContract.tenant.lastName}
                        </span>
                      </div>
                    )}

                    {activeContract.citizenId && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground flex items-center gap-2">
                          <User className="h-3.5 w-3.5" />
                          Citizen ID
                        </span>
                        <span className="text-sm font-medium font-mono">{activeContract.citizenId}</span>
                      </div>
                    )}

                    {activeContract.numberOfResidents != null && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground flex items-center gap-2">
                          <Users className="h-3.5 w-3.5" />
                          Registered Residents
                        </span>
                        <span className="text-sm font-medium">{activeContract.numberOfResidents}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Purchase Contract Financial Info */}
                {contractType === 'purchase' && details.purchasePrice && (
                  <Card className="mt-2 border-primary/20 bg-primary/5">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                        <Banknote className="h-4 w-4" />
                        Purchase Financial Summary
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Total Purchase Price</span>
                        <span className="text-sm font-semibold">{details.purchasePrice.toLocaleString()} VND</span>
                      </div>
                      
                      {details.downPayment && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Down Payment</span>
                          <span className="text-sm font-medium text-green-600">
                            {details.downPayment.toLocaleString()} VND
                            {paidPercent && <span className="text-xs ml-1">({paidPercent}%)</span>}
                          </span>
                        </div>
                      )}
                      
                      {remainingBalance != null && remainingBalance > 0 && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Remaining Balance</span>
                          <span className="text-sm font-medium text-orange-600">{remainingBalance.toLocaleString()} VND</span>
                        </div>
                      )}

                      {details.transferDate && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground flex items-center gap-2">
                            <Home className="h-3.5 w-3.5" />
                            Ownership Transfer
                          </span>
                          <span className="text-sm font-medium">{details.transferDate}</span>
                        </div>
                      )}

                      {details.paymentSchedule && (
                        <div className="pt-2 border-t">
                          <span className="text-xs text-muted-foreground">Payment Schedule:</span>
                          <p className="text-sm mt-1">{details.paymentSchedule}</p>
                        </div>
                      )}

                      {/* Note about payment tracking */}
                      <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground italic">
                          Note: Detailed payment milestones and tracking coming soon. 
                          Purchase payments are typically milestone-based (not monthly).
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Rental Contract Financial Info */}
                {contractType === 'rental' && activeContract.rentAmount > 0 && (
                  <Card className="mt-2 border-blue-500/20 bg-blue-500/5">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-blue-600">
                        <Key className="h-4 w-4" />
                        Rental Payment Info
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Monthly Rent</span>
                        <span className="text-sm font-semibold">{activeContract.rentAmount.toLocaleString()} VND/month</span>
                      </div>

                      {details.paymentDueDay && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5" />
                            Payment Due
                          </span>
                          <span className="text-sm font-medium">Day {details.paymentDueDay} of each month</span>
                        </div>
                      )}

                      {activeContract.depositAmount != null && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Security Deposit</span>
                          <span className="text-sm font-medium">{activeContract.depositAmount.toLocaleString()} VND</span>
                        </div>
                      )}

                      {activeContract.depositMonths > 0 && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Deposit Months</span>
                          <span className="text-sm font-medium">{activeContract.depositMonths} months</span>
                        </div>
                      )}

                      {/* Note about payment tracking */}
                      <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground italic">
                          Note: Monthly payment tracking and history coming soon.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Lease-to-Own Contract Financial Info */}
                {contractType === 'lease_to_own' && (
                  <Card className="mt-2 border-purple-500/20 bg-purple-500/5">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-purple-600">
                        <TrendingUp className="h-4 w-4" />
                        Lease-to-Own Terms
                      </div>

                      {activeContract.rentAmount > 0 && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Monthly Rent</span>
                          <span className="text-sm font-semibold">{activeContract.rentAmount.toLocaleString()} VND/month</span>
                        </div>
                      )}

                      {details.optionFee && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Option Fee (non-refundable)</span>
                          <span className="text-sm font-medium">{details.optionFee.toLocaleString()} VND</span>
                        </div>
                      )}

                      {details.purchaseOptionPrice && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Purchase Option Price</span>
                          <span className="text-sm font-semibold">{details.purchaseOptionPrice.toLocaleString()} VND</span>
                        </div>
                      )}

                      {details.optionPeriodMonths && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Option Period</span>
                          <span className="text-sm font-medium">{details.optionPeriodMonths} months</span>
                        </div>
                      )}

                      {details.rentCreditPercent && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Rent Credit toward Purchase</span>
                          <span className="text-sm font-medium text-green-600">{details.rentCreditPercent}%</span>
                        </div>
                      )}

                      {activeContract.depositAmount != null && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Security Deposit</span>
                          <span className="text-sm font-medium">{activeContract.depositAmount.toLocaleString()} VND</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            );
          })()}

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
            <p>Created: {new Date(apartment.created_at).toLocaleDateString()}</p>
            <p>Updated: {new Date(apartment.updatedAt).toLocaleDateString()}</p>
          </div>
        </motion.div>
      </SheetContent>
    </Sheet>
  );
}
