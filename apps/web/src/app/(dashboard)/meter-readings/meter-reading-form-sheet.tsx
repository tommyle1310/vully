'use client';

import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Loader2, Zap, Droplets, Flame, Check, ChevronsUpDown } from 'lucide-react';
import Link from 'next/link';

import {
  useCreateMeterReading,
  type CreateMeterReadingDto,
} from '@/hooks/use-meter-readings';
import { useApartments, type Apartment } from '@/hooks/use-apartments';
import { useUtilityTypes, type UtilityType } from '@/hooks/use-billing';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/use-debounce';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

// Get current billing period (YYYY-MM format)
function getCurrentBillingPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// Form schema
const meterReadingSchema = z.object({
  apartmentId: z.string().min(1, 'Select an apartment'),
  utilityTypeId: z.string().min(1, 'Select a utility type'),
  currentValue: z.number().min(0, 'Current value must be positive'),
  previousValue: z.number().min(0, 'Previous value must be positive').optional(),
  billingPeriod: z.string().regex(/^\d{4}-\d{2}$/, 'Invalid billing period format'),
  readingDate: z.date({ required_error: 'Reading date is required' }),
});

type MeterReadingFormValues = z.infer<typeof meterReadingSchema>;

// Icon mapping for utility types
const UTILITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  electric: Zap,
  water: Droplets,
  gas: Flame,
};

interface MeterReadingFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-select apartment (useful when called from apartment detail page) */
  apartmentId?: string;
  /** Pre-select utility type */
  utilityTypeId?: string;
}

export function MeterReadingFormSheet({
  open,
  onOpenChange,
  apartmentId,
  utilityTypeId,
}: MeterReadingFormSheetProps) {
  const { toast } = useToast();
  const createMeterReading = useCreateMeterReading();
  const { data: apartmentsData, isLoading: apartmentsLoading } = useApartments({ limit: 500 });
  const { data: utilityTypesData } = useUtilityTypes();

  const [apartmentSearch, setApartmentSearch] = useState('');
  const [apartmentComboOpen, setApartmentComboOpen] = useState(false);

  const apartments = apartmentsData?.data ?? [];
  const utilityTypes = utilityTypesData?.data ?? [];
  const activeUtilityTypes = utilityTypes.filter((ut) => ut.isActive);

  // Debug: Log apartments data
  useEffect(() => {
    if (open && apartments.length > 0) {
      console.log('[MeterReading] Loaded apartments:', apartments.length);
      console.log('[MeterReading] Sample:', apartments.slice(0, 3).map(a => ({
        unit: a.unit_number,
        building: a.building?.name,
        code: a.apartmentCode
      })));
    }
  }, [open, apartments]);

  // Filter apartments - use immediate search value (no debounce needed for client-side filtering)
  const filteredApartments = useMemo(() => {
    if (!apartmentSearch.trim()) return apartments;
    const searchLower = apartmentSearch.toLowerCase();
    const filtered = apartments.filter(
      (apt) => {
        const unitMatch = apt.unit_number?.toLowerCase().includes(searchLower);
        const buildingMatch = apt.building?.name?.toLowerCase().includes(searchLower);
        const codeMatch = apt.apartmentCode?.toLowerCase().includes(searchLower);
        return unitMatch || buildingMatch || codeMatch;
      }
    );
    console.log('[MeterReading] Search:', searchLower, 'Results:', filtered.length);
    return filtered;
  }, [apartments, apartmentSearch]);

  const form = useForm<MeterReadingFormValues>({
    resolver: zodResolver(meterReadingSchema),
    defaultValues: {
      apartmentId: apartmentId || '',
      utilityTypeId: utilityTypeId || '',
      currentValue: 0,
      previousValue: undefined,
      billingPeriod: getCurrentBillingPeriod(),
      readingDate: new Date(),
    },
  });

  // Reset form when dialog opens with pre-selected values
  useEffect(() => {
    if (open) {
      form.reset({
        apartmentId: apartmentId || '',
        utilityTypeId: utilityTypeId || '',
        currentValue: 0,
        previousValue: undefined,
        billingPeriod: getCurrentBillingPeriod(),
        readingDate: new Date(),
      });
    }
  }, [open, apartmentId, utilityTypeId, form]);

  async function onSubmit(values: MeterReadingFormValues) {
    try {
      const dto: CreateMeterReadingDto = {
        apartmentId: values.apartmentId,
        utilityTypeId: values.utilityTypeId,
        currentValue: values.currentValue,
        previousValue: values.previousValue,
        billingPeriod: values.billingPeriod,
        readingDate: values.readingDate.toISOString(),
      };

      await createMeterReading.mutateAsync(dto);
      toast({
        title: 'Meter reading recorded',
        description: 'The meter reading has been saved successfully.',
      });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to record meter reading',
        variant: 'destructive',
      });
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Record Meter Reading</SheetTitle>
          <SheetDescription>
            Enter a new meter reading for an apartment utility.
          </SheetDescription>
        </SheetHeader>

        {/* Warning if no utility types */}
        {activeUtilityTypes.length === 0 && (
          <Alert className="mt-4">
            <Zap className="h-4 w-4" />
            <AlertDescription>
              No utility types available.{' '}
              <Link href="/utility-types" className="underline font-medium">
                Create utility types
              </Link>{' '}
              first to record meter readings.
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-6">
            {/* Apartment Combobox with Search */}
            <FormField
              control={form.control}
              name="apartmentId"
              render={({ field }) => {
                const selectedApartment = apartments.find((apt) => apt.id === field.value);
                return (
                  <FormItem className="flex flex-col">
                    <FormLabel>Apartment</FormLabel>
                    <Popover open={apartmentComboOpen} onOpenChange={setApartmentComboOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            disabled={!!apartmentId}
                            className={cn(
                              'w-full justify-between font-normal',
                              !field.value && 'text-muted-foreground',
                            )}
                          >
                            {selectedApartment ? (
                              <span>
                                {selectedApartment.building?.name} - Unit {selectedApartment.unit_number}
                              </span>
                            ) : (
                              <span>Select apartment</span>
                            )}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0" align="start">
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Search apartments..."
                            value={apartmentSearch}
                            onValueChange={setApartmentSearch}
                          />
                          <CommandList>
                            <CommandEmpty>
                              {apartmentsLoading ? 'Loading apartments...' : 
                               apartments.length === 0 ? 'No apartments available.' :
                               'No apartments found.'}
                            </CommandEmpty>
                            <CommandGroup>
                              {filteredApartments.map((apt) => (
                                <CommandItem
                                  key={apt.id}
                                  value={apt.id}
                                  onSelect={() => {
                                    field.onChange(apt.id);
                                    setApartmentComboOpen(false);
                                    setApartmentSearch('');
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      'mr-2 h-4 w-4',
                                      field.value === apt.id ? 'opacity-100' : 'opacity-0',
                                    )}
                                  />
                                  <div className="flex flex-col">
                                    <span className="font-medium">
                                      {apt.building?.name} - Unit {apt.unit_number}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      Floor {apt.floorIndex} • {apt.bedroomCount} beds
                                    </span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            {/* Utility Type Select */}
            <FormField
              control={form.control}
              name="utilityTypeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Utility Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || undefined}
                    disabled={activeUtilityTypes.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select utility type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {activeUtilityTypes.map((ut) => {
                        const Icon = UTILITY_ICONS[ut.code] || Zap;
                        return (
                          <SelectItem key={ut.id} value={ut.id}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              {ut.name} ({ut.unit})
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Billing Period */}
            <FormField
              control={form.control}
              name="billingPeriod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Billing Period</FormLabel>
                  <FormControl>
                    <Input placeholder="YYYY-MM" {...field} />
                  </FormControl>
                  <FormDescription>Format: YYYY-MM (e.g., 2024-01)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Reading Date */}
            <FormField
              control={form.control}
              name="readingDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Reading Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground',
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'PPP')
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date('2020-01-01')
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Previous Value */}
            <FormField
              control={form.control}
              name="previousValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Previous Reading (optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="Leave blank to auto-detect"
                      {...field}
                      onChange={(e) =>
                        field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)
                      }
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormDescription>
                    If not provided, system will use the last recorded reading.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Current Value */}
            <FormField
              control={form.control}
              name="currentValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Reading</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="Enter current meter value"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={createMeterReading.isPending || activeUtilityTypes.length === 0}
              >
                {createMeterReading.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Reading
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
