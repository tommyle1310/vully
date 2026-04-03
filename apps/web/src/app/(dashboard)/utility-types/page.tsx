'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Zap, Droplets, Flame, MoreHorizontal, Pencil, Loader2 } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  useUtilityTypes,
  useCreateUtilityType,
  useUpdateUtilityType,
  useSeedUtilityTypes,
  UtilityType,
} from '@/hooks/use-billing';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

// Create/Edit form schema
const utilityTypeSchema = z.object({
  code: z.string().min(1, 'Code is required').max(50),
  name: z.string().min(1, 'Name is required').max(100),
  unit: z.string().min(1, 'Unit is required').max(20),
  isActive: z.boolean().optional(),
});

type UtilityTypeFormValues = z.infer<typeof utilityTypeSchema>;

// Icon mapping for utility types
const UTILITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  electric: Zap,
  water: Droplets,
  gas: Flame,
};

function getUtilityIcon(code: string) {
  return UTILITY_ICONS[code] || Zap;
}

export default function UtilityTypesPage() {
  const { toast } = useToast();
  const { data: utilityTypesData, isLoading } = useUtilityTypes();
  const createUtilityType = useCreateUtilityType();
  const updateUtilityType = useUpdateUtilityType();
  const seedUtilityTypes = useSeedUtilityTypes();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<UtilityType | null>(null);

  const utilityTypes = utilityTypesData?.data || [];

  const form = useForm<UtilityTypeFormValues>({
    resolver: zodResolver(utilityTypeSchema),
    defaultValues: {
      code: '',
      name: '',
      unit: '',
      isActive: true,
    },
  });

  const openCreateDialog = () => {
    setEditingType(null);
    form.reset({
      code: '',
      name: '',
      unit: '',
      isActive: true,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (type: UtilityType) => {
    setEditingType(type);
    form.reset({
      code: type.code,
      name: type.name,
      unit: type.unit,
      isActive: type.isActive,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: UtilityTypeFormValues) => {
    try {
      if (editingType) {
        await updateUtilityType.mutateAsync({
          id: editingType.id,
          data: {
            name: values.name,
            unit: values.unit,
            isActive: values.isActive,
          },
        });
        toast({
          title: 'Utility type updated',
          description: `${values.name} has been updated successfully.`,
        });
      } else {
        await createUtilityType.mutateAsync({
          code: values.code,
          name: values.name,
          unit: values.unit,
        });
        toast({
          title: 'Utility type created',
          description: `${values.name} has been created successfully.`,
        });
      }
      setDialogOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleSeedDefaults = async () => {
    try {
      await seedUtilityTypes.mutateAsync();
      toast({
        title: 'Defaults seeded',
        description: 'Electric, Water, and Gas utility types have been created.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to seed defaults',
        variant: 'destructive',
      });
    }
  };

  const isSubmitting = createUtilityType.isPending || updateUtilityType.isPending;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Utility Types</h1>
          <p className="text-muted-foreground">
            Manage utility types for meter readings and billing
          </p>
        </div>

        <div className="flex gap-2">
          {utilityTypes.length === 0 && (
            <Button
              variant="outline"
              onClick={handleSeedDefaults}
              disabled={seedUtilityTypes.isPending}
            >
              {seedUtilityTypes.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Seed Defaults
            </Button>
          )}
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Create Utility Type
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Utility Types</CardTitle>
          <CardDescription>
            Utility types define what can be metered and billed (e.g., electricity, water, gas)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : utilityTypes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Zap className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold">No Utility Types</h3>
              <p className="text-muted-foreground mb-4">
                Create utility types to start tracking meter readings.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleSeedDefaults}>
                  Seed Defaults
                </Button>
                <Button onClick={openCreateDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Utility Type
                </Button>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {utilityTypes.map((type) => {
                  const Icon = getUtilityIcon(type.code);
                  return (
                    <TableRow key={type.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <code className="text-sm bg-muted px-2 py-0.5 rounded">
                            {type.code}
                          </code>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{type.name}</TableCell>
                      <TableCell>{type.unit}</TableCell>
                      <TableCell>
                        <Badge variant={type.isActive ? 'success' : 'secondary'}>
                          {type.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(type)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingType ? 'Edit Utility Type' : 'Create Utility Type'}
            </DialogTitle>
            <DialogDescription>
              {editingType
                ? 'Update the utility type details below.'
                : 'Add a new utility type for meter readings and billing.'}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., electric"
                        {...field}
                        disabled={!!editingType}
                      />
                    </FormControl>
                    <FormDescription>
                      Unique identifier (cannot be changed after creation)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Electricity" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit of Measurement</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., kWh, m³" {...field} />
                    </FormControl>
                    <FormDescription>
                      Unit used for meter readings (e.g., kWh, m³, liters)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {editingType && (
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Active</FormLabel>
                        <FormDescription>
                          Inactive types won&apos;t appear in selection lists
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
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingType ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
