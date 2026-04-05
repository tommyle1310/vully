'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
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
import { Form } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ParkingAssignmentDialog } from '@/components/apartments';
import { useAuthStore } from '@/stores/authStore';
import {
  apartmentFormSchema,
  ApartmentFormValues,
  UNIT_TYPES,
  ORIENTATIONS,
  OWNERSHIP_TYPES,
  BILLING_CYCLES,
  SYNC_STATUSES,
} from './apartment-form-schema';
import { toFormValue, cleanValue, cleanNumber } from './apartment-form-helpers';
import { ApartmentFormSpatialTab } from './apartment-form-spatial-tab';
import { ApartmentFormOccupancyTab } from './apartment-form-occupancy-tab';
import { ApartmentFormUtilityTab } from './apartment-form-utility-tab';
import { ApartmentFormBillingTab } from './apartment-form-billing-tab';

interface ApartmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apartment?: Apartment | null;
  mode: 'create' | 'edit';
}

export function ApartmentFormDialog({
  open,
  onOpenChange,
  apartment,
  mode,
}: ApartmentFormDialogProps) {
  const { toast } = useToast();
  const { hasRole, hasAnyRole } = useAuthStore();
  const isResident = hasRole('resident') && !hasAnyRole(['admin', 'technician']);
  const { data: buildingsData, isLoading: buildingsLoading } = useBuildings();
  const { data: utilityTypesData, isLoading: utilityTypesLoading } = useUtilityTypes();
  const createApartment = useCreateApartment();
  const updateApartment = useUpdateApartment();

  // Fetch effective config for policy inheritance (only when editing)
  const { data: effectiveConfigData } = useApartmentEffectiveConfig(
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
              {isResident
                ? 'View apartment details. Contact admin to make changes.'
                : isEditing
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

                <div className={`flex-1 min-h-0 overflow-y-auto pr-4 ${isResident ? '[&_input]:pointer-events-none [&_input]:opacity-60 [&_textarea]:pointer-events-none [&_textarea]:opacity-60 [&_[role=combobox]]:pointer-events-none [&_[role=combobox]]:opacity-60 [&_[role=switch]]:pointer-events-none [&_[role=switch]]:opacity-60' : ''}`}>
                  <TabsContent value="spatial" className="space-y-4 mt-0">
                    <ApartmentFormSpatialTab
                      form={form}
                      isEditing={isEditing}
                      buildings={buildings}
                      buildingsLoading={buildingsLoading}
                    />
                  </TabsContent>

                  <TabsContent value="occupancy" className="space-y-4 mt-0">
                    <ApartmentFormOccupancyTab
                      form={form}
                      isEditing={isEditing}
                      effectiveConfig={effectiveConfig}
                    />
                  </TabsContent>

                  <TabsContent value="utility" className="space-y-4 mt-0">
                    <ApartmentFormUtilityTab
                      form={form}
                      isEditing={isEditing}
                      isResident={isResident}
                      apartment={apartment}
                      activeUtilityTypes={activeUtilityTypes}
                      utilityTypesLoading={utilityTypesLoading}
                      parkingSlots={parkingSlots}
                      onOpenParkingDialog={() => setParkingDialogOpen(true)}
                    />
                  </TabsContent>

                  <TabsContent value="billing" className="space-y-4 mt-0">
                    <ApartmentFormBillingTab
                      form={form}
                      isEditing={isEditing}
                      effectiveConfig={effectiveConfig}
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
                  {isResident ? 'Close' : 'Cancel'}
                </Button>
                {!isResident && (
                  <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isEditing ? 'Save Changes' : 'Create Apartment'}
                  </Button>
                )}
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
          if (!open) {
            refetchParkingSlots();
          }
        }}
      />
    )}
    </>
  );
}
