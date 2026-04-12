'use client';

import { useState, useCallback } from 'react';
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
  ClipboardList,
  Search,
  ChevronLeft,
  ChevronRight,
  Play,
  CheckCircle2,
} from 'lucide-react';
import { parseAsString, parseAsInteger, useQueryStates } from 'nuqs';
import { useMyIncidents, Incident, useIncidentRealTime } from '@/hooks/use-incidents';
import { useUpdateIncidentStatus } from '@/hooks/use-incidents';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { IncidentDetailSheet } from '../incident-detail-sheet';
import { columns } from '../incident-columns';

export default function MyAssignmentsPage() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);

  const [urlFilters, setUrlFilters] = useQueryStates({
    search: parseAsString.withDefault(''),
    status: parseAsString.withDefault(''),
    priority: parseAsString.withDefault(''),
    page: parseAsInteger.withDefault(1),
  });
  const limit = 20;

  const filters = {
    ...(urlFilters.status && { status: urlFilters.status as 'assigned' | 'in_progress' | 'pending_review' | 'resolved' }),
    ...(urlFilters.priority && { priority: urlFilters.priority as 'low' | 'medium' | 'high' | 'urgent' }),
    ...(urlFilters.search && { search: urlFilters.search }),
  };

  const { data, isLoading, isError } = useMyIncidents(filters, urlFilters.page, limit);
  const updateStatus = useUpdateIncidentStatus();

  useIncidentRealTime({ showToasts: true });

  const table = useReactTable({
    data: data?.data ?? [],
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
  });

  const handleRowClick = useCallback((incident: Incident) => {
    setSelectedIncident(incident);
    setDetailSheetOpen(true);
  }, []);

  const handleQuickStart = useCallback(
    (incidentId: string) => {
      updateStatus.mutate({ id: incidentId, data: { status: 'in_progress' } });
    },
    [updateStatus],
  );

  const handleQuickResolve = useCallback(
    (incidentId: string) => {
      updateStatus.mutate({ id: incidentId, data: { status: 'pending_review' } });
    },
    [updateStatus],
  );

  // Count active items for the header badges
  const incidents = data?.data ?? [];
  const assignedCount = incidents.filter((i) => i.status === 'assigned').length;
  const inProgressCount = incidents.filter((i) => i.status === 'in_progress').length;

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
            <ClipboardList className="h-7 w-7 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">My Assignments</h1>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-muted-foreground">
              Incidents assigned to you
            </p>
            {assignedCount > 0 && (
              <Badge variant="default">{assignedCount} new</Badge>
            )}
            {inProgressCount > 0 && (
              <Badge variant="secondary">{inProgressCount} in progress</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search assignments..."
            value={urlFilters.search}
            onChange={(e) => setUrlFilters({ search: e.target.value, page: 1 })}
            className="pl-9"
          />
        </div>

        <Select
          value={urlFilters.status || 'all'}
          onValueChange={(value) => setUrlFilters({ status: value === 'all' ? '' : value, page: 1 })}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="pending_review">Pending Review</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={urlFilters.priority || 'all'}
          onValueChange={(value) => setUrlFilters({ priority: value === 'all' ? '' : value, page: 1 })}
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
      </div>

      {/* Quick Action Buttons */}
      {incidents.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {incidents
            .filter((i) => i.status === 'assigned')
            .slice(0, 3)
            .map((inc) => (
              <Button
                key={inc.id}
                size="sm"
                variant="outline"
                onClick={() => handleQuickStart(inc.id)}
                disabled={updateStatus.isPending}
              >
                <Play className="mr-1 h-3 w-3" />
                Start: {inc.title.slice(0, 30)}
              </Button>
            ))}
          {incidents
            .filter((i) => i.status === 'in_progress')
            .slice(0, 3)
            .map((inc) => (
              <Button
                key={inc.id}
                size="sm"
                variant="outline"
                onClick={() => handleQuickResolve(inc.id)}
                disabled={updateStatus.isPending}
              >
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Submit: {inc.title.slice(0, 30)}
              </Button>
            ))}
        </div>
      )}

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
            <ClipboardList className="h-8 w-8 mb-2" />
            <p>Failed to load assignments</p>
          </div>
        </div>
      ) : (
        <DataTable
          table={table}
          onRowClick={handleRowClick}
          emptyMessage="No assignments found — you're all caught up!"
        />
      )}

      {/* Pagination */}
      {data?.meta && data.meta.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(urlFilters.page - 1) * limit + 1} to{' '}
            {Math.min(urlFilters.page * limit, data.meta.total)} of {data.meta.total}
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
    </motion.div>
  );
}
