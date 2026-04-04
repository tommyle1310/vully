'use client';

import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Loader2, Zap, Droplets, Flame, ExternalLink, Car, Info, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import {
  Apartment,
  CreateApartmentInput,
  UpdateApartmentInput,
  useCreateApartment,
  useUpdateApartment,
  useApartmentEffectiveConfig,
  useApartmentParkingSlots,
} from '@/hooks/use-apartments';
import { useBuildings } from '@/hooks/use-buildings';
import { useUtilityTypes } from '@/hooks/use-billing';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ParkingAssignmentDialog } from '@/components/apartments';

const UNIT_TYPES = ['studio', 'one_bedroom', 'two_bedroom', 'three_bedroom', 'duplex', 'penthouse', 'shophouse'] as const;
const ORIENTATIONS = ['north', 'south', 'east', 'west', 'northeast', 'northwest', 'southeast', 'southwest'] as const;
const OWNERSHIP_TYPES = ['permanent', 'fifty_year', 'leasehold'] as const;
const BILLING_CYCLES = ['monthly', 'quarterly', 'yearly'] as const;
const SYNC_STATUSES = ['synced', 'pending', 'error', 'disconnected'] as const;

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
  north: 'North', south: 'South', east: 'East', west: 'West',
  northeast: 'Northeast', northwest: 'Northwest', southeast: 'Southeast', southwest: 'Southwest',
};

// Preprocess helpers: convert empty strings to undefined before number coercion
const optNum = (min = 0) =>
  z.preprocess((v) => (v === '' || v == null ? undefined : v), z.coerce.number().min(min).optional());
const optInt = (min = 0) =>
  z.preprocess((v) => (v === '' || v == null ? undefined : v), z.coerce.number().int().min(min).optional());

const apartmentFormSchema = z.object({
  // Spatial (building-managed)
  buildingId: z.string().uuid('Please select a building'),
  unit_number: z.string().min(1, 'Unit number is required').max(20),
  floorIndex: z.coerce.number().int().min(0, 'Floor must be 0 or higher'),
  // Spatial (apartment-specific)
  apartmentCode: z.string().max(30).optional().or(z.literal('')),
  floorLabel: z.string().max(10).optional().or(z.literal('')),
  unitType: z.enum(UNIT_TYPES).optional(),
  netArea: optNum(),
  grossArea: optNum(),
  ceilingHeight: optNum(),
  bedroomCount: z.coerce.number().int().min(0).optional(),
  bathroomCount: z.coerce.number().int().min(0).optional(),
  orientation: z.enum(ORIENTATIONS).optional(),
  balconyDirection: z.enum(ORIENTATIONS).optional(),
  isCornerUnit: z.boolean().optional(),
  status: z.enum(['vacant', 'occupied', 'maintenance', 'reserved']).optional(),
  // Ownership & Legal
  ownershipType: z.enum(OWNERSHIP_TYPES).optional(),
  handoverDate: z.string().optional().or(z.literal('')),
  warrantyExpiryDate: z.string().optional().or(z.literal('')),
  isRented: z.boolean().optional(),
  vatRate: optNum(),
  // Occupancy
  maxResidents: optInt(),
  currentResidentCount: z.coerce.number().int().min(0).optional(),
  petAllowed: z.boolean().optional(),
  petLimit: optInt(),
  accessCardLimit: optInt(),
  intercomCode: z.string().max(20).optional().or(z.literal('')),
  // Utility & Technical
  electricMeterId: z.string().max(50).optional().or(z.literal('')),
  waterMeterId: z.string().max(50).optional().or(z.literal('')),
  gasMeterId: z.string().max(50).optional().or(z.literal('')),
  powerCapacity: optInt(),
  acUnitCount: optInt(),
  fireDetectorId: z.string().max(50).optional().or(z.literal('')),
  sprinklerCount: optInt(),
  internetTerminalLoc: z.string().max(255).optional().or(z.literal('')),
  // Parking & Assets
  assignedCarSlot: z.string().max(30).optional().or(z.literal('')),
  assignedMotoSlot: z.string().max(30).optional().or(z.literal('')),
  mailboxNumber: z.string().max(20).optional().or(z.literal('')),
  storageUnitId: z.string().max(30).optional().or(z.literal('')),
  // Billing Config
  billingStartDate: z.string().optional().or(z.literal('')),
  billingCycle: z.enum(BILLING_CYCLES).optional(),
  bankAccountVirtual: z.string().max(30).optional().or(z.literal('')),
  lateFeeWaived: z.boolean().optional(),
  // System Logic
  isMerged: z.boolean().optional(),
  syncStatus: z.enum(SYNC_STATUSES).optional(),
  portalAccessEnabled: z.boolean().optional(),
  notesAdmin: z.string().optional().or(z.literal('')),
  // Override toggles (for policy inheritance)
  maxResidentsOverride: z.boolean().optional(),
  accessCardLimitOverride: z.boolean().optional(),
  petAllowedOverride: z.boolean().optional(),
  billingCycleOverride: z.boolean().optional(),
});

type ApartmentFormValues = z.infer<typeof apartmentFormSchema>;

interface ApartmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apartment?: Apartment | null;
  mode: 'create' | 'edit';
}

function toFormValue(v: unknown): string {
  if (v == null) return '';
  return String(v);
}

export function ApartmentFormDialog({
  open,
  onOpenChange,
  apartment,
  mode,
}: ApartmentFormDialogProps) {
  const { toast } = useToast();
  const { data: buildingsData, isLoading: buildingsLoading } = useBuildings();
  const { data: utilityTypesData, isLoading: utilityTypesLoading } = useUtilityTypes();
  const createApartment = useCreateApartment();
  const updateApartment = useUpdateApartment();

  // Fetch effective config for policy inheritance (only when editing)
  const { data: effectiveConfigData, isLoading: configLoading } = useApartmentEffectiveConfig(
    apartment?.id || ''
  );
  const effectiveConfig = effectiveConfigData?.data;

  // Fetch parking slots for the apartment
  const { data: parkingSlotsData, refetch: refetchParkingSlots } = useApartmentParkingSlots(apartment?.id || '');
  const parkingSlots = parkingSlotsData?.data || [];

  // Parking dialog state
  const [parkingDialogOpen, setParkingDialogOpen] = useState(false);

  // Get apartment and building IDs for parking dialog
  const apartmentId = apartment?.id;
  const buildingId = apartment?.buildingId;

  const isEditing = mode === 'edit';
  const isLoading = createApartment.isPending || updateApartment.isPending;
  const buildings = buildingsData?.data || [];
  const utilityTypes = utilityTypesData?.data || [];
  const activeUtilityTypes = utilityTypes.filter((ut) => ut.isActive);

  const form = useForm<ApartmentFormValues>({
    resolver: zodResolver(apartmentFormSchema),
    defaultValues: {
      buildingId: '',
      unit_number: '',
      floorIndex: 1,
      apartmentCode: '',
      floorLabel: '',
      unitType: undefined,
      netArea: undefined,
      grossArea: undefined,
      ceilingHeight: undefined,
      bedroomCount: 1,
      bathroomCount: 1,
      orientation: undefined,
      balconyDirection: undefined,
      isCornerUnit: false,
      status: 'vacant',
      ownershipType: undefined,
      handoverDate: '',
      warrantyExpiryDate: '',
      isRented: false,
      vatRate: undefined,
      maxResidents: undefined,
      currentResidentCount: 0,
      petAllowed: false,
      petLimit: undefined,
      accessCardLimit: undefined,
      intercomCode: '',
      electricMeterId: '',
      waterMeterId: '',
      gasMeterId: '',
      powerCapacity: undefined,
      acUnitCount: undefined,
      fireDetectorId: '',
      sprinklerCount: undefined,
      internetTerminalLoc: '',
      assignedCarSlot: '',
      assignedMotoSlot: '',
      mailboxNumber: '',
      storageUnitId: '',
      billingStartDate: '',
      billingCycle: 'monthly',
      bankAccountVirtual: '',
      lateFeeWaived: false,
      isMerged: false,
      syncStatus: 'disconnected',
      portalAccessEnabled: true,
      notesAdmin: '',
      // Override flags
      maxResidentsOverride: false,
      accessCardLimitOverride: false,
      petAllowedOverride: false,
      billingCycleOverride: false,
    },
  });

  useEffect(() => {
    if (open) {
      if (isEditing && apartment) {
        // Determine override flags based on effective config
        const hasMaxResidentsOverride = effectiveConfig?.maxResidents?.source === 'apartment';
        const hasAccessCardOverride = effectiveConfig?.accessCardLimit?.source === 'apartment';
        const hasPetOverride = effectiveConfig?.petAllowed?.source === 'apartment';
        const hasBillingCycleOverride = effectiveConfig?.billingCycle?.source === 'apartment';

        form.reset({
          buildingId: apartment.buildingId,
          unit_number: apartment.unit_number,
          floorIndex: apartment.floorIndex,
          apartmentCode: toFormValue(apartment.apartmentCode),
          floorLabel: toFormValue(apartment.floorLabel),
          unitType: (apartment.unitType as typeof UNIT_TYPES[number]) || undefined,
          netArea: apartment.netArea ?? undefined,
          grossArea: apartment.grossArea ?? undefined,
          ceilingHeight: apartment.ceilingHeight ?? undefined,
          bedroomCount: apartment.bedroomCount,
          bathroomCount: apartment.bathroomCount,
          orientation: (apartment.orientation as typeof ORIENTATIONS[number]) || undefined,
          balconyDirection: (apartment.balconyDirection as typeof ORIENTATIONS[number]) || undefined,
          isCornerUnit: apartment.isCornerUnit ?? false,
          status: apartment.status,
          ownershipType: (apartment.ownershipType as typeof OWNERSHIP_TYPES[number]) || undefined,
          handoverDate: toFormValue(apartment.handoverDate),
          warrantyExpiryDate: toFormValue(apartment.warrantyExpiryDate),
          isRented: apartment.isRented ?? false,
          vatRate: apartment.vatRate ?? undefined,
          maxResidents: apartment.maxResidents ?? undefined,
          currentResidentCount: apartment.currentResidentCount ?? 0,
          petAllowed: apartment.petAllowed ?? false,
          petLimit: apartment.petLimit ?? undefined,
          accessCardLimit: apartment.accessCardLimit ?? undefined,
          intercomCode: toFormValue(apartment.intercomCode),
          electricMeterId: toFormValue(apartment.electricMeterId),
          waterMeterId: toFormValue(apartment.waterMeterId),
          gasMeterId: toFormValue(apartment.gasMeterId),
          powerCapacity: apartment.powerCapacity ?? undefined,
          acUnitCount: apartment.acUnitCount ?? undefined,
          fireDetectorId: toFormValue(apartment.fireDetectorId),
          sprinklerCount: apartment.sprinklerCount ?? undefined,
          internetTerminalLoc: toFormValue(apartment.internetTerminalLoc),
          assignedCarSlot: toFormValue(apartment.assignedCarSlot),
          assignedMotoSlot: toFormValue(apartment.assignedMotoSlot),
          mailboxNumber: toFormValue(apartment.mailboxNumber),
          storageUnitId: toFormValue(apartment.storageUnitId),
          billingStartDate: toFormValue(apartment.billingStartDate),
          billingCycle: (apartment.billingCycle || 'monthly') as typeof BILLING_CYCLES[number],
          bankAccountVirtual: toFormValue(apartment.bankAccountVirtual),
          lateFeeWaived: apartment.lateFeeWaived ?? false,
          isMerged: apartment.isMerged ?? false,
          syncStatus: (apartment.syncStatus || 'disconnected') as typeof SYNC_STATUSES[number],
          portalAccessEnabled: apartment.portalAccessEnabled ?? true,
          notesAdmin: toFormValue(apartment.notesAdmin),
          // Override flags based on effective config
          maxResidentsOverride: hasMaxResidentsOverride,
          accessCardLimitOverride: hasAccessCardOverride,
          petAllowedOverride: hasPetOverride,
          billingCycleOverride: hasBillingCycleOverride,
        } as ApartmentFormValues);
      } else {
        form.reset({
          buildingId: '',
          unit_number: '',
          floorIndex: 1,
          apartmentCode: '',
          floorLabel: '',
          unitType: undefined,
          netArea: undefined,
          grossArea: undefined,
          ceilingHeight: undefined,
          bedroomCount: 1,
          bathroomCount: 1,
          orientation: undefined,
          balconyDirection: undefined,
          isCornerUnit: false,
          status: 'vacant',
          ownershipType: undefined,
          handoverDate: '',
          warrantyExpiryDate: '',
          isRented: false,
          vatRate: undefined,
          maxResidents: undefined,
          currentResidentCount: 0,
          petAllowed: false,
          petLimit: undefined,
          accessCardLimit: undefined,
          intercomCode: '',
          electricMeterId: '',
          waterMeterId: '',
          gasMeterId: '',
          powerCapacity: undefined,
          acUnitCount: undefined,
          fireDetectorId: '',
          sprinklerCount: undefined,
          internetTerminalLoc: '',
          assignedCarSlot: '',
          assignedMotoSlot: '',
          mailboxNumber: '',
          storageUnitId: '',
          billingStartDate: '',
          billingCycle: 'monthly',
          bankAccountVirtual: '',
          lateFeeWaived: false,
          isMerged: false,
          syncStatus: 'disconnected',
          portalAccessEnabled: true,
          notesAdmin: '',
          // Override flags (all false for create mode)
          maxResidentsOverride: false,
          accessCardLimitOverride: false,
          petAllowedOverride: false,
          billingCycleOverride: false,
        } as ApartmentFormValues);
      }
    }
  }, [open, apartment, isEditing, form, effectiveConfig]);

  const cleanValue = (v: unknown) => {
    if (v === '' || v === undefined) return undefined;
    return v;
  };

  const cleanNumber = (v: unknown) => {
    if (v === '' || v === undefined || v === null) return undefined;
    const n = Number(v);
    return isNaN(n) ? undefined : n;
  };

  const onSubmit = async (values: ApartmentFormValues) => {
    try {
      if (isEditing && apartment) {
        const updateData: UpdateApartmentInput = {
          // Don't send building-managed fields in edit mode
          apartmentCode: cleanValue(values.apartmentCode) as string | undefined,
          floorLabel: cleanValue(values.floorLabel) as string | undefined,
          unitType: cleanValue(values.unitType) as string | undefined,
          netArea: cleanNumber(values.netArea) as number | undefined,
          grossArea: cleanNumber(values.grossArea) as number | undefined,
          ceilingHeight: cleanNumber(values.ceilingHeight) as number | undefined,
          bedroomCount: values.bedroomCount,
          bathroomCount: values.bathroomCount,
          orientation: cleanValue(values.orientation) as string | undefined,
          balconyDirection: cleanValue(values.balconyDirection) as string | undefined,
          isCornerUnit: values.isCornerUnit,
          status: values.status,
          // Ownership
          ownershipType: cleanValue(values.ownershipType) as string | undefined ?? null,
          handoverDate: cleanValue(values.handoverDate) as string | undefined ?? null,
          warrantyExpiryDate: cleanValue(values.warrantyExpiryDate) as string | undefined ?? null,
          isRented: values.isRented,
          vatRate: cleanNumber(values.vatRate) as number | undefined ?? null,
          // Occupancy
          maxResidents: cleanNumber(values.maxResidents) as number | undefined ?? null,
          currentResidentCount: values.currentResidentCount,
          petAllowed: values.petAllowed ?? null,
          petLimit: cleanNumber(values.petLimit) as number | undefined ?? null,
          accessCardLimit: cleanNumber(values.accessCardLimit) as number | undefined ?? null,
          intercomCode: cleanValue(values.intercomCode) as string | undefined ?? null,
          // Utility (meter IDs are system-managed, not editable via form)
          powerCapacity: cleanNumber(values.powerCapacity) as number | undefined ?? null,
          acUnitCount: cleanNumber(values.acUnitCount) as number | undefined ?? null,
          fireDetectorId: cleanValue(values.fireDetectorId) as string | undefined ?? null,
          sprinklerCount: cleanNumber(values.sprinklerCount) as number | undefined ?? null,
          internetTerminalLoc: cleanValue(values.internetTerminalLoc) as string | undefined ?? null,
          // Parking
          assignedCarSlot: cleanValue(values.assignedCarSlot) as string | undefined ?? null,
          assignedMotoSlot: cleanValue(values.assignedMotoSlot) as string | undefined ?? null,
          mailboxNumber: cleanValue(values.mailboxNumber) as string | undefined ?? null,
          storageUnitId: cleanValue(values.storageUnitId) as string | undefined ?? null,
          // Billing
          billingStartDate: cleanValue(values.billingStartDate) as string | undefined ?? null,
          billingCycle: cleanValue(values.billingCycle) as string | undefined,
          bankAccountVirtual: cleanValue(values.bankAccountVirtual) as string | undefined ?? null,
          lateFeeWaived: values.lateFeeWaived,
          // System
          isMerged: values.isMerged,
          syncStatus: cleanValue(values.syncStatus) as string | undefined,
          portalAccessEnabled: values.portalAccessEnabled,
          notesAdmin: cleanValue(values.notesAdmin) as string | undefined ?? null,
        };

        await updateApartment.mutateAsync({
          id: apartment.id,
          data: updateData,
        });

        toast({
          title: 'Apartment updated',
          description: `Unit ${apartment.unit_number} has been updated successfully.`,
        });
      } else {
        const createData: CreateApartmentInput = {
          buildingId: values.buildingId,
          unit_number: values.unit_number,
          floorIndex: values.floorIndex,
          apartmentCode: cleanValue(values.apartmentCode) as string | undefined,
          floorLabel: cleanValue(values.floorLabel) as string | undefined,
          unitType: cleanValue(values.unitType) as string | undefined,
          netArea: cleanNumber(values.netArea) as number | undefined,
          grossArea: cleanNumber(values.grossArea) as number | undefined,
          ceilingHeight: cleanNumber(values.ceilingHeight) as number | undefined,
          bedroomCount: values.bedroomCount,
          bathroomCount: values.bathroomCount,
          orientation: cleanValue(values.orientation) as string | undefined,
          balconyDirection: cleanValue(values.balconyDirection) as string | undefined,
          isCornerUnit: values.isCornerUnit,
        };

        await createApartment.mutateAsync(createData);

        toast({
          title: 'Apartment created',
          description: `Unit ${values.unit_number} has been created successfully.`,
        });
      }

      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col flex-1 min-h-0 overflow-hidden"
        >
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Edit Apartment' : 'Create New Apartment'}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? 'Update apartment details. Building assignment fields are read-only.'
                : 'Fill in the details to create a new apartment.'}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
              <Tabs defaultValue="spatial" className="flex-1 min-h-0 flex flex-col">
                <TabsList className="w-full flex-shrink-0 grid grid-cols-4 mb-2">
                  <TabsTrigger value="spatial" className="text-xs">Spatial</TabsTrigger>
                  <TabsTrigger value="occupancy" className="text-xs">Occupancy</TabsTrigger>
                  <TabsTrigger value="utility" className="text-xs">Utility</TabsTrigger>
                  <TabsTrigger value="billing" className="text-xs">Billing</TabsTrigger>
                </TabsList>

                <div className="flex-1 min-h-0 overflow-y-auto pr-4">
                  {/* ===== SPATIAL TAB ===== */}
                  <TabsContent value="spatial" className="space-y-4 mt-0">
                    {/* Building Selection - disabled in edit mode */}
                    <FormField
                      control={form.control}
                      name="buildingId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Building</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={isEditing || buildingsLoading || buildings.length === 0}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={buildings.length === 0 ? "No buildings available" : "Select a building"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {buildings.map((building) => (
                                <SelectItem key={building.id} value={building.id}>
                                  {building.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {isEditing && <FormDescription>Managed by building module</FormDescription>}
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Unit Number & Floor - disabled in edit mode */}
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="unit_number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unit Number</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., A-1201" {...field} disabled={isEditing} />
                            </FormControl>
                            {isEditing && <FormDescription>Managed by building module</FormDescription>}
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="floorIndex"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Floor Index</FormLabel>
                            <FormControl>
                              <Input type="number" min={0} {...field} disabled={isEditing} />
                            </FormControl>
                            {isEditing && <FormDescription>Managed by building module</FormDescription>}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Apartment Code & Floor Label */}
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="apartmentCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Apartment Code</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., A-12.05" {...field} disabled={isEditing} />
                            </FormControl>
                            {isEditing && <FormDescription>Managed by building module</FormDescription>}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="floorLabel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Floor Label</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., 12A" {...field} disabled={isEditing} />
                            </FormControl>
                            {isEditing && <FormDescription>Managed by building module</FormDescription>}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Unit Type & Status */}
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="unitType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unit Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ''} disabled={isEditing}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {UNIT_TYPES.map((t) => (
                                  <SelectItem key={t} value={t}>{UNIT_TYPE_LABELS[t]}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {isEditing && <FormDescription>Managed by building module</FormDescription>}
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {isEditing && (
                        <FormField
                          control={form.control}
                          name="status"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Status</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="vacant">Vacant</SelectItem>
                                  <SelectItem value="occupied">Occupied</SelectItem>
                                  <SelectItem value="maintenance">Maintenance</SelectItem>
                                  <SelectItem value="reserved">Reserved</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>

                    {/* Areas */}
                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="grossArea"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Gross Area (m²)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.1" placeholder="75.5" {...field} value={field.value ?? ''} disabled={isEditing} />
                            </FormControl>
                            {isEditing && <FormDescription>From SVG</FormDescription>}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="netArea"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Net Area (m²)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.1" placeholder="65.5" {...field} value={field.value ?? ''} disabled={isEditing} />
                            </FormControl>
                            {isEditing && <FormDescription>From SVG</FormDescription>}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="ceilingHeight"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ceiling (m)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" placeholder="2.85" {...field} value={field.value ?? ''} disabled={isEditing} />
                            </FormControl>
                            {isEditing && <FormDescription>Building default</FormDescription>}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Bedrooms & Bathrooms */}
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="bedroomCount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bedrooms</FormLabel>
                            <FormControl>
                              <Input type="number" min={0} {...field} disabled={isEditing} />
                            </FormControl>
                            {isEditing && <FormDescription>Managed by building</FormDescription>}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="bathroomCount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bathrooms</FormLabel>
                            <FormControl>
                              <Input type="number" min={0} {...field} disabled={isEditing} />
                            </FormControl>
                            {isEditing && <FormDescription>Managed by building</FormDescription>}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Orientation & Balcony */}
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="orientation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Orientation</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ''} disabled={isEditing}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select direction" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {ORIENTATIONS.map((o) => (
                                  <SelectItem key={o} value={o}>{ORIENTATION_LABELS[o]}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {isEditing && <FormDescription>Managed by building</FormDescription>}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="balconyDirection"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Balcony Direction</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ''} disabled={isEditing}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select direction" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {ORIENTATIONS.map((o) => (
                                  <SelectItem key={o} value={o}>{ORIENTATION_LABELS[o]}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {isEditing && <FormDescription>Managed by building</FormDescription>}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Corner unit */}
                    <FormField
                      control={form.control}
                      name="isCornerUnit"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-3">
                          <div>
                            <FormLabel>Corner Unit</FormLabel>
                            <FormDescription>{isEditing ? 'Managed by building module' : 'This unit is at a corner position'}</FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isEditing} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </TabsContent>

                  {/* ===== OCCUPANCY TAB ===== */}
                  <TabsContent value="occupancy" className="space-y-4 mt-0">
                    {/* Ownership */}
                    <h4 className="text-sm font-semibold">Ownership & Legal</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="ownershipType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ownership Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ''}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="permanent">Permanent</SelectItem>
                                <SelectItem value="fifty_year">50-Year</SelectItem>
                                <SelectItem value="leasehold">Leasehold</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>Type of ownership rights</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="vatRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>VAT Rate (%)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.1" min={0} max={100} placeholder="10" {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormDescription>Standard rate is 10%</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="handoverDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Handover Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="warrantyExpiryDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Warranty Expiry</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="isRented"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-3">
                          <div>
                            <FormLabel>Currently Rented</FormLabel>
                            <FormDescription>This unit is being rented out</FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <Separator />

                    {/* Residents / Pets with Policy Inheritance */}
                    <h4 className="text-sm font-semibold">Residents</h4>
                    
                    {/* Max Residents with override */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Label className="text-sm font-medium">Max Residents</Label>
                            {effectiveConfig && (
                              <Badge
                                variant="outline"
                                className={`text-[10px] px-1.5 py-0 h-5 font-normal ${
                                  effectiveConfig.maxResidents.source === 'apartment'
                                    ? 'bg-blue-100 text-blue-700'
                                    : effectiveConfig.maxResidents.source === 'building'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {effectiveConfig.maxResidents.source === 'apartment'
                                  ? 'Overridden'
                                  : effectiveConfig.maxResidents.source === 'building'
                                  ? 'From policy'
                                  : 'Default'}
                              </Badge>
                            )}
                          </div>
                          {isEditing && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Override</span>
                              <Switch
                                checked={form.watch('maxResidentsOverride')}
                                onCheckedChange={(checked) => {
                                  form.setValue('maxResidentsOverride', checked);
                                  if (!checked) {
                                    // Clear the override value when disabling
                                    form.setValue('maxResidents', undefined);
                                  }
                                }}
                                className="scale-75"
                              />
                            </div>
                          )}
                        </div>
                        <FormField
                          control={form.control}
                          name="maxResidents"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0}
                                  placeholder={String(effectiveConfig?.maxResidents.value ?? 6)}
                                  {...field}
                                  value={field.value ?? ''}
                                  disabled={isEditing && !form.watch('maxResidentsOverride')}
                                />
                              </FormControl>
                              {isEditing && !form.watch('maxResidentsOverride') && effectiveConfig && (
                                <FormDescription>
                                  Using policy value: {effectiveConfig.maxResidents.value}
                                </FormDescription>
                              )}
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="currentResidentCount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current Residents</FormLabel>
                            <FormControl>
                              <Input type="number" min={0} {...field} disabled />
                            </FormControl>
                            <FormDescription>Synced from contract</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Access Card Limit with override */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Label className="text-sm font-medium">Access Card Limit</Label>
                            {effectiveConfig && (
                              <Badge
                                variant="outline"
                                className={`text-[10px] px-1.5 py-0 h-5 font-normal ${
                                  effectiveConfig.accessCardLimit.source === 'apartment'
                                    ? 'bg-blue-100 text-blue-700'
                                    : effectiveConfig.accessCardLimit.source === 'building'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {effectiveConfig.accessCardLimit.source === 'apartment'
                                  ? 'Overridden'
                                  : effectiveConfig.accessCardLimit.source === 'building'
                                  ? 'From policy'
                                  : 'Default'}
                              </Badge>
                            )}
                          </div>
                          {isEditing && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Override</span>
                              <Switch
                                checked={form.watch('accessCardLimitOverride')}
                                onCheckedChange={(checked) => {
                                  form.setValue('accessCardLimitOverride', checked);
                                  if (!checked) {
                                    form.setValue('accessCardLimit', undefined);
                                  }
                                }}
                                className="scale-75"
                              />
                            </div>
                          )}
                        </div>
                        <FormField
                          control={form.control}
                          name="accessCardLimit"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0}
                                  placeholder={String(effectiveConfig?.accessCardLimit.value ?? 4)}
                                  {...field}
                                  value={field.value ?? ''}
                                  disabled={isEditing && !form.watch('accessCardLimitOverride')}
                                />
                              </FormControl>
                              {isEditing && !form.watch('accessCardLimitOverride') && effectiveConfig && (
                                <FormDescription>
                                  Using policy value: {effectiveConfig.accessCardLimit.value}
                                </FormDescription>
                              )}
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="intercomCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Intercom Code</FormLabel>
                            <FormControl>
                              <Input placeholder="Typically matches unit number" {...field} />
                            </FormControl>
                            <FormDescription>Typically matches unit number</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Pets Allowed with override */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <Label className="text-sm font-medium">Pets Allowed</Label>
                              {effectiveConfig && (
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] px-1.5 py-0 h-5 font-normal ${
                                    effectiveConfig.petAllowed.source === 'apartment'
                                      ? 'bg-blue-100 text-blue-700'
                                      : effectiveConfig.petAllowed.source === 'building'
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-gray-100 text-gray-600'
                                  }`}
                                >
                                  {effectiveConfig.petAllowed.source === 'apartment'
                                    ? 'Overridden'
                                    : effectiveConfig.petAllowed.source === 'building'
                                    ? 'From policy'
                                    : 'Default'}
                                </Badge>
                              )}
                            </div>
                            {isEditing && !form.watch('petAllowedOverride') && effectiveConfig && (
                              <p className="text-xs text-muted-foreground">
                                Policy: {effectiveConfig.petAllowed.value ? 'Yes' : 'No'}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {isEditing && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Override</span>
                              <Switch
                                checked={form.watch('petAllowedOverride')}
                                onCheckedChange={(checked) => {
                                  form.setValue('petAllowedOverride', checked);
                                  if (!checked) {
                                    form.setValue('petAllowed', effectiveConfig?.petAllowed.value ?? false);
                                  }
                                }}
                                className="scale-75"
                              />
                            </div>
                          )}
                          <FormField
                            control={form.control}
                            name="petAllowed"
                            render={({ field }) => (
                              <FormItem className="flex items-center m-0">
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    disabled={isEditing && !form.watch('petAllowedOverride')}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>

                    {(form.watch('petAllowed') || effectiveConfig?.petAllowed.value) && (
                      <FormField
                        control={form.control}
                        name="petLimit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pet Limit</FormLabel>
                            <FormControl>
                              <Input type="number" min={0} placeholder="2" {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </TabsContent>

                  {/* ===== UTILITY TAB ===== */}
                  <TabsContent value="utility" className="space-y-4 mt-0">
                    {/* Available Utility Types */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold">Available Utility Types</h4>
                        <Link href="/utility-types">
                          <Button variant="ghost" size="sm" className="h-7 text-xs">
                            Manage
                            <ExternalLink className="ml-1 h-3 w-3" />
                          </Button>
                        </Link>
                      </div>
                      
                      {utilityTypesLoading ? (
                        <div className="flex gap-2">
                          <div className="h-6 w-24 bg-muted animate-pulse rounded-md" />
                          <div className="h-6 w-20 bg-muted animate-pulse rounded-md" />
                          <div className="h-6 w-22 bg-muted animate-pulse rounded-md" />
                        </div>
                      ) : activeUtilityTypes.length === 0 ? (
                        <Alert>
                          <Zap className="h-4 w-4" />
                          <AlertDescription>
                            No utility types configured.{' '}
                            <Link href="/utility-types" className="underline font-medium">
                              Create utility types
                            </Link>{' '}
                            to enable meter tracking.
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {activeUtilityTypes.map((ut) => {
                            const Icon = ut.code === 'electric' ? Zap 
                              : ut.code === 'water' ? Droplets 
                              : ut.code === 'gas' ? Flame : Zap;
                            return (
                              <Badge key={ut.id} variant="secondary" className="flex items-center gap-1.5 py-1">
                                <Icon className="h-3 w-3" />
                                {ut.name} ({ut.unit})
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <Separator />
                    <h4 className="text-sm font-semibold">Assigned Meters</h4>
                    {isEditing && apartment ? (
                      <div className="space-y-3">
                        {(apartment.electricMeterId || apartment.waterMeterId || apartment.gasMeterId) ? (
                          <div className="flex flex-wrap gap-2">
                            {apartment.electricMeterId && (
                              <Badge variant="outline" className="flex items-center gap-1.5 py-1.5 px-3">
                                <Zap className="h-3.5 w-3.5 text-yellow-500" />
                                <span className="text-xs text-muted-foreground">Electric:</span>
                                <code className="text-xs font-mono">{apartment.electricMeterId}</code>
                              </Badge>
                            )}
                            {apartment.waterMeterId && (
                              <Badge variant="outline" className="flex items-center gap-1.5 py-1.5 px-3">
                                <Droplets className="h-3.5 w-3.5 text-blue-500" />
                                <span className="text-xs text-muted-foreground">Water:</span>
                                <code className="text-xs font-mono">{apartment.waterMeterId}</code>
                              </Badge>
                            )}
                            {apartment.gasMeterId && (
                              <Badge variant="outline" className="flex items-center gap-1.5 py-1.5 px-3">
                                <Flame className="h-3.5 w-3.5 text-orange-500" />
                                <span className="text-xs text-muted-foreground">Gas:</span>
                                <code className="text-xs font-mono">{apartment.gasMeterId}</code>
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No meters assigned yet. Meter IDs are auto-generated when the first reading is recorded.
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Meter IDs will be auto-generated after the apartment is created.
                      </p>
                    )}

                    <Separator />
                    <h4 className="text-sm font-semibold">Infrastructure</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="powerCapacity"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center gap-2">
                              <FormLabel>Circuit Breaker Rating (Amps)</FormLabel>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="max-w-xs text-xs">Maximum amperage for the unit's main circuit breaker</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <FormControl>
                              <Input type="number" min={0} placeholder="32" {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="acUnitCount"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center gap-2">
                              <FormLabel>AC Connection Points</FormLabel>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="max-w-xs text-xs">Number of pre-installed AC connection points in this unit</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <FormControl>
                              <Input type="number" min={0} placeholder="3" {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-red-500" />
                      <h4 className="text-sm font-semibold">Safety Equipment (PCCC Compliance)</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="fireDetectorId"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center gap-2">
                              <FormLabel>Fire Detector ID</FormLabel>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="max-w-xs text-xs">Required per Vietnamese fire safety regulations (Nghị định 136/2020/NĐ-CP)</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <FormControl>
                              <Input placeholder="FD-1205" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="sprinklerCount"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center gap-2">
                              <FormLabel>Sprinkler Count</FormLabel>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="max-w-xs text-xs">Number of fire sprinklers installed in this unit</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <FormControl>
                              <Input type="number" min={0} placeholder="2" {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="internetTerminalLoc"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Internet Terminal Location</FormLabel>
                            <FormControl>
                              <Input placeholder="Living room wall" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold">Parking Slots</h4>
                      {isEditing && apartment && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setParkingDialogOpen(true)}
                        >
                          <Car className="mr-2 h-4 w-4" />
                          Manage Parking
                        </Button>
                      )}
                    </div>
                    {isEditing && parkingSlots.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {parkingSlots.map((slot) => (
                          <Badge key={slot.id} variant="outline" className="py-1.5 px-3">
                            <Car className="mr-1.5 h-3.5 w-3.5" />
                            {slot.fullCode}
                            <span className="ml-1.5 text-xs text-muted-foreground">
                              ({new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', notation: 'compact' }).format(slot.monthlyFee)}/mo)
                            </span>
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {isEditing ? 'No parking slots assigned. Click "Manage Parking" to assign slots.' : 'Parking can be assigned after the apartment is created.'}
                      </p>
                    )}

                    <h4 className="text-sm font-semibold mt-4">Other Assets</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="mailboxNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mailbox Number</FormLabel>
                            <FormControl>
                              <Input placeholder="MB-1205" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="storageUnitId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Storage Unit</FormLabel>
                            <FormControl>
                              <Input placeholder="SU-023" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>

                  {/* ===== BILLING TAB ===== */}
                  <TabsContent value="billing" className="space-y-4 mt-0">
                    <h4 className="text-sm font-semibold">Billing Configuration</h4>
                    
                    {/* Billing Cycle with policy inheritance */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Label className="text-sm font-medium">Billing Cycle</Label>
                            {effectiveConfig && (
                              <Badge
                                variant="outline"
                                className={`text-[10px] px-1.5 py-0 h-5 font-normal ${
                                  effectiveConfig.billingCycle.source === 'apartment'
                                    ? 'bg-blue-100 text-blue-700'
                                    : effectiveConfig.billingCycle.source === 'building'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {effectiveConfig.billingCycle.source === 'apartment'
                                  ? 'Overridden'
                                  : effectiveConfig.billingCycle.source === 'building'
                                  ? 'From policy'
                                  : 'Default'}
                              </Badge>
                            )}
                          </div>
                          {isEditing && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Override</span>
                              <Switch
                                checked={form.watch('billingCycleOverride')}
                                onCheckedChange={(checked) => {
                                  form.setValue('billingCycleOverride', checked);
                                  if (!checked) {
                                    form.setValue('billingCycle', undefined);
                                  }
                                }}
                                className="scale-75"
                              />
                            </div>
                          )}
                        </div>
                        <FormField
                          control={form.control}
                          name="billingCycle"
                          render={({ field }) => (
                            <FormItem>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value || effectiveConfig?.billingCycle.value || 'monthly'}
                                disabled={isEditing && !form.watch('billingCycleOverride')}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="monthly">Monthly</SelectItem>
                                  <SelectItem value="quarterly">Quarterly</SelectItem>
                                  <SelectItem value="yearly">Yearly</SelectItem>
                                </SelectContent>
                              </Select>
                              {isEditing && !form.watch('billingCycleOverride') && effectiveConfig && (
                                <FormDescription>
                                  Using policy value: {effectiveConfig.billingCycle.value}
                                </FormDescription>
                              )}
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="billingStartDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Billing Start Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormDescription>Date from which invoices will be generated</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="bankAccountVirtual"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Virtual Bank Account</FormLabel>
                          <FormControl>
                            <Input placeholder="For payment matching" {...field} disabled />
                          </FormControl>
                          <FormDescription>System-generated for automated payment matching</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lateFeeWaived"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-3">
                          <div>
                            <FormLabel>Waive Late Fees</FormLabel>
                            <FormDescription>Exempt this unit from late payment penalties</FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <Separator />
                    <h4 className="text-sm font-semibold">System</h4>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="syncStatus"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sync Status</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || 'disconnected'} disabled>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="synced">Synced</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="error">Error</SelectItem>
                                <SelectItem value="disconnected">Disconnected</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="portalAccessEnabled"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-3">
                          <div>
                            <FormLabel>Portal Access</FormLabel>
                            <FormDescription>Allow residents to access the web portal</FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="isMerged"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-3">
                          <div>
                            <FormLabel>Merged Unit</FormLabel>
                            <FormDescription>This unit has been merged with another</FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="notesAdmin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Admin Notes</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Private notes for administrators..." rows={3} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                </div>
              </Tabs>

              <DialogFooter className="mt-4 pt-4 border-t flex-shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEditing ? 'Save Changes' : 'Create Apartment'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </motion.div>
      </DialogContent>
    </Dialog>

    {/* Parking Assignment Dialog */}
    {buildingId && apartmentId && (
      <ParkingAssignmentDialog
        buildingId={buildingId}
        apartmentId={apartmentId}
        open={parkingDialogOpen}
        onOpenChange={(open) => {
          setParkingDialogOpen(open);
          // Refetch parking slots when dialog closes
          if (!open) {
            refetchParkingSlots();
          }
        }}
      />
    )}
    </>
  );
}
