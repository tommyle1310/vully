'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Plus, Gauge } from 'lucide-react';
import { motion } from 'framer-motion';

import { useMeterReadings } from '@/hooks/use-meter-readings';
import { useApartments } from '@/hooks/use-apartments';
import { useUtilityTypes } from '@/hooks/use-billing';
import { useAuthStore } from '@/stores/authStore';
import { useMyApartment, useMyContracts } from '@/hooks/use-contracts';

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

import { MeterReadingFormSheet } from './meter-reading-form-sheet';

export default function MeterReadingsPage() {
  const { hasAnyRole } = useAuthStore();
  const isAdmin = hasAnyRole(['admin', 'technician']);
  const { data: myApartmentData } = useMyApartment();
  const { data: myContractsData } = useMyContracts();
  const myApartment = myApartmentData?.data;
  
  // Fallback: If useMyApartment doesn't return data, try to get apartment from active contract
  const activeContract = myContractsData?.data?.find((c: { status: string }) => c.status === 'active');
  const apartmentId = myApartment?.apartmentId || activeContract?.apartment?.id;
  
  const [page, setPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedApartmentId, setSelectedApartmentId] = useState<string>('');
  const [selectedUtilityTypeId, setSelectedUtilityTypeId] = useState<string>('');
  const [selectedBillingPeriod, setSelectedBillingPeriod] = useState<string>('');

  // Queries
  const { data: meterReadingsData, isLoading: isLoadingReadings } = useMeterReadings({
    page,
    limit: 20,
    apartmentId: !isAdmin && apartmentId ? apartmentId : (selectedApartmentId || undefined),
    utilityTypeId: selectedUtilityTypeId || undefined,
    billingPeriod: selectedBillingPeriod || undefined,
  });
  const { data: apartmentsData } = useApartments({ limit: 100 });
  const { data: utilityTypesData } = useUtilityTypes();

  const meterReadings = meterReadingsData?.data ?? [];
  const apartments = apartmentsData?.data ?? [];
  const utilityTypes = utilityTypesData?.data ?? [];
  const totalReadings = meterReadingsData?.meta?.total ?? 0;
  const totalPages = Math.ceil(totalReadings / 20);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isAdmin ? 'Meter Readings' : 'My Meter Readings'}
          </h1>
          <p className="text-muted-foreground">
            {isAdmin
              ? 'Record and manage utility meter readings for apartments'
              : 'View your utility meter readings and usage history'}
          </p>
        </div>

        {isAdmin && (
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Reading
          </Button>
        )}
      </div>

      {/* Meter Reading Form Sheet */}
      <MeterReadingFormSheet open={isFormOpen} onOpenChange={setIsFormOpen} />

      {/* Filters */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="w-[200px]">
                <Select
                  value={selectedApartmentId || 'all'}
                  onValueChange={(value) => setSelectedApartmentId(value === 'all' ? '' : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Apartments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Apartments</SelectItem>
                    {apartments.map((apt) => (
                      <SelectItem key={apt.id} value={apt.id}>
                        {apt.building?.name} - Unit {apt.unit_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-[180px]">
                <Select
                  value={selectedUtilityTypeId || 'all'}
                  onValueChange={(value) => setSelectedUtilityTypeId(value === 'all' ? '' : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Utilities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Utilities</SelectItem>
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
      )}

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
                {isAdmin
                  ? 'Start by recording your first meter reading.'
                  : 'No meter readings recorded yet for your apartment.'}
              </p>
              {isAdmin && (
                <Button onClick={() => setIsFormOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Reading
                </Button>
              )}
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
                              Unit {reading.apartment.unit_number}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {reading.apartment.buildings?.name}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {reading.utilityType ? (
                          <Badge variant="outline">{reading.utilityType.name}</Badge>
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
