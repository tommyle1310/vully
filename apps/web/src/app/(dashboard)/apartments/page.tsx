'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';
import { Building, Search, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { parseAsString, parseAsArrayOf, parseAsInteger, useQueryStates } from 'nuqs';
import { useAuthStore } from '@/stores/authStore';
import { useMyApartment, useMyContracts } from '@/hooks/use-contracts';
import { useApartments, useApartment, Apartment } from '@/hooks/use-apartments';
import { useDebounce } from '@/hooks/use-debounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/ui/data-table';
import { ApartmentDetailSheet } from './apartment-detail-sheet';
import { ApartmentFormDialog } from './apartment-form-dialog';
import { ApartmentFilters, ApartmentFilterValues } from './apartment-filters';
import { columns, ApartmentTableSkeleton } from './apartment-columns';

export default function ApartmentsPage() {
  const { hasAnyRole } = useAuthStore();
  const isAdmin = hasAnyRole(['admin', 'technician']);
  const { data: myApartmentData } = useMyApartment();
  const { data: myContractsData } = useMyContracts();
  const myApartment = myApartmentData?.data;
  
  // Fallback: If useMyApartment doesn't return data, try to get apartment from active contract
  const activeContract = myContractsData?.data?.find((c) => c.status === 'active');
  const residentApartmentId = myApartment?.apartmentId || activeContract?.apartment?.id;
  
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [searchInput, setSearchInput] = useState(''); // Local state for instant UI feedback
  const debouncedSearch = useDebounce(searchInput, 300); // Debounced for API calls
  const [selectedApartment, setSelectedApartment] = useState<Apartment | null>(null);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingApartment, setEditingApartment] = useState<Apartment | null>(null);

  // URL state with nuqs
  const [urlFilters, setUrlFilters] = useQueryStates({
    search: parseAsString,
    buildingId: parseAsString,
    status: parseAsArrayOf(parseAsString).withDefault([]),
    unitType: parseAsArrayOf(parseAsString).withDefault([]),
    minBedrooms: parseAsInteger,
    maxBedrooms: parseAsInteger,
    minFloor: parseAsInteger,
    maxFloor: parseAsInteger,
    minArea: parseAsInteger,
    maxArea: parseAsInteger,
    page: parseAsInteger.withDefault(1),
    limit: parseAsInteger.withDefault(20),
  });

  const debouncedMinArea = useDebounce(urlFilters.minArea, 300);
  const debouncedMaxArea = useDebounce(urlFilters.maxArea, 300);

  // Update URL search when debounced value changes
  useEffect(() => {
    setUrlFilters({ search: debouncedSearch || undefined, page: 1 });
  }, [debouncedSearch]);

  const filterValues: ApartmentFilterValues = {
    buildingId: urlFilters.buildingId,
    status: urlFilters.status,
    unitType: urlFilters.unitType,
    minBedrooms: urlFilters.minBedrooms,
    maxBedrooms: urlFilters.maxBedrooms,
    minFloor: urlFilters.minFloor,
    maxFloor: urlFilters.maxFloor,
    minArea: urlFilters.minArea,
    maxArea: urlFilters.maxArea,
  };

  const handleFiltersChange = (newFilters: ApartmentFilterValues) => {
    setUrlFilters({
      buildingId: newFilters.buildingId,
      status: newFilters.status,
      unitType: newFilters.unitType,
      minBedrooms: newFilters.minBedrooms,
      maxBedrooms: newFilters.maxBedrooms,
      minFloor: newFilters.minFloor,
      maxFloor: newFilters.maxFloor,
      minArea: newFilters.minArea,
      maxArea: newFilters.maxArea,
      page: 1, // Reset to first page on filter change
    });
  };

  const handleCreateApartment = () => {
    setEditingApartment(null);
    setFormMode('create');
    setFormDialogOpen(true);
  };

  const handleEditApartment = (apartment: Apartment) => {
    setEditingApartment(apartment);
    setFormMode('edit');
    setFormDialogOpen(true);
    setSelectedApartment(null); // Close the detail sheet
  };

  // For admin: fetch paginated apartments with filters
  // For resident: fetch their specific apartment by ID
  const { data, isLoading: isLoadingAllApartments, error } = useApartments({
    search: isAdmin ? (urlFilters.search || undefined) : undefined, // Add search parameter
    buildingId: isAdmin ? (urlFilters.buildingId || undefined) : undefined,
    status: isAdmin && urlFilters.status.length > 0 ? urlFilters.status : undefined,
    unitType: isAdmin && urlFilters.unitType.length > 0 ? urlFilters.unitType : undefined,
    minBedrooms: isAdmin ? (urlFilters.minBedrooms || undefined) : undefined,
    maxBedrooms: isAdmin ? (urlFilters.maxBedrooms || undefined) : undefined,
    minFloor: isAdmin ? (urlFilters.minFloor || undefined) : undefined,
    maxFloor: isAdmin ? (urlFilters.maxFloor || undefined) : undefined,
    minArea: isAdmin ? (debouncedMinArea || undefined) : undefined,
    maxArea: isAdmin ? (debouncedMaxArea || undefined) : undefined,
    page: isAdmin ? urlFilters.page : 1,
    limit: isAdmin ? urlFilters.limit : 1,
  });
  
  const { data: residentApartmentData, isLoading: isLoadingResidentApartment } = useApartment(
    !isAdmin && residentApartmentId ? residentApartmentId : ''
  );
  
  // Combine results
  const apartments = isAdmin 
    ? (data?.data || []) 
    : (residentApartmentData?.data ? [residentApartmentData.data] : []);
  const isLoading = isAdmin ? isLoadingAllApartments : isLoadingResidentApartment;

  const meta = data?.meta;
  const totalPages = meta ? Math.ceil(meta.total / meta.limit) : 1;

  // Sync debounced search to URL (triggers API refetch)
  useEffect(() => {
    if (isAdmin) {
      setUrlFilters({ search: debouncedSearch || undefined, page: 1 });
    }
  }, [debouncedSearch, isAdmin]);

  const table = useReactTable({
    data: apartments,
    columns,
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true, // Server-side pagination
    manualFiltering: true, // Server-side filtering via API
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Apartments</h1>
          <p className="text-muted-foreground">
            Manage all apartments across your buildings.
          </p>
        </div>
        <ApartmentTableSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <Building className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold">Failed to load apartments</h2>
          <p className="text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {isAdmin ? 'Apartments' : 'My Apartment'}
        </h1>
        <p className="text-muted-foreground">
          {isAdmin
            ? 'Manage all apartments across your buildings.'
            : 'View your apartment details and information.'}
        </p>
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          {isAdmin && (
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by unit, building, code..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9"
              />
            </div>
          )}
          {isAdmin && (
            <Button onClick={handleCreateApartment}>
              <Plus className="h-4 w-4 mr-2" />
              Add Apartment
            </Button>
          )}
        </div>
        {isAdmin && (
          <ApartmentFilters filters={filterValues} onFiltersChange={handleFiltersChange} />
        )}
      </div>

      {/* Table */}
      <DataTable
        table={table}
        onRowClick={setSelectedApartment}
        defaultColumnWidths={[100, 140, 140, 140, 100, 100,150]}
        emptyMessage="No apartments found."
      />

      {/* Pagination */}
      {isAdmin && meta && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground">
              Showing {apartments.length} of {meta.total} apartments
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Per page:</span>
              <Input
                type="number"
                min={1}
                max={100}
                value={urlFilters.limit}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (v > 0 && v <= 100) {
                    setUrlFilters({ limit: v, page: 1 });
                  }
                }}
                className="w-20 h-8 text-sm"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUrlFilters({ page: Math.max(1, urlFilters.page - 1) })}
              disabled={urlFilters.page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm">
              Page {urlFilters.page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUrlFilters({ page: Math.min(totalPages, urlFilters.page + 1) })}
              disabled={urlFilters.page >= totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Sheet */}
      <ApartmentDetailSheet
        apartment={selectedApartment}
        open={!!selectedApartment}
        onOpenChange={(open) => !open && setSelectedApartment(null)}
        onEdit={handleEditApartment}
      />

      {/* Create/Edit Dialog */}
      <ApartmentFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        apartment={editingApartment}
        mode={formMode}
      />
    </motion.div>
  );
}
