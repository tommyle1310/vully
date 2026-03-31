'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import {
  Apartment,
  CreateApartmentInput,
  UpdateApartmentInput,
  useCreateApartment,
  useUpdateApartment,
} from '@/hooks/use-apartments';
import { useBuildings } from '@/hooks/use-buildings';
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const apartmentFormSchema = z.object({
  buildingId: z.string().uuid('Please select a building'),
  unitNumber: z.string().min(1, 'Unit number is required').max(20),
  floor: z.coerce.number().int().min(0, 'Floor must be 0 or higher'),
  areaSqm: z.coerce.number().positive('Area must be a positive number').optional(),
  bedroomCount: z.coerce.number().int().min(0, 'Bedrooms must be 0 or higher').optional(),
  bathroomCount: z.coerce.number().int().min(0, 'Bathrooms must be 0 or higher').optional(),
  status: z.enum(['VACANT', 'OCCUPIED', 'MAINTENANCE']).optional(),
});

type ApartmentFormValues = z.infer<typeof apartmentFormSchema>;

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
  const { data: buildingsData, isLoading: buildingsLoading } = useBuildings();
  const createApartment = useCreateApartment();
  const updateApartment = useUpdateApartment();

  const isEditing = mode === 'edit';
  const isLoading = createApartment.isPending || updateApartment.isPending;
  const buildings = buildingsData?.data || [];

  const form = useForm<ApartmentFormValues>({
    resolver: zodResolver(apartmentFormSchema),
    defaultValues: {
      buildingId: '',
      unitNumber: '',
      floor: 1,
      areaSqm: undefined,
      bedroomCount: 1,
      bathroomCount: 1,
      status: 'VACANT',
    },
  });

  // Reset form when dialog opens or apartment changes
  useEffect(() => {
    if (open) {
      if (isEditing && apartment) {
        form.reset({
          buildingId: apartment.buildingId,
          unitNumber: apartment.unitNumber,
          floor: apartment.floor,
          areaSqm: apartment.areaSqm,
          bedroomCount: apartment.bedroomCount,
          bathroomCount: apartment.bathroomCount,
          status: apartment.status,
        });
      } else {
        form.reset({
          buildingId: '',
          unitNumber: '',
          floor: 1,
          areaSqm: undefined,
          bedroomCount: 1,
          bathroomCount: 1,
          status: 'vacant',
        });
      }
    }
  }, [open, apartment, isEditing, form]);

  const onSubmit = async (values: ApartmentFormValues) => {
    try {
      if (isEditing && apartment) {
        const updateData: UpdateApartmentInput = {
          buildingId: values.buildingId,
          unitNumber: values.unitNumber,
          floor: values.floor,
          areaSqm: values.areaSqm,
          bedroomCount: values.bedroomCount,
          bathroomCount: values.bathroomCount,
          status: values.status?.toLowerCase(),
        };

        await updateApartment.mutateAsync({
          id: apartment.id,
          data: updateData,
        });

        toast({
          title: 'Apartment updated',
          description: `Unit ${values.unitNumber} has been updated successfully.`,
        });
      } else {
        const createData: CreateApartmentInput = {
          buildingId: values.buildingId,
          unitNumber: values.unitNumber,
          floor: values.floor,
          areaSqm: values.areaSqm,
          bedroomCount: values.bedroomCount,
          bathroomCount: values.bathroomCount,
        };

        await createApartment.mutateAsync(createData);

        toast({
          title: 'Apartment created',
          description: `Unit ${values.unitNumber} has been created successfully.`,
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Edit Apartment' : 'Create New Apartment'}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? 'Update the details of this apartment.'
                : 'Fill in the details to create a new apartment.'}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
              {/* Building Selection */}
              <FormField
                control={form.control}
                name="buildingId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Building</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={buildingsLoading || buildings.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={buildings.length === 0 ? "No buildings available" : "Select a building"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {buildings.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground text-center">
                            No buildings found. Please create a building first.
                          </div>
                        ) : (
                          buildings.map((building) => (
                            <SelectItem key={building.id} value={building.id}>
                              {building.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Unit Number & Floor */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="unitNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., A-1201" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="floor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Floor</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Area */}
              <FormField
                control={form.control}
                name="areaSqm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Area (m²)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="e.g., 75.5"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Bedrooms & Bathrooms */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="bedroomCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bedrooms</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
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
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Status (only for editing) */}
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
                          <SelectItem value="VACANT">Vacant</SelectItem>
                          <SelectItem value="OCCUPIED">Occupied</SelectItem>
                          <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <DialogFooter className="mt-6">
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
  );
}
