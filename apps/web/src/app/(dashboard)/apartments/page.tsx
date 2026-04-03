'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';
import { Building, Search, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { parseAsString, parseAsArrayOf, parseAsInteger, useQueryStates } from 'nuqs';
import { useApartments, Apartment } from '@/hooks/use-apartments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ApartmentDetailSheet } from './apartment-detail-sheet';
import { ApartmentFormDialog } from './apartment-form-dialog';
import { ApartmentFilters, ApartmentFilterValues } from './apartment-filters';

const columnHelper = createColumnHelper<Apartment>();

const statusVariants: Record<string, 'default' | 'success' | 'warning' | 'destructive'> = {
  vacant: 'success',
  occupied: 'default',
  maintenance: 'warning',
  reserved: 'default',
};

const columns = [
  columnHelper.accessor('unit_number', {
    header: 'Unit',
    cell: (info) => (
      <span className="font-medium">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor('building.name', {
    header: 'Building',
    cell: (info) => info.getValue() || '-',
  }),
  columnHelper.accessor('floorIndex', {
    header: 'Floor',
    cell: (info) => `Floor ${info.getValue()}`,
  }),
  columnHelper.accessor('grossArea', {
    header: 'Area',
    cell: (info) => info.getValue() ? `${info.getValue()} m²` : '-',
  }),
  columnHelper.accessor('bedroomCount', {
    header: 'Beds',
  }),
  columnHelper.accessor('bathroomCount', {
    header: 'Baths',
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => {
      const status = info.getValue();
      return (
        <Badge variant={statusVariants[status] || 'default'}>
          {status.charAt(0) + status.slice(1).toLowerCase()}
        </Badge>
      );
    },
  }),
];

function TableSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="rounded-md border">
        <div className="border-b p-4">
          <div className="flex gap-4">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <Skeleton key={i} className="h-4 w-20" />
            ))}
          </div>
        </div>
        {[1, 2, 3, 4, 5].map((row) => (
          <div key={row} className="border-b p-4">
            <div className="flex gap-4">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <Skeleton key={i} className="h-4 w-20" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ApartmentsPage() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedApartment, setSelectedApartment] = useState<Apartment | null>(null);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingApartment, setEditingApartment] = useState<Apartment | null>(null);

  // URL state with nuqs
  const [urlFilters, setUrlFilters] = useQueryStates({
    buildingId: parseAsString,
    status: parseAsArrayOf(parseAsString).withDefault([]),
    unitType: parseAsArrayOf(parseAsString).withDefault([]),
    minBedrooms: parseAsInteger,
    maxBedrooms: parseAsInteger,
    minFloor: parseAsInteger,
    maxFloor: parseAsInteger,
    page: parseAsInteger.withDefault(1),
    limit: parseAsInteger.withDefault(20),
  });

  const filterValues: ApartmentFilterValues = {
    buildingId: urlFilters.buildingId,
    status: urlFilters.status,
    unitType: urlFilters.unitType,
    minBedrooms: urlFilters.minBedrooms,
    maxBedrooms: urlFilters.maxBedrooms,
    minFloor: urlFilters.minFloor,
    maxFloor: urlFilters.maxFloor,
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

  const { data, isLoading, error } = useApartments({
    buildingId: urlFilters.buildingId || undefined,
    status: urlFilters.status.length > 0 ? urlFilters.status : undefined,
    unitType: urlFilters.unitType.length > 0 ? urlFilters.unitType : undefined,
    minBedrooms: urlFilters.minBedrooms || undefined,
    maxBedrooms: urlFilters.maxBedrooms || undefined,
    minFloor: urlFilters.minFloor || undefined,
    maxFloor: urlFilters.maxFloor || undefined,
    page: urlFilters.page,
    limit: urlFilters.limit,
  });

  const apartments = data?.data || [];
  const meta = data?.meta;
  const totalPages = meta ? Math.ceil(meta.total / meta.limit) : 1;

  const table = useReactTable({
    data: apartments,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
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
        <TableSkeleton />
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Apartments</h1>
        <p className="text-muted-foreground">
          Manage all apartments across your buildings.
        </p>
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search apartments..."
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={handleCreateApartment}>
            <Plus className="h-4 w-4 mr-2" />
            Add Apartment
          </Button>
        </div>
        <ApartmentFilters filters={filterValues} onFiltersChange={handleFiltersChange} />
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="cursor-pointer select-none"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            <AnimatePresence mode="popLayout">
              {table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No apartments found.
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <motion.tr
                    key={row.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="border-b transition-colors hover:bg-muted/50 cursor-pointer"
                    onClick={() => setSelectedApartment(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </motion.tr>
                ))
              )}
            </AnimatePresence>
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {meta && (
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
    </div>
  );
}
