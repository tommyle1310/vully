'use client';

import * as React from 'react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Plus, Loader2, Gauge } from 'lucide-react';
import {
  useColumnFiltersState,
  useTableInstance,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  createColumnHelper,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table';
import { motion } from 'framer-motion';

import {
  useMeterReadings,
  useCreateMeterReading,
  type MeterReading,
  type CreateMeterReadingDto,
} from '@/hooks/use-meter-readings';
import { useApartments } from '@/hooks/use-apartments';
import { useUtilityTypes } from '@/hooks/use-billing';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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

export default function MeterReadingsPage() {
  const [page, setPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedApartmentId, setSelectedApartmentId] = useState<string>('');
  const [selectedUtilityTypeId, setSelectedUtilityTypeId] = useState<string>('');
  const [selectedBillingPeriod, setSelectedBillingPeriod] = useState<string>('');

  // Queries
  const { data: meterReadingsData, isLoading: isLoadingReadings } = useMeterReadings({
    page,
    limit: 20,
    apartmentId: selectedApartmentId || undefined,
    utilityTypeId: selectedUtilityTypeId || undefined,
    billingPeriod: selectedBillingPeriod || undefined,
  });
  const { data: apartmentsData, isLoading: isLoadingApartments } = useApartments({ limit: 100 });
  const { data: utilityTypesData, isLoading: isLoadingUtilityTypes } = useUtilityTypes();

  const createMeterReading = useCreateMeterReading();

  const meterReadings = meterReadingsData?.data ?? [];
  const apartments = apartmentsData?.data ?? [];
  const utilityTypes = utilityTypesData?.data ?? [];
  const totalReadings = meterReadingsData?.meta?.total ?? 0;
  const totalPages = Math.ceil(totalReadings / 20);

  // Form
  const form = useForm<MeterReadingFormValues>({
    resolver: zodResolver(meterReadingSchema),
    defaultValues: {
      apartmentId: '',
      utilityTypeId: '',
      currentValue: 0,
      previousValue: undefined,
      billingPeriod: getCurrentBillingPeriod(),
      readingDate: new Date(),
    },
  });

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
      form.reset();
      setIsFormOpen(false);
    } catch (error) {
      console.error('Failed to create meter reading:', error);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meter Readings</h1>
          <p className="text-muted-foreground">
            Record and manage utility meter readings for apartments
          </p>
        </div>

        <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
          <SheetTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Reading
            </Button>
          </SheetTrigger>
          <SheetContent className="sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Record Meter Reading</SheetTitle>
              <SheetDescription>
                Enter a new meter reading for an apartment utility.
              </SheetDescription>
            </SheetHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-6">
                {/* Apartment Select */}
                <FormField
                  control={form.control}
                  name="apartmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apartment</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select apartment" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {apartments.map((apt) => (
                            <SelectItem key={apt.id} value={apt.id}>
                              {apt.building?.name} - Unit {apt.unitNumber}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Utility Type Select */}
                <FormField
                  control={form.control}
                  name="utilityTypeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Utility Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select utility type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {utilityTypes.map((ut) => (
                            <SelectItem key={ut.id} value={ut.id}>
                              {ut.name} ({ut.unit})
                            </SelectItem>
                          ))}
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
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
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
                    onClick={() => setIsFormOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={createMeterReading.isPending}
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
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="w-[200px]">
              <Select
                value={selectedApartmentId}
                onValueChange={setSelectedApartmentId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Apartments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Apartments</SelectItem>
                  {apartments.map((apt) => (
                    <SelectItem key={apt.id} value={apt.id}>
                      {apt.building?.name} - Unit {apt.unitNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-[180px]">
              <Select
                value={selectedUtilityTypeId}
                onValueChange={setSelectedUtilityTypeId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Utilities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Utilities</SelectItem>
                  {utilityTypes.map((ut) => (
                    <SelectItem key={ut.id} value={ut.id}>
                      {ut.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-[140px]">
              <Input
                placeholder="YYYY-MM"
                value={selectedBillingPeriod}
                onChange={(e) => setSelectedBillingPeriod(e.target.value)}
              />
            </div>

            {(selectedApartmentId || selectedUtilityTypeId || selectedBillingPeriod) && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSelectedApartmentId('');
                  setSelectedUtilityTypeId('');
                  setSelectedBillingPeriod('');
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Readings Table */}
      <Card>
        <CardContent className="p-0">
          {isLoadingReadings ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : meterReadings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Gauge className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold">No Meter Readings</h3>
              <p className="text-muted-foreground mb-4">
                Start by recording your first meter reading.
              </p>
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Reading
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Apartment</TableHead>
                    <TableHead>Utility</TableHead>
                    <TableHead>Billing Period</TableHead>
                    <TableHead>Reading Date</TableHead>
                    <TableHead className="text-right">Previous</TableHead>
                    <TableHead className="text-right">Current</TableHead>
                    <TableHead className="text-right">Usage</TableHead>
                    <TableHead>Recorded By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {meterReadings.map((reading) => (
                    <TableRow key={reading.id}>
                      <TableCell>
                        {reading.apartment ? (
                          <div>
                            <div className="font-medium">
                              Unit {reading.apartment.unitNumber}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {reading.apartment.building?.name}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {reading.utilityType ? (
                          <Badge variant="outline">
                            {reading.utilityType.name}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>{reading.billingPeriod}</TableCell>
                      <TableCell>
                        {format(new Date(reading.readingDate), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {reading.previousValue?.toLocaleString() ?? '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {reading.currentValue.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-mono font-medium">
                          {reading.usage.toLocaleString()}
                        </span>
                        {reading.utilityType && (
                          <span className="text-sm text-muted-foreground ml-1">
                            {reading.utilityType.unit}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {reading.recordedBy ? (
                          <span className="text-sm">
                            {reading.recordedBy.firstName} {reading.recordedBy.lastName}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">System</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Page {page} of {totalPages} • {totalReadings} total readings
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
