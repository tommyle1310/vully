import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, X } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { quickCreateSchema, QuickCreateValues, User } from './contract-form-schema';

interface QuickCreateResidentProps {
  onCreated: (user: User) => void;
  onCancel: () => void;
}

export function QuickCreateResident({ onCreated, onCancel }: QuickCreateResidentProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<QuickCreateValues>({
    resolver: zodResolver(quickCreateSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
    },
  });

  const createUser = useMutation({
    mutationFn: (data: QuickCreateValues) =>
      apiClient.post<{ data: User }>('/users', {
        ...data,
        password: '00000000',
        roles: ['resident'],
      }),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: 'Resident created',
        description: 'The resident account has been created with default password "00000000".',
      });
      onCreated(response.data);
    },
    onError: (err: Error) => {
      toast({
        title: 'Failed to create resident',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Quick Add Resident</CardTitle>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Input
              placeholder="First name"
              {...form.register('firstName')}
              className="h-8 text-sm"
            />
            {form.formState.errors.firstName && (
              <p className="text-xs text-destructive mt-1">
                {form.formState.errors.firstName.message}
              </p>
            )}
          </div>
          <div>
            <Input
              placeholder="Last name"
              {...form.register('lastName')}
              className="h-8 text-sm"
            />
            {form.formState.errors.lastName && (
              <p className="text-xs text-destructive mt-1">
                {form.formState.errors.lastName.message}
              </p>
            )}
          </div>
        </div>
        <div>
          <Input
            placeholder="Email"
            type="email"
            {...form.register('email')}
            className="h-8 text-sm"
          />
          {form.formState.errors.email && (
            <p className="text-xs text-destructive mt-1">
              {form.formState.errors.email.message}
            </p>
          )}
        </div>
        <div>
          <Input
            placeholder="Phone (optional)"
            {...form.register('phone')}
            className="h-8 text-sm"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Default password: <code className="bg-muted px-1 rounded">00000000</code>
        </p>
        <Button
          size="sm"
          className="w-full"
          disabled={createUser.isPending}
          onClick={form.handleSubmit((data) => createUser.mutate(data))}
        >
          {createUser.isPending && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
          Create & Select
        </Button>
      </CardContent>
    </Card>
  );
}
