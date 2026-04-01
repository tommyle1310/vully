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
import { Loader2, Plus, X } from 'lucide-react';
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

  const assignRoleMutation = useMutation({
    mutationFn: async (role: UserRole) => {
      return apiClient.post(`/users/${user.id}/roles/${role}`);
    },
    onSuccess: () => {
      toast({
        title: 'Role assigned',
        description: 'User role has been updated successfully.',
      });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const revokeRoleMutation = useMutation({
    mutationFn: async (role: UserRole) => {
      return apiClient.post(`/users/${user.id}/roles/${role}/revoke`);
    },
    onSuccess: () => {
      toast({
        title: 'Role revoked',
        description: 'User role has been removed successfully.',
      });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleToggleRole = async (role: UserRole, isChecked: boolean) => {
    if (isChecked) {
      // Assign role
      if (selectedRoles.length >= 3) {
        toast({
          title: 'Maximum roles reached',
          description: 'Users cannot have more than 3 roles.',
          variant: 'destructive',
        });
        return;
      }
      setSelectedRoles([...selectedRoles, role]);
      await assignRoleMutation.mutateAsync(role);
    } else {
      // Revoke role
      if (selectedRoles.length <= 1) {
        toast({
          title: 'Cannot remove role',
          description: 'Users must have at least 1 role.',
          variant: 'destructive',
        });
        return;
      }
      setSelectedRoles(selectedRoles.filter((r) => r !== role));
      await revokeRoleMutation.mutateAsync(role);
    }
  };

  const allRoles = Object.values(UserRole);
  const isLoading = assignRoleMutation.isPending || revokeRoleMutation.isPending;

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
            Close
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
