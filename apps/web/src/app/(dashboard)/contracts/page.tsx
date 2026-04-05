'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
} from '@tanstack/react-table';
import { FileSignature, Search, Plus, ChevronLeft, ChevronRight, Home } from 'lucide-react';
import { useContracts, useMyContracts, Contract } from '@/hooks/use-contracts';
import { useAuthStore } from '@/stores/authStore';

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Extract the contract type tag written by buildTermsNotes() */
function parseContractType(
  termsNotes?: string,
): 'Rental' | 'Purchase' | 'Lease to Own' | null {
  if (!termsNotes) return null;
  const match = termsNotes.match(/\[Contract Type:\s*([^\]]+)\]/);
  if (!match) return null;
  const label = match[1].trim();
  if (label === 'Rental') return 'Rental';
  if (label === 'Purchase') return 'Purchase';
  if (label === 'Lease to Own') return 'Lease to Own';
  return null;
}

/** Pull purchase price out of the termsNotes free-text block */
function parsePurchasePrice(termsNotes?: string): number | null {
  if (!termsNotes) return null;
  const match = termsNotes.match(/Purchase Price:\s*([\d,]+)\s*VND/);
  return match ? parseInt(match[1].replace(/,/g, ''), 10) : null;
}
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { ContractDetailSheet } from './contract-detail-sheet';
import { ContractFormDialog } from './contract-form-dialog';

const columnHelper = createColumnHelper<Contract>();

const statusVariants: Record<string, 'default' | 'success' | 'warning' | 'destructive'> = {
  draft: 'default',
  active: 'success',
  expired: 'warning',
  terminated: 'destructive',
};

const typeVariants: Record<
  string,
  'default' | 'secondary' | 'outline'
> = {
  Rental: 'default',
  Purchase: 'secondary',
  'Lease to Own': 'outline',
};

const columns = [
  columnHelper.display({
    id: 'type',
    header: 'Type',
    cell: ({ row }) => {
      const type = parseContractType(row.original.termsNotes);
      return (
        <Badge variant={type ? typeVariants[type] : 'outline'}>
          {type ?? 'Rental'}
        </Badge>
      );
    },
  }),
  columnHelper.accessor(
    (row) => row.apartment?.unit_number ?? '-',
    {
      id: 'apartment',
      header: 'Apartment',
      cell: (info) => <span className="font-medium">{info.getValue()}</span>,
    },
  ),
  columnHelper.accessor(
    (row) =>
      row.tenant
        ? `${row.tenant.firstName} ${row.tenant.lastName}`
        : '-',
    {
      id: 'party',
      header: 'Tenant / Buyer',
    },
  ),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => {
      const status = info.getValue();
      return (
        <Badge variant={statusVariants[status] || 'default'}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
      );
    },
  }),
  columnHelper.display({
    id: 'amount',
    header: 'Amount',
    cell: ({ row }) => {
      const type = parseContractType(row.original.termsNotes);
      if (type === 'Purchase') {
        const price = parsePurchasePrice(row.original.termsNotes);
        if (price) {
          return (
            <span className="text-sm">
              {new Intl.NumberFormat('vi-VN').format(price)}{' '}
              <span className="text-muted-foreground text-xs">VND</span>
            </span>
          );
        }
        return <span className="text-muted-foreground text-sm">— (see notes)</span>;
      }
      return (
        <span className="text-sm">
          {new Intl.NumberFormat('vi-VN').format(row.original.rentAmount)}{' '}
          <span className="text-muted-foreground text-xs">VND/mo</span>
        </span>
      );
    },
  }),
  columnHelper.accessor('start_date', {
    header: 'Start Date',
    cell: (info) => new Date(info.getValue()).toLocaleDateString(),
  }),
  columnHelper.accessor('endDate', {
    header: 'End Date',
    cell: (info) => {
      const v = info.getValue();
      return v ? new Date(v).toLocaleDateString() : 'Open-ended';
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

export default function ContractsPage() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [contractTypeFilter, setContractTypeFilter] = useState<string>('all');
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingContract, setEditingContract] = useState<Contract | null>(null);

  // Role-based access control
  const { hasRole, hasAnyRole } = useAuthStore();
  const isAdmin = hasRole('admin');
  const isResidentOnly = hasRole('resident') && !hasAnyRole(['admin', 'technician']);

  // Use different hooks based on role
  const adminQuery = useContracts({
    page,
    limit,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    contractType: contractTypeFilter !== 'all' ? contractTypeFilter as 'rental' | 'purchase' | 'lease_to_own' : undefined,
  });
  
  const myContractsQuery = useMyContracts({
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });

  // Select the appropriate data based on role
  const { data, isLoading, error } = isResidentOnly ? myContractsQuery : adminQuery;

  const contracts = data?.data || [];
  const meta = isResidentOnly 
    ? { total: data?.meta?.total || 0, limit: contracts.length, page: 1 } 
    : adminQuery.data?.meta;
  const totalPages = meta ? Math.ceil(meta.total / meta.limit) : 1;

  const handleCreate = () => {
    setEditingContract(null);
    setFormMode('create');
    setFormDialogOpen(true);
  };

  const handleEdit = (contract: Contract) => {
    setEditingContract(contract);
    setFormMode('edit');
    setFormDialogOpen(true);
    setSelectedContract(null);
  };

  const table = useReactTable({
    data: contracts,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
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
          <h1 className="text-3xl font-bold tracking-tight">
            {isResidentOnly ? 'My Contracts' : 'Contracts'}
          </h1>
          <p className="text-muted-foreground">
            {isResidentOnly 
              ? 'View your rental contracts and lease agreements.' 
              : 'Manage tenant lease contracts and apartment assignments.'
            }
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
          <FileSignature className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold">
            Failed to load contracts
          </h2>
          <p className="text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {isResidentOnly ? 'My Contracts' : 'Contracts'}
        </h1>
        <p className="text-muted-foreground">
          {isResidentOnly 
            ? 'View your rental contracts and lease agreements.' 
            : 'Manage tenant lease contracts and apartment assignments.'
          }
        </p>
      </div>

      {/* Resident: Show summary card for active contract */}
      {isResidentOnly && contracts.length > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="rounded-full bg-primary/10 p-2">
              <Home className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Your Active Residence</p>
              <p className="text-sm text-muted-foreground">
                {contracts.find(c => c.status === 'active')?.apartment?.building?.name || 'N/A'} 
                {' - Unit '}
                {contracts.find(c => c.status === 'active')?.apartment?.unit_number || 'N/A'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters & Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          {!isResidentOnly && (
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search contracts..."
                value={globalFilter ?? ''}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-9"
              />
            </div>
          )}
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="terminated">Terminated</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Contract Type Filter */}
          {!isResidentOnly && (
            <Select
              value={contractTypeFilter}
              onValueChange={(v) => {
                setContractTypeFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="rental">Rental</SelectItem>
                <SelectItem value="purchase">Purchase</SelectItem>
                <SelectItem value="lease_to_own">Lease to Own</SelectItem>
              </SelectContent>
            </Select>
          )}
          

        </div>
        {isAdmin && (
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            New Contract
          </Button>
        )}
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
                      header.getContext(),
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
                    No contracts found.
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
                    onClick={() => setSelectedContract(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
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
              Showing {contracts.length} of {meta.total} contracts
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Per page:</span>
              <Input
                type="number"
                min={1}
                max={100}
                value={limit}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (v > 0 && v <= 100) {
                    setLimit(v);
                    setPage(1);
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
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Sheet */}
      <ContractDetailSheet
        contract={selectedContract}
        open={!!selectedContract}
        onOpenChange={(open: boolean) => !open && setSelectedContract(null)}
        onEdit={isAdmin ? handleEdit : undefined}
      />

      {/* Create/Edit Dialog - Admin only */}
      {isAdmin && (
        <ContractFormDialog
          open={formDialogOpen}
          onOpenChange={setFormDialogOpen}
          contract={editingContract}
          mode={formMode}
        />
      )}
    </div>
  );
}
