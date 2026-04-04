'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Loader2, Plus, X } from 'lucide-react';
import {
  Building,
  CreateBuildingInput,
  UpdateBuildingInput,
  useCreateBuilding,
  useUpdateBuilding,
} from '@/hooks/use-buildings';
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
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

const buildingFormSchema = z.object({
  name: z.string().min(1, 'Building name is required').max(255),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required').max(100),
  floorCount: z.coerce.number().int().min(1, 'Floor count must be at least 1'),
  amenities: z.array(z.string()).optional().default([]),
  isActive: z.boolean().optional(),
});

type BuildingFormValues = z.infer<typeof buildingFormSchema>;

interface BuildingFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  building?: Building | null;
  mode: 'create' | 'edit';
}

export function BuildingFormDialog({
  open,
  onOpenChange,
  building,
  mode,
}: BuildingFormDialogProps) {
  const { toast } = useToast();
  const createBuilding = useCreateBuilding();
  const updateBuilding = useUpdateBuilding();
  const [amenityInput, setAmenityInput] = useState('');

  const isEditing = mode === 'edit';
  const isLoading = createBuilding.isPending || updateBuilding.isPending;

  const form = useForm<BuildingFormValues>({
    resolver: zodResolver(buildingFormSchema),
    defaultValues: {
      name: '',
      address: '',
      city: '',
      floorCount: 1,
      amenities: [],
      isActive: true,
    },
  });

  // Reset form when dialog opens or building changes
  useEffect(() => {
    if (open) {
      if (isEditing && building) {
        form.reset({
          name: building.name,
          address: building.address,
          city: building.city,
          floorCount: building.floorCount,
          amenities: building.amenities || [],
          isActive: building.isActive,
        });
      } else {
        form.reset({
          name: '',
          address: '',
          city: '',
          floorCount: 1,
          amenities: [],
          isActive: true,
        });
      }
    }
  }, [open, building, isEditing, form]);

  const addAmenity = () => {
    if (!amenityInput.trim()) return;
    
    const currentAmenities = form.getValues('amenities') || [];
    if (!currentAmenities.includes(amenityInput.trim())) {
      form.setValue('amenities', [...currentAmenities, amenityInput.trim()]);
    }
    setAmenityInput('');
  };

  const removeAmenity = (amenity: string) => {
    const currentAmenities = form.getValues('amenities') || [];
    form.setValue('amenities', currentAmenities.filter((a: string) => a !== amenity));
  };

  const onSubmit = async (values: BuildingFormValues) => {
    try {
      if (isEditing && building) {
        const updateData: UpdateBuildingInput = {
          name: values.name,
          address: values.address,
          city: values.city,
          floorCount: values.floorCount,
          amenities: values.amenities,
          isActive: values.isActive,
        };

        await updateBuilding.mutateAsync({
          id: building.id,
          data: updateData,
        });

        toast({
          title: 'Building updated',
          description: `${values.name} has been updated successfully.`,
        });
      } else {
        const createData: CreateBuildingInput = {
          name: values.name,
          address: values.address,
          city: values.city,
          floorCount: values.floorCount,
          amenities: values.amenities,
        };

        await createBuilding.mutateAsync(createData);

        toast({
          title: 'Building created',
          description: `${values.name} has been created successfully.`,
        });
      }

      onOpenChange(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      const isForbidden = errorMessage.includes('403') || errorMessage.includes('Forbidden');
      
      toast({
        title: 'Error',
        description: isForbidden 
          ? 'You do not have permission to perform this action. Admin access required.' 
          : errorMessage,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Edit Building' : 'Create New Building'}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? 'Update the details of this building.'
                : 'Fill in the details to create a new building.'}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
              {/* Building Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Building Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Vully Tower A" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* City & Floor Count */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Ho Chi Minh City" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="floorCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Floor Count</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Address */}
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 123 Nguyen Hue, District 1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Amenities */}
              <FormField
                control={form.control}
                name="amenities"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amenities</FormLabel>
                    <FormDescription>
                      Add building amenities like gym, pool, parking, etc.
                    </FormDescription>
                    <div className="flex gap-2">
                      <Input
                        placeholder="e.g., Swimming Pool"
                        value={amenityInput}
                        onChange={(e) => setAmenityInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addAmenity();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={addAmenity}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {field.value?.map((amenity) => (
                        <Badge key={amenity} variant="secondary" className="gap-1">
                          {amenity}
                          <button
                            type="button"
                            onClick={() => removeAmenity(amenity)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Active Status (only in edit mode) */}
              {isEditing && (
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active Status</FormLabel>
                        <FormDescription>
                          Deactivate this building to hide it from apartment creation
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEditing ? 'Update Building' : 'Create Building'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
