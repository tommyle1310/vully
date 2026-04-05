'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { UserRole } from '@vully/shared-types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface ManageRolesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    roles: UserRole[];
  };
  onSuccess: () => void;
}

export function ManageRolesDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: ManageRolesDialogProps) {
  const { toast } = useToast();
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>(user.roles);

  // Reset selected roles when dialog opens with a new user
  const [prevUser, setPrevUser] = useState(user);
  if (prevUser.id !== user.id || prevUser.roles !== user.roles) {
    setPrevUser(user);
    setSelectedRoles(user.roles);
  }

  const saveRolesMutation = useMutation({
    mutationFn: async (roles: { toAssign: UserRole[]; toRevoke: UserRole[] }) => {
      const promises: Promise<unknown>[] = [];
      for (const role of roles.toAssign) {
        promises.push(apiClient.post(`/users/${user.id}/roles/${role}`));
      }
      for (const role of roles.toRevoke) {
        promises.push(apiClient.post(`/users/${user.id}/roles/${role}/revoke`));
      }
      await Promise.all(promises);
    },
    onSuccess: () => {
      toast({
        title: 'Roles updated',
        description: 'User roles have been updated successfully.',
      });
      onSuccess();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleToggleRole = (role: UserRole, isChecked: boolean) => {
    if (isChecked) {
      if (selectedRoles.length >= 3) {
        toast({
          title: 'Maximum roles reached',
          description: 'Users cannot have more than 3 roles.',
          variant: 'destructive',
        });
        return;
      }
      setSelectedRoles([...selectedRoles, role]);
    } else {
      if (selectedRoles.length <= 1) {
        toast({
          title: 'Cannot remove role',
          description: 'Users must have at least 1 role.',
          variant: 'destructive',
        });
        return;
      }
      setSelectedRoles(selectedRoles.filter((r) => r !== role));
    }
  };

  const handleSave = () => {
    const toAssign = selectedRoles.filter((r) => !user.roles.includes(r));
    const toRevoke = user.roles.filter((r) => !selectedRoles.includes(r));

    if (toAssign.length === 0 && toRevoke.length === 0) {
      onOpenChange(false);
      return;
    }

    saveRolesMutation.mutate({ toAssign, toRevoke });
  };

  const allRoles = Object.values(UserRole);
  const isLoading = saveRolesMutation.isPending;
  const hasChanges =
    selectedRoles.length !== user.roles.length ||
    selectedRoles.some((r) => !user.roles.includes(r));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Manage User Roles</DialogTitle>
          <DialogDescription>
            Assign or revoke roles for {user.firstName} {user.lastName} ({user.email})
            <br />
            <span className="text-xs text-muted-foreground">
              Each user must have 1-3 roles
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Roles */}
          <div>
            <Label className="text-sm font-medium">Current Roles</Label>
            <div className="flex gap-2 mt-2 flex-wrap">
              {selectedRoles.map((role) => (
                <Badge
                  key={role}
                  variant={role === UserRole.admin ? 'destructive' : 'secondary'}
                >
                  {role}
                </Badge>
              ))}
            </div>
          </div>

          {/* Role Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Available Roles</Label>
            {allRoles.map((role) => {
              const isSelected = selectedRoles.includes(role);
              return (
                <div key={role} className="flex items-center space-x-3 p-3 border rounded-lg">
                  <Checkbox
                    id={`role-${role}`}
                    checked={isSelected}
                    onCheckedChange={(checked) =>
                      handleToggleRole(role, checked as boolean)
                    }
                    disabled={isLoading}
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor={`role-${role}`}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {getRoleDescription(role)}
                    </p>
                  </div>
                  {isSelected && (
                    <Badge variant="outline" className="text-xs">
                      Active
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>

          {/* Info */}
          <div className="bg-muted/50 p-3 rounded-lg text-sm">
            <p className="text-muted-foreground">
              <strong>Note:</strong> Role changes take effect immediately and may affect user permissions.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading || !hasChanges}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function getRoleDescription(role: UserRole): string {
  switch (role) {
    case UserRole.admin:
      return 'Full system access, can manage users and settings';
    case UserRole.technician:
      return 'Can manage incidents and maintenance tasks';
    case UserRole.resident:
      return 'Can view apartments and submit incidents';
    default:
      return '';
  }
}
