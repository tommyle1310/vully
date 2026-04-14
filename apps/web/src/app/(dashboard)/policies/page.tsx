'use client';

import { motion } from 'framer-motion';
import {
  Building2,
  Dog,
  Clock,
  Car,
  CreditCard,
  Phone,
  Package,
  Trash2,
  Dumbbell,
  Waves,
  Users,
  Hammer,
  Key,
  Trophy,
  AlertCircle,
  CheckCircle2,
  XCircle,
  CalendarDays,
  Info,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useMyBuildingPolicies, ExtendedBuildingPolicy } from '@/hooks/use-building-policies';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

// --- Components ---

function StatusBadge({ value, trueText = 'Yes', falseText = 'No' }: { value: boolean; trueText?: string; falseText?: string }) {
  return value ? (
    <Badge variant="default" className="gap-1">
      <CheckCircle2 className="h-3 w-3" />
      {trueText}
    </Badge>
  ) : (
    <Badge variant="secondary" className="gap-1">
      <XCircle className="h-3 w-3" />
      {falseText}
    </Badge>
  );
}

function SectionHeader({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description?: string }) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="rounded-lg bg-primary/10 p-2">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <h3 className="font-semibold text-lg">{title}</h3>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
    </div>
  );
}

function PolicyTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableBody>{children}</TableBody>
      </Table>
    </div>
  );
}

function PolicyRow({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <TableRow className={cn('hover:bg-muted/50', className)}>
      <TableCell className="font-medium text-muted-foreground w-1/3">{label}</TableCell>
      <TableCell>{value ?? <span className="text-muted-foreground italic">Not specified</span>}</TableCell>
    </TableRow>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-8 text-muted-foreground">
      <Info className="h-4 w-4 mr-2" />
      {message}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-6 w-48" />
      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-lg" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Tab Content Components ---

function OccupancyTab({ policy }: { policy: ExtendedBuildingPolicy }) {
  return (
    <div className="space-y-6">
      <div>
        <SectionHeader icon={Users} title="Occupancy Limits" description="Maximum residents and access cards per apartment" />
        <PolicyTable>
          <PolicyRow 
            label="Default Max Residents" 
            value={policy.defaultMaxResidents ?? 'Calculated by area (25m² per person)'} 
          />
          <PolicyRow 
            label="Access Card Limit" 
            value={`${policy.accessCardLimitDefault} cards per apartment`} 
          />
        </PolicyTable>
      </div>

      <Separator />

      <div>
        <SectionHeader icon={Dog} title="Pet Policy" description="Rules for keeping pets in the building" />
        <PolicyTable>
          <PolicyRow 
            label="Pets Allowed" 
            value={<StatusBadge value={policy.petAllowed} />} 
          />
          {policy.petAllowed && (
            <>
              <PolicyRow 
                label="Pet Limit" 
                value={`${policy.petLimitDefault} pets per apartment`} 
              />
              <PolicyRow 
                label="Pet Rules" 
                value={policy.petRules} 
              />
            </>
          )}
        </PolicyTable>
      </div>

      <Separator />

      <div>
        <SectionHeader icon={Users} title="Guest & Visitor Rules" description="Guidelines for hosting guests" />
        <PolicyTable>
          <PolicyRow 
            label="Guest Registration" 
            value={<StatusBadge value={policy.guestRegistrationRequired} trueText="Required" falseText="Not required" />} 
          />
          <PolicyRow 
            label="Visitor Hours" 
            value={policy.visitorHours} 
          />
          <PolicyRow 
            label="Guest Parking Rules" 
            value={policy.guestParkingRules} 
          />
        </PolicyTable>
      </div>
    </div>
  );
}

function AmenitiesTab({ policy }: { policy: ExtendedBuildingPolicy }) {
  return (
    <div className="space-y-6">
      <div>
        <SectionHeader icon={Waves} title="Swimming Pool" description="Pool access and operating hours" />
        {policy.poolAvailable ? (
          <PolicyTable>
            <PolicyRow 
              label="Status" 
              value={<StatusBadge value={true} trueText="Available" />} 
            />
            <PolicyRow label="Operating Hours" value={policy.poolHours} />
            <PolicyRow 
              label="Monthly Fee" 
              value={policy.poolFeePerMonth ? formatCurrency(policy.poolFeePerMonth) : 'Free'} 
            />
          </PolicyTable>
        ) : (
          <EmptyState message="Pool not available at this building" />
        )}
      </div>

      <Separator />

      <div>
        <SectionHeader icon={Dumbbell} title="Fitness Center" description="Gym access and booking requirements" />
        {policy.gymAvailable ? (
          <PolicyTable>
            <PolicyRow 
              label="Status" 
              value={<StatusBadge value={true} trueText="Available" />} 
            />
            <PolicyRow label="Operating Hours" value={policy.gymHours} />
            <PolicyRow 
              label="Booking Required" 
              value={<StatusBadge value={policy.gymBookingRequired} trueText="Required" falseText="Walk-in allowed" />} 
            />
            <PolicyRow 
              label="Monthly Fee" 
              value={policy.gymFeePerMonth ? formatCurrency(policy.gymFeePerMonth) : 'Free'} 
            />
          </PolicyTable>
        ) : (
          <EmptyState message="Gym not available at this building" />
        )}
      </div>

      <Separator />

      <div>
        <SectionHeader icon={Trophy} title="Sports Courts" description="Tennis, basketball, and other sports facilities" />
        {policy.sportsCourtAvailable ? (
          <PolicyTable>
            <PolicyRow 
              label="Status" 
              value={<StatusBadge value={true} trueText="Available" />} 
            />
            <PolicyRow label="Operating Hours" value={policy.sportsCourtHours} />
            <PolicyRow label="Booking Rules" value={policy.sportsCourtBookingRules} />
          </PolicyTable>
        ) : (
          <EmptyState message="Sports courts not available at this building" />
        )}
      </div>
    </div>
  );
}

function BillingTab({ policy }: { policy: ExtendedBuildingPolicy }) {
  return (
    <div className="space-y-6">
      <div>
        <SectionHeader icon={CreditCard} title="Payment Schedule" description="Billing cycle and due dates" />
        <PolicyTable>
          <PolicyRow 
            label="Billing Cycle" 
            value={<Badge variant="outline" className="capitalize">{policy.defaultBillingCycle}</Badge>} 
          />
          <PolicyRow 
            label="Payment Due Day" 
            value={`Day ${policy.paymentDueDay} of each month`} 
          />
          <PolicyRow 
            label="Late Fee Rate" 
            value={policy.lateFeeRatePercent ? `${policy.lateFeeRatePercent}% of overdue amount` : 'No late fee'} 
          />
          <PolicyRow 
            label="Grace Period" 
            value={`${policy.lateFeeGraceDays} days after due date`} 
          />
        </PolicyTable>
      </div>

      <Separator />

      <div>
        <SectionHeader icon={Car} title="Parking Fees" description="Monthly parking rates" />
        <PolicyTable>
          <PolicyRow 
            label="Car Parking" 
            value={policy.carParkingFee ? `${formatCurrency(policy.carParkingFee)}/month` : 'Not specified'} 
          />
          <PolicyRow 
            label="Motorcycle Parking" 
            value={policy.motorcycleParkingFee ? `${formatCurrency(policy.motorcycleParkingFee)}/month` : 'Not specified'} 
          />
        </PolicyTable>
      </div>

      <Separator />

      <div>
        <SectionHeader icon={Trash2} title="Trash Collection" description="Waste disposal schedule and fees" />
        <PolicyTable>
          <PolicyRow 
            label="Collection Days" 
            value={policy.trashCollectionDays?.length 
              ? policy.trashCollectionDays.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ') 
              : null
            } 
          />
          <PolicyRow label="Collection Time" value={policy.trashCollectionTime} />
          <PolicyRow 
            label="Monthly Fee" 
            value={policy.trashFeePerMonth ? formatCurrency(policy.trashFeePerMonth) : 'Included in management fee'} 
          />
        </PolicyTable>
      </div>

      <Separator />

      <div>
        <SectionHeader icon={Key} title="Access Cards" description="Card limits and replacement fees" />
        <PolicyTable>
          <PolicyRow label="Cards per Apartment" value={policy.accessCardLimitDefault} />
          <PolicyRow 
            label="Replacement Fee" 
            value={policy.accessCardReplacementFee ? formatCurrency(policy.accessCardReplacementFee) : 'Free'} 
          />
          <PolicyRow label="Replacement Process" value={policy.accessCardReplacementProcess} />
        </PolicyTable>
      </div>
    </div>
  );
}

function RulesTab({ policy }: { policy: ExtendedBuildingPolicy }) {
  return (
    <div className="space-y-6">
      <div>
        <SectionHeader icon={Clock} title="Quiet Hours" description="Noise reduction periods" />
        <PolicyTable>
          <PolicyRow 
            label="Quiet Hours" 
            value={policy.quietHoursStart && policy.quietHoursEnd 
              ? `${policy.quietHoursStart} - ${policy.quietHoursEnd}` 
              : null
            } 
          />
          <PolicyRow label="Noise Complaint Process" value={policy.noiseComplaintProcess} />
        </PolicyTable>
      </div>

      <Separator />

      <div>
        <SectionHeader icon={Hammer} title="Renovation Rules" description="Guidelines for apartment modifications" />
        <PolicyTable>
          <PolicyRow 
            label="Approval Required" 
            value={<StatusBadge value={policy.renovationApprovalRequired} trueText="Required" falseText="Not required" />} 
          />
          <PolicyRow label="Allowed Hours" value={policy.renovationAllowedHours} />
          <PolicyRow 
            label="Deposit" 
            value={policy.renovationDeposit ? formatCurrency(policy.renovationDeposit) : 'No deposit'} 
          />
          <PolicyRow label="Approval Process" value={policy.renovationApprovalProcess} />
        </PolicyTable>
      </div>

      <Separator />

      <div>
        <SectionHeader icon={Building2} title="Move In/Out" description="Moving guidelines and elevator booking" />
        <PolicyTable>
          <PolicyRow label="Allowed Hours" value={policy.moveAllowedHours} />
          <PolicyRow 
            label="Elevator Booking" 
            value={<StatusBadge value={policy.moveElevatorBookingRequired} trueText="Required" falseText="Not required" />} 
          />
          <PolicyRow 
            label="Moving Deposit" 
            value={policy.moveDeposit ? formatCurrency(policy.moveDeposit) : 'No deposit'} 
          />
        </PolicyTable>
      </div>

      <Separator />

      <div>
        <SectionHeader icon={Package} title="Package Delivery" description="Package pickup and holding policy" />
        <PolicyTable>
          <PolicyRow label="Pickup Location" value={policy.packagePickupLocation} />
          <PolicyRow label="Pickup Hours" value={policy.packagePickupHours} />
          <PolicyRow label="Holding Period" value={`${policy.packageHoldingDays} days before return to sender`} />
        </PolicyTable>
      </div>
    </div>
  );
}

function ContactsTab({ policy }: { policy: ExtendedBuildingPolicy }) {
  return (
    <div className="space-y-6">
      <div>
        <SectionHeader icon={Phone} title="Emergency Contacts" description="Important numbers for emergencies" />
        {policy.emergencyContacts && policy.emergencyContacts.length > 0 ? (
          <div className="rounded-lg border bg-card divide-y">
            {policy.emergencyContacts.map((contact, idx) => (
              <div key={idx} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{contact.name}</p>
                  <p className="text-sm text-muted-foreground">{contact.role}</p>
                </div>
                <a 
                  href={`tel:${contact.phone}`} 
                  className="text-primary hover:underline font-mono"
                >
                  {contact.phone}
                </a>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState message="No emergency contacts configured" />
        )}
      </div>

      <Separator />

      <div>
        <SectionHeader icon={Building2} title="Management Office" description="Office hours and security contact" />
        <PolicyTable>
          <PolicyRow label="Office Hours" value={policy.managementOfficeHours} />
          <PolicyRow 
            label="24h Security Phone" 
            value={policy.security24hPhone ? (
              <a href={`tel:${policy.security24hPhone}`} className="text-primary hover:underline font-mono">
                {policy.security24hPhone}
              </a>
            ) : null} 
          />
        </PolicyTable>
      </div>
    </div>
  );
}

// --- Main Page ---

export default function PoliciesPage() {
  const { data, isLoading, error } = useMyBuildingPolicies();

  if (isLoading) {
    return (
      <div className="p-6">
        <LoadingSkeleton />
      </div>
    );
  }

  if (error || !data?.data) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Policies</AlertTitle>
          <AlertDescription>
            Unable to load building policies. Please try again later or contact support.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { buildingName, policy } = data.data;

  if (!policy) {
    return (
      <div className="p-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>No Policies Found</AlertTitle>
          <AlertDescription>
            No policies have been configured for your building yet. Please contact management.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <motion.div
      className="p-6 space-y-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-primary/10 p-3">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{buildingName}</h1>
            <p className="text-muted-foreground">Building Policies & Regulations</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="h-4 w-4" />
          <span>Effective from {new Date(policy.effectiveFrom).toLocaleDateString('vi-VN')}</span>
          <Badge variant="outline" className="ml-2">Current</Badge>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="occupancy" className="w-full">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="occupancy" className="gap-2">
            <Users className="h-4 w-4 hidden sm:inline" />
            Occupancy
          </TabsTrigger>
          <TabsTrigger value="amenities" className="gap-2">
            <Dumbbell className="h-4 w-4 hidden sm:inline" />
            Amenities
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-2">
            <CreditCard className="h-4 w-4 hidden sm:inline" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-2">
            <Clock className="h-4 w-4 hidden sm:inline" />
            Rules
          </TabsTrigger>
          <TabsTrigger value="contacts" className="gap-2">
            <Phone className="h-4 w-4 hidden sm:inline" />
            Contacts
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="occupancy" className="mt-0">
            <OccupancyTab policy={policy} />
          </TabsContent>
          <TabsContent value="amenities" className="mt-0">
            <AmenitiesTab policy={policy} />
          </TabsContent>
          <TabsContent value="billing" className="mt-0">
            <BillingTab policy={policy} />
          </TabsContent>
          <TabsContent value="rules" className="mt-0">
            <RulesTab policy={policy} />
          </TabsContent>
          <TabsContent value="contacts" className="mt-0">
            <ContactsTab policy={policy} />
          </TabsContent>
        </div>
      </Tabs>
    </motion.div>
  );
}
