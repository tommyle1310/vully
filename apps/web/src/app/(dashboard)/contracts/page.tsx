'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  SortingState,
} from '@tanstack/react-table';
import { FileSignature, Search, Plus, ChevronLeft, ChevronRight, Home } from 'lucide-react';
import { parseAsString, parseAsInteger, useQueryStates } from 'nuqs';
import { useContracts, useMyContracts, Contract } from '@/hooks/use-contracts';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable } from '@/components/ui/data-table';
import { ContractDetailSheet } from './contract-detail-sheet';
import { ContractFormDialog } from './contract-form-dialog';
import { columns, ContractTableSkeleton } from './contract-columns';

export default function ContractsPage() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingContract, setEditingContract] = useState<Contract | null>(null);

  // URL state with nuqs
  const [urlFilters, setUrlFilters] = useQueryStates({
    search: parseAsString.withDefault(''),
    status: parseAsString.withDefault('all'),
    contractType: parseAsString.withDefault('all'),
    page: parseAsInteger.withDefault(1),
    limit: parseAsInteger.withDefault(20),
  });

  // Role-based access control
  const { hasRole, hasAnyRole } = useAuthStore();
  const isAdmin = hasRole('admin');
  const isResidentOnly = hasRole('resident') && !hasAnyRole(['admin', 'technician']);

  // Use different hooks based on role
  const adminQuery = useContracts({
    page: urlFilters.page,
    limit: urlFilters.limit,
    status: urlFilters.status !== 'all' ? urlFilters.status : undefined,
    contractType:
      urlFilters.contractType !== 'all'
        ? (urlFilters.contractType as 'rental' | 'purchase' | 'lease_to_own')
        : undefined,
  });

  const myContractsQuery = useMyContracts({
    status: urlFilters.status !== 'all' ? urlFilters.status : undefined,
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
      globalFilter: urlFilters.search,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: (value) => setUrlFilters({ search: value as string, page: 1 }),
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
              : 'Manage tenant lease contracts and apartment assignments.'}
          </p>
        </div>
        <ContractTableSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <FileSignature className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold">Failed to load contracts</h2>
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
          {isResidentOnly ? 'My Contracts' : 'Contracts'}
        </h1>
        <p className="text-muted-foreground">
          {isResidentOnly
            ? 'View your rental contracts and lease agreements.'
            : 'Manage tenant lease contracts and apartment assignments.'}
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
                {contracts.find((c) => c.status === 'active')?.apartment?.building?.name || 'N/A'}
                {' - Unit '}
                {contracts.find((c) => c.status === 'active')?.apartment?.unit_number || 'N/A'}
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
                value={urlFilters.search ?? ''}
                onChange={(e) => setUrlFilters({ search: e.target.value, page: 1 })}
                className="pl-9"
              />
            </div>
          )}
          <Select
            value={urlFilters.status}
            onValueChange={(v) => {
              setUrlFilters({ status: v, page: 1 });
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
              value={urlFilters.contractType}
              onValueChange={(v) => {
                setUrlFilters({ contractType: v, page: 1 });
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
      <DataTable
        table={table}
        defaultColumnWidths={[100, 100, 160, 100, 140, 200, 200]}
        onRowClick={setSelectedContract}
        emptyMessage="No contracts found."
      />

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
    </motion.div>
  );
}
