'use client';

import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, Search, Edit, Shield } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  SortingState,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { UserRole } from '@vully/shared-types';
import { CreateUserDialog } from '@/components/users/create-user-dialog';
import { EditUserDialog } from '@/components/users/edit-user-dialog';
import { ManageRolesDialog } from '@/components/users/manage-roles-dialog';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: UserRole[];
  phone?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UsersResponse {
  data: User[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [managingRolesUser, setManagingRolesUser] = useState<User | null>(null);

  // Fetch users
  const { data, isLoading } = useQuery<UsersResponse>({
    queryKey: ['users', page, limit],
    queryFn: () => apiClient.get<UsersResponse>(`/users?page=${page}&limit=${limit}`),
  });

  const columns = useMemo<ColumnDef<User>[]>(
    () => [
      {
        accessorKey: 'email',
        header: 'Email',
        cell: ({ row }) => (
          <div className="font-medium">{row.getValue('email')}</div>
        ),
      },
      {
        accessorKey: 'firstName',
        header: 'First Name',
      },
      {
        accessorKey: 'lastName',
        header: 'Last Name',
      },
      {
        accessorKey: 'roles',
        header: 'Roles',
        cell: ({ row }) => {
          const roles = row.getValue('roles') as UserRole[];
          return (
            <div className="flex gap-1 flex-wrap">
              {roles.map((role) => (
                <Badge
                  key={role}
                  variant={role === UserRole.admin ? 'destructive' : 'secondary'}
                >
                  {role}
                </Badge>
              ))}
            </div>
          );
        },
      },
      {
        accessorKey: 'isActive',
        header: 'Status',
        cell: ({ row }) => {
          const isActive = row.getValue('isActive') as boolean;
          return (
            <Badge variant={isActive ? 'default' : 'outline'}>
              {isActive ? 'Active' : 'Inactive'}
            </Badge>
          );
        },
      },
      {
        id: 'actions',
        cell: ({ row }) => {
          const user = row.original;
          return (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingUser(user)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setManagingRolesUser(user)}
              >
                <Shield className="h-4 w-4" />
              </Button>
            </div>
          );
        },
      },
    ],
    // State setters are stable — no deps needed beyond initial render
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const tableData = useMemo(() => data?.data ?? [], [data?.data]);

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      globalFilter,
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4 p-8">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 p-8"
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Users Management</CardTitle>
              <CardDescription>
                Manage user accounts and roles (1-3 roles per user)
              </CardDescription>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-4 flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-10"
              />
            </div>
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
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && 'selected'}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      No users found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Showing {data?.data.length ?? 0} of {data?.meta.total ?? 0} users
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
                onClick={() => setPage((p) => p + 1)}
                disabled={!data || data.data.length < limit}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <CreateUserDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['users'] });
        }}
      />
      {editingUser && (
        <EditUserDialog
          open={!!editingUser}
          onOpenChange={(open) => !open && setEditingUser(null)}
          user={editingUser}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            setEditingUser(null);
          }}
        />
      )}
      {managingRolesUser && (
        <ManageRolesDialog
          open={!!managingRolesUser}
          onOpenChange={(open) => !open && setManagingRolesUser(null)}
          user={managingRolesUser}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            setManagingRolesUser(null);
          }}
        />
      )}
    </motion.div>
  );
}
