'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';
import { Building as BuildingIcon, Search, ChevronLeft, ChevronRight, Plus, MapPin, ExternalLink } from 'lucide-react';
import { useBuildings, Building } from '@/hooks/use-buildings';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow, // Updated to trigger TS recompile
} from '@/components/ui/table';
import { BuildingFormDialog } from './building-form-dialog';
import { BuildingDetailSheet } from './building-detail-sheet';
import { ResizeHandle } from '@/components/ui/resize-handle';
import { useResizableColumns } from '@/hooks/use-resizable-columns';

const DEFAULT_COLUMN_WIDTHS = [180, 140, 220, 100, 200, 100, 100] as const;

const columnHelper = createColumnHelper<Building>();

const columns = [
  columnHelper.accessor('name', {
    header: 'Building Name',
    cell: (info) => (
      <div>
        <span className="font-medium">{info.getValue()}</span>
        {info.row.original.apartmentCount !== undefined && (
          <span className="block text-xs text-muted-foreground">
            {info.row.original.apartmentCount} apartments
          </span>
        )}
      </div>
    ),
  }),
  columnHelper.accessor('city', {
    header: 'City',
    cell: (info) => (
      <div className="flex items-center gap-2">
        <MapPin className="h-3 w-3 text-muted-foreground" />
        <span>{info.getValue()}</span>
      </div>
    ),
  }),
  columnHelper.accessor('address', {
    header: 'Address',
    cell: (info) => (
      <span className="text-sm text-muted-foreground">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor('floorCount', {
    header: 'Floors',
    cell: (info) => `${info.getValue()} floors`,
  }),
  columnHelper.accessor('amenities', {
    header: 'Amenities',
    cell: (info) => {
      const amenities = info.getValue();
      if (!amenities || amenities.length === 0) return <span className="text-muted-foreground">—</span>;
      
      return (
        <div className="flex flex-wrap gap-1">
          {amenities.slice(0, 3).map((amenity) => (
            <Badge key={amenity} variant="secondary" className="text-xs">
              {amenity}
            </Badge>
          ))}
          {amenities.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{amenities.length - 3}
            </Badge>
          )}
        </div>
      );
    },
  }),
  columnHelper.accessor('isActive', {
    header: 'Status',
    cell: (info) => (
      <Badge variant={info.getValue() ? 'success' : 'secondary'}>
        {info.getValue() ? 'Active' : 'Inactive'}
      </Badge>
    ),
  }),
  columnHelper.display({
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => (
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          window.location.href = `/buildings/${row.original.id}`;
        }}
      >
        <ExternalLink className="h-4 w-4 mr-1" />
        View
      </Button>
    ),
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
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-4 w-24" />
            ))}
          </div>
        </div>
        {[1, 2, 3, 4, 5].map((row) => (
          <div key={row} className="border-b p-4">
            <div className="flex gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-4 w-24" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BuildingsPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.roles?.includes('admin');

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [page, setPage] = useState(1);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
  const [includeInactive, setIncludeInactive] = useState(false);
  const { widths, startResize } = useResizableColumns(DEFAULT_COLUMN_WIDTHS);

  const handleCreateBuilding = () => {
    setEditingBuilding(null);
    setFormMode('create');
    setFormDialogOpen(true);
  };

  const handleEditBuilding = (building: Building) => {
    setEditingBuilding(building);
    setFormMode('edit');
    setFormDialogOpen(true);
    setSelectedBuilding(null);
  };

  const { data, isLoading, error } = useBuildings({ 
    page, 
    limit: 20,
    includeInactive 
  });

  const buildings = data?.data || [];
  const meta = data?.meta;

  const table = useReactTable({
    data: buildings,
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
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Buildings</h1>
          <p className="text-muted-foreground">
            Manage all buildings in your property portfolio.
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
          <BuildingIcon className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold">Failed to load buildings</h2>
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
        <h1 className="text-3xl font-bold tracking-tight">Buildings</h1>
        <p className="text-muted-foreground">
          Manage all buildings in your property portfolio.
        </p>
      </div>

      {/* Admin-only notice */}
      {!isAdmin && (
        <Alert>
          <AlertDescription>
            You are viewing buildings in read-only mode. Creating and editing buildings requires admin privileges.
          </AlertDescription>
        </Alert>
      )}

      {/* Filters & Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search buildings..."
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant={includeInactive ? 'default' : 'outline'}
            onClick={() => setIncludeInactive(!includeInactive)}
          >
            {includeInactive ? 'Showing All' : 'Active Only'}
          </Button>
        </div>
        {isAdmin && (
          <Button onClick={handleCreateBuilding}>
            <Plus className="h-4 w-4 mr-2" />
            Add Building
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table style={{ tableLayout: 'fixed' }}>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header, idx) => (
                  <TableHead
                    key={header.id}
                    className="relative cursor-pointer select-none overflow-hidden"
                    style={{ width: widths[idx] }}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                    <ResizeHandle onMouseDown={startResize(idx)} />
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
                    No buildings found.
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
                    onClick={() => setSelectedBuilding(row.original)}
                  >
                    {row.getVisibleCells().map((cell, idx) => (
                      <TableCell
                        key={cell.id}
                        className="overflow-hidden text-ellipsis"
                        style={{ width: widths[idx] }}
                      >
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
          <p className="text-sm text-muted-foreground">
            Showing {buildings.length} of {meta.total} buildings
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm">
              Page {meta.page} of {Math.ceil(meta.total / (meta.limit || 20))}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(Math.ceil(meta.total / (meta.limit || 20)), p + 1))}
              disabled={page >= Math.ceil(meta.total / (meta.limit || 20))}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Sheet */}
      <BuildingDetailSheet
        building={selectedBuilding}
        open={!!selectedBuilding}
        onOpenChange={(open: boolean) => !open && setSelectedBuilding(null)}
        onEdit={handleEditBuilding}
      />

      {/* Create/Edit Dialog */}
      <BuildingFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        building={editingBuilding}
        mode={formMode}
      />
    </motion.div>
  );
}
