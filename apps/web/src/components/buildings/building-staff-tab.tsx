'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, UserCog, Shield, ChevronsUpDown, Check, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  useBuildingStaff,
  useAssignUserToBuilding,
  useUpdateBuildingAssignment,
  useRemoveBuildingAssignment,
  type BuildingStaffMember,
} from '@/hooks/use-building-assignments';

const BUILDING_ROLES = [
  { value: 'building_manager', label: 'Building Manager' },
  { value: 'security', label: 'Security' },
  { value: 'technician', label: 'Technician' },
  { value: 'housekeeping', label: 'Housekeeping' },
  { value: 'accountant', label: 'Accountant' },
] as const;

function roleBadge(role: string) {
  const colors: Record<string, string> = {
    building_manager: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    security: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    technician: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    housekeeping: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    accountant: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
  };
  const label = BUILDING_ROLES.find((r) => r.value === role)?.label ?? role;
  return (
    <Badge variant="outline" className={colors[role] ?? ''}>
      {label}
    </Badge>
  );
}

function getInitials(member: BuildingStaffMember) {
  const first = member.user?.first_name?.[0] ?? '';
  const last = member.user?.last_name?.[0] ?? '';
  if (first || last) return `${first}${last}`.toUpperCase();
  return member.user?.email?.[0]?.toUpperCase() ?? 'U';
}

function StaffListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-16 rounded-lg" />
      ))}
    </div>
  );
}

interface UserOption {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

function AssignStaffDialog({
  buildingId,
  open,
  onOpenChange,
}: {
  buildingId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState('');
  const [userPopoverOpen, setUserPopoverOpen] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const { toast } = useToast();
  const assignMutation = useAssignUserToBuilding();

  const { data: usersData, isLoading: usersLoading } = useQuery<{ data: UserOption[] }>({
    queryKey: ['users', 'all'],
    queryFn: () => apiClient.get<{ data: UserOption[] }>('/users?limit=500'),
    staleTime: 5 * 60 * 1000,
    enabled: open,
  });

  const users = usersData?.data || [];

  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return users;
    const s = userSearch.toLowerCase();
    return users.filter(
      (u) =>
        (u.firstName?.toLowerCase().includes(s)) ||
        (u.lastName?.toLowerCase().includes(s)) ||
        u.email.toLowerCase().includes(s),
    );
  }, [users, userSearch]);

  const selectedUser = useMemo(
    () => users.find((u) => u.id === userId),
    [users, userId],
  );

  const handleAssign = () => {
    if (!userId || !role) return;
    assignMutation.mutate(
      { userId, buildingId, role },
      {
        onSuccess: () => {
          toast({ title: 'Staff assigned', description: 'User has been assigned to this building.' });
          setUserId('');
          setRole('');
          setUserSearch('');
          onOpenChange(false);
        },
        onError: () => {
          toast({ title: 'Assignment failed', description: 'Could not assign user. They may already be assigned.', variant: 'destructive' });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Staff to Building</DialogTitle>
          <DialogDescription>
            Add a staff member with a specific role for this building.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>User</Label>
            <Popover open={userPopoverOpen} onOpenChange={setUserPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={userPopoverOpen}
                  className="w-full justify-between font-normal"
                >
                  {selectedUser ? (
                    <span className="truncate">
                      {selectedUser.firstName} {selectedUser.lastName}
                      <span className="ml-2 text-muted-foreground">
                        ({selectedUser.email})
                      </span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Search user by name or email...</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Search by name or email..."
                    value={userSearch}
                    onValueChange={setUserSearch}
                  />
                  <CommandList className="max-h-[200px]">
                    {usersLoading ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : filteredUsers.length === 0 ? (
                      <CommandEmpty>No users found</CommandEmpty>
                    ) : (
                      <CommandGroup>
                        {filteredUsers.slice(0, 50).map((user) => (
                          <CommandItem
                            key={user.id}
                            value={user.id}
                            onSelect={() => {
                              setUserId(user.id);
                              setUserPopoverOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                userId === user.id ? 'opacity-100' : 'opacity-0',
                              )}
                            />
                            <div className="flex flex-col">
                              <span>
                                {user.firstName} {user.lastName}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {user.email}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role..." />
              </SelectTrigger>
              <SelectContent>
                {BUILDING_ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={!userId.trim() || !role || assignMutation.isPending}>
            {assignMutation.isPending ? 'Assigning...' : 'Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChangeRoleDialog({
  member,
  buildingId,
  open,
  onOpenChange,
}: {
  member: BuildingStaffMember | null;
  buildingId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [role, setRole] = useState(member?.role ?? '');
  const { toast } = useToast();
  const updateMutation = useUpdateBuildingAssignment();

  const handleUpdate = () => {
    if (!member || !role) return;
    updateMutation.mutate(
      { userId: member.user_id, buildingId, role },
      {
        onSuccess: () => {
          toast({ title: 'Role updated', description: 'Staff role has been updated.' });
          onOpenChange(false);
        },
        onError: () => {
          toast({ title: 'Update failed', description: 'Could not update role.', variant: 'destructive' });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Role</DialogTitle>
          <DialogDescription>
            Update the building role for {member?.user?.first_name ?? member?.user?.email ?? 'this user'}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>New Role</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BUILDING_ROLES.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleUpdate} disabled={updateMutation.isPending || role === member?.role}>
            {updateMutation.isPending ? 'Updating...' : 'Update Role'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function BuildingStaffTab({ buildingId }: { buildingId: string }) {
  const { data: staff, isLoading } = useBuildingStaff(buildingId);
  const [assignOpen, setAssignOpen] = useState(false);
  const [changeRoleMember, setChangeRoleMember] = useState<BuildingStaffMember | null>(null);
  const [removeMember, setRemoveMember] = useState<BuildingStaffMember | null>(null);
  const { toast } = useToast();
  const removeMutation = useRemoveBuildingAssignment();

  const handleRemove = () => {
    if (!removeMember) return;
    removeMutation.mutate(
      { userId: removeMember.user_id, buildingId },
      {
        onSuccess: () => {
          toast({ title: 'Staff removed', description: 'User has been removed from this building.' });
          setRemoveMember(null);
        },
        onError: () => {
          toast({ title: 'Remove failed', description: 'Could not remove staff member.', variant: 'destructive' });
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Building Staff</h3>
          <p className="text-sm text-muted-foreground">
            Manage staff members assigned to this building
          </p>
        </div>
        <Button onClick={() => setAssignOpen(true)} size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Assign Staff
        </Button>
      </div>

      {isLoading ? (
        <StaffListSkeleton />
      ) : !staff || staff.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Shield className="mx-auto mb-3 h-10 w-10 opacity-30" />
            <p>No staff assigned to this building</p>
            <p className="text-sm">Click &quot;Assign Staff&quot; to add team members</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {staff.map((member) => (
              <motion.div
                key={member.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{getInitials(member)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {member.user?.first_name && member.user?.last_name
                        ? `${member.user.first_name} ${member.user.last_name}`
                        : member.user?.email ?? 'Unknown User'}
                    </p>
                    <p className="text-sm text-muted-foreground">{member.user?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {roleBadge(member.role)}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setChangeRoleMember(member)}
                  >
                    <UserCog className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => setRemoveMember(member)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Assign Dialog */}
      <AssignStaffDialog
        buildingId={buildingId}
        open={assignOpen}
        onOpenChange={setAssignOpen}
      />

      {/* Change Role Dialog */}
      <ChangeRoleDialog
        member={changeRoleMember}
        buildingId={buildingId}
        open={!!changeRoleMember}
        onOpenChange={(open) => !open && setChangeRoleMember(null)}
      />

      {/* Remove Confirmation */}
      <AlertDialog open={!!removeMember} onOpenChange={(open) => !open && setRemoveMember(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove staff member?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove{' '}
              <strong>
                {removeMember?.user?.first_name
                  ? `${removeMember.user.first_name} ${removeMember.user.last_name}`
                  : removeMember?.user?.email}
              </strong>{' '}
              from this building. They will lose access to building-scoped features.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleRemove}
              disabled={removeMutation.isPending}
            >
              {removeMutation.isPending ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
