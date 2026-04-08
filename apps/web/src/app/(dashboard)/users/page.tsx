'use client';

import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, Search, Edit, Shield, User as UserIcon } from 'lucide-react';
import { parseAsString, parseAsInteger, useQueryStates } from 'nuqs';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: UserRole[];
  phone?: string;
  profileData?: {
    avatarUrl?: string;
    [key: string]: unknown;
  };
  isActive: boolean;
  created_at: string;
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
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [managingRolesUser, setManagingRolesUser] = useState<User | null>(null);

  // URL state with nuqs
  const [urlFilters, setUrlFilters] = useQueryStates({
    search: parseAsString.withDefault(''),
    page: parseAsInteger.withDefault(1),
  });
  const limit = 20;

  // Fetch users
  const { data, isLoading } = useQuery<UsersResponse>({
    queryKey: ['users', urlFilters.page, limit],
    queryFn: () => apiClient.get<UsersResponse>(`/users?page=${urlFilters.page}&limit=${limit}`),
  });

  const columns = useMemo<ColumnDef<User>[]>(
    () => [
      {
        id: 'user',
        header: 'User',
        cell: ({ row }) => {
          const user = row.original;
          const avatarUrl = user.profileData?.avatarUrl;
          const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`;
          return (
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt={`${user.firstName} ${user.lastName}`} />
                ) : null}
                <AvatarFallback className="text-xs">
                  {initials || <UserIcon className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="font-medium">{user.firstName} {user.lastName}</span>
                <span className="text-sm text-muted-foreground">{user.email}</span>
              </div>
            </div>
          );
        },
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
    onGlobalFilterChange: (value) => setUrlFilters({ search: value as string, page: 1 }),
    state: {
      sorting,
      globalFilter: urlFilters.search,
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
                value={urlFilters.search}
                onChange={(e) => setUrlFilters({ search: e.target.value, page: 1 })}
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
                onClick={() => setUrlFilters({ page: Math.max(1, urlFilters.page - 1) })}
                disabled={urlFilters.page === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUrlFilters({ page: urlFilters.page + 1 })}
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
