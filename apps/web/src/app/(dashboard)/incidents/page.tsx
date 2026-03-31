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
import {
  AlertTriangle,
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  AlertCircle,
  Clock,
  CheckCircle,
  User,
  Wrench,
  CircleDot,
} from 'lucide-react';
import { useIncidents, Incident, useIncidentRealTime } from '@/hooks/use-incidents';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { IncidentDetailSheet } from './incident-detail-sheet';
import { CreateIncidentDialog } from './create-incident-dialog';

const columnHelper = createColumnHelper<Incident>();

const statusConfig: Record<
  Incident['status'],
  { label: string; variant: 'default' | 'secondary' | 'warning' | 'success' | 'destructive'; icon: typeof Clock }
> = {
  open: { label: 'Open', variant: 'destructive', icon: AlertCircle },
  assigned: { label: 'Assigned', variant: 'warning', icon: User },
  in_progress: { label: 'In Progress', variant: 'default', icon: Wrench },
  pending_review: { label: 'Pending Review', variant: 'secondary', icon: Clock },
  resolved: { label: 'Resolved', variant: 'success', icon: CheckCircle },
  closed: { label: 'Closed', variant: 'secondary', icon: CircleDot },
};

const priorityConfig: Record<
  Incident['priority'],
  { label: string; variant: 'default' | 'secondary' | 'warning' | 'destructive' }
> = {
  low: { label: 'Low', variant: 'secondary' },
  medium: { label: 'Medium', variant: 'default' },
  high: { label: 'High', variant: 'warning' },
  urgent: { label: 'Urgent', variant: 'destructive' },
};

const categoryLabels: Record<string, string> = {
  plumbing: 'Plumbing',
  electrical: 'Electrical',
  hvac: 'HVAC',
  structural: 'Structural',
  appliance: 'Appliance',
  pest: 'Pest Control',
  noise: 'Noise',
  security: 'Security',
  other: 'Other',
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getFullName(user?: { firstName: string; lastName: string }): string {
  if (!user) return '-';
  return `${user.firstName} ${user.lastName}`;
}

const columns = [
  columnHelper.accessor('title', {
    header: 'Incident',
    cell: (info) => {
      const incident = info.row.original;
      return (
        <div className="max-w-[300px]">
          <span className="font-medium line-clamp-1">{info.getValue()}</span>
          <span className="block text-xs text-muted-foreground">
            {categoryLabels[incident.category] ?? incident.category}
          </span>
        </div>
      );
    },
  }),
  columnHelper.accessor('apartment', {
    header: 'Location',
    cell: (info) => {
      const apartment = info.getValue();
      if (!apartment) return '-';
      return (
        <div>
          <span className="font-medium">{apartment.unitNumber}</span>
          <span className="block text-xs text-muted-foreground">
            {apartment.building?.name || ''}
          </span>
        </div>
      );
    },
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => {
      const status = info.getValue();
      const config = statusConfig[status];
      const Icon = config.icon;
      return (
        <Badge variant={(config.variant ?? 'secondary') as 'default' | 'secondary' | 'destructive' | 'outline'} className="gap-1">
          <Icon className="h-3 w-3" />
          {config.label}
        </Badge>
      );
    },
  }),
  columnHelper.accessor('priority', {
    header: 'Priority',
    cell: (info) => {
      const priority = info.getValue();
      const config = priorityConfig[priority];
      return <Badge variant={(config.variant ?? 'secondary') as 'default' | 'secondary' | 'destructive' | 'outline'}>{config.label}</Badge>;
    },
  }),
  columnHelper.accessor('assignedTo', {
    header: 'Assigned To',
    cell: (info) => getFullName(info.getValue()),
  }),
  columnHelper.accessor('reportedBy', {
    header: 'Reported By',
    cell: (info) => getFullName(info.getValue()),
  }),
  columnHelper.accessor('createdAt', {
    header: 'Created',
    cell: (info) => formatDate(info.getValue()),
  }),
];

export default function IncidentsPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const filters = {
    ...(statusFilter && { status: statusFilter as 'open' | 'assigned' | 'in_progress' | 'pending_review' | 'resolved' | 'closed' }),
    ...(priorityFilter && { priority: priorityFilter as 'low' | 'medium' | 'high' | 'urgent' }),
    ...(categoryFilter && { category: categoryFilter as 'plumbing' | 'electrical' | 'hvac' | 'structural' | 'appliance' | 'pest' | 'noise' | 'security' | 'other' }),
    ...(search && { search }),
  };

  const { data, isLoading, isError } = useIncidents(filters, page, limit);

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Incidents</h1>
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
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>

        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value === 'all' ? '' : value);
            setPage(1);
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
          value={priorityFilter}
          onValueChange={(value) => {
            setPriorityFilter(value === 'all' ? '' : value);
            setPage(1);
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
          value={categoryFilter}
          onValueChange={(value) => {
            setCategoryFilter(value === 'all' ? '' : value);
            setPage(1);
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
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            <AnimatePresence>
              {isLoading ? (
                // Loading skeleton
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={`skeleton-${i}`}>
                    {columns.map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <AlertTriangle className="h-8 w-8" />
                      <p>Failed to load incidents</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No incidents found
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <motion.tr
                    key={row.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="cursor-pointer hover:bg-muted/50 transition-colors border-b"
                    onClick={() => handleRowClick(row.original)}
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
      {data?.meta && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * limit + 1} to{' '}
            {Math.min(page * limit, data.meta.total)} of {data.meta.total}{' '}
            incidents
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
              Page {page} of {data.meta.pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(data.meta.pages, p + 1))}
              disabled={page >= data.meta.pages}
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
    </div>
  );
}
