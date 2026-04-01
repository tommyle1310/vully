'use client';

import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    isActive: boolean;
  };
  onSuccess: () => void;
}

interface EditUserForm {
  firstName: string;
  lastName: string;
  phone?: string;
  isActive: boolean;
}

export function EditUserDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: EditUserDialogProps) {
  const { toast } = useToast();
  const { register, handleSubmit, watch, setValue } = useForm<EditUserForm>({
    defaultValues: {
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      isActive: user.isActive,
    },
  });

  const isActive = watch('isActive');

  const updateMutation = useMutation({
    mutationFn: async (data: EditUserForm) => {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update user');
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'User updated',
        description: 'User details have been updated successfully.',
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user information for {user.email}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((data) => updateMutation.mutate(data))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                {...register('firstName', { required: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                {...register('lastName', { required: true })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" {...register('phone')} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="isActive">Active Status</Label>
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={(checked) => setValue('isActive', checked)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
