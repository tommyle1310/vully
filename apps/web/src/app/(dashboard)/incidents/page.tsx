'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';
import {
  AlertTriangle,
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { parseAsString, parseAsInteger, useQueryStates } from 'nuqs';
import { useIncidents, Incident, useIncidentRealTime } from '@/hooks/use-incidents';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from '@/components/ui/data-table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { IncidentDetailSheet } from './incident-detail-sheet';
import { CreateIncidentDialog } from './create-incident-dialog';
import { columns } from './incident-columns';

export default function IncidentsPage() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // URL state with nuqs
  const [urlFilters, setUrlFilters] = useQueryStates({
    search: parseAsString.withDefault(''),
    status: parseAsString.withDefault(''),
    priority: parseAsString.withDefault(''),
    category: parseAsString.withDefault(''),
    page: parseAsInteger.withDefault(1),
  });
  const limit = 20;

  const filters = {
    ...(urlFilters.status && { status: urlFilters.status as 'open' | 'assigned' | 'in_progress' | 'pending_review' | 'resolved' | 'closed' }),
    ...(urlFilters.priority && { priority: urlFilters.priority as 'low' | 'medium' | 'high' | 'urgent' }),
    ...(urlFilters.category && { category: urlFilters.category as 'plumbing' | 'electrical' | 'hvac' | 'structural' | 'appliance' | 'pest' | 'noise' | 'security' | 'other' }),
    ...(urlFilters.search && { search: urlFilters.search }),
  };

  const { data, isLoading, isError } = useIncidents(filters, urlFilters.page, limit);

  // Enable real-time incident updates via WebSocket
  const { connected: wsConnected } = useIncidentRealTime({
    showToasts: true,
  });

  const table = useReactTable({
    data: data?.data ?? [],
    columns,
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
  });

  const handleRowClick = (incident: Incident) => {
    setSelectedIncident(incident);
    setDetailSheetOpen(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Incidents</h1>
            {wsConnected && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 dark:bg-green-950 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                Live
              </span>
            )}
          </div>
          <p className="text-muted-foreground">
            Manage and track maintenance incidents
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Report Incident
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search incidents..."
            value={urlFilters.search}
            onChange={(e) => {
              setUrlFilters({ search: e.target.value, page: 1 });
            }}
            className="pl-9"
          />
        </div>

        <Select
          value={urlFilters.status || 'all'}
          onValueChange={(value) => {
            setUrlFilters({ status: value === 'all' ? '' : value, page: 1 });
          }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="pending_review">Pending Review</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={urlFilters.priority || 'all'}
          onValueChange={(value) => {
            setUrlFilters({ priority: value === 'all' ? '' : value, page: 1 });
          }}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={urlFilters.category || 'all'}
          onValueChange={(value) => {
            setUrlFilters({ category: value === 'all' ? '' : value, page: 1 });
          }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="plumbing">Plumbing</SelectItem>
            <SelectItem value="electrical">Electrical</SelectItem>
            <SelectItem value="hvac">HVAC</SelectItem>
            <SelectItem value="structural">Structural</SelectItem>
            <SelectItem value="appliance">Appliance</SelectItem>
            <SelectItem value="pest">Pest Control</SelectItem>
            <SelectItem value="noise">Noise</SelectItem>
            <SelectItem value="security">Security</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="rounded-md border">
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      ) : isError ? (
        <div className="rounded-md border">
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mb-2" />
            <p>Failed to load incidents</p>
          </div>
        </div>
      ) : (
        <DataTable
          table={table}
          onRowClick={handleRowClick}
          defaultColumnWidths={[150, 100, 140, 80, 100, 100,100]}
          emptyMessage="No incidents found"
        />
      )}

      {/* Pagination */}
      {data?.meta && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(urlFilters.page - 1) * limit + 1} to{' '}
            {Math.min(urlFilters.page * limit, data.meta.total)} of {data.meta.total}{' '}
            incidents
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUrlFilters({ page: Math.max(1, urlFilters.page - 1) })}
              disabled={urlFilters.page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm">
              Page {urlFilters.page} of {data.meta.pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUrlFilters({ page: Math.min(data.meta.pages, urlFilters.page + 1) })}
              disabled={urlFilters.page >= data.meta.pages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Sheet */}
      <IncidentDetailSheet
        incident={selectedIncident}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
      />

      {/* Create Dialog */}
      <CreateIncidentDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </motion.div>
  );
}
