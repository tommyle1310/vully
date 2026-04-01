'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import {
  Contract,
  CreateContractInput,
  useCreateContract,
  useUpdateContract,
} from '@/hooks/use-contracts';
import { useApartments, Apartment } from '@/hooks/use-apartments';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  isActive: boolean;
}

interface UsersResponse {
  data: User[];
  meta: { total: number; page: number; limit: number };
}

const contractFormSchema = z.object({
  apartmentId: z.string().uuid('Please select an apartment'),
  tenantId: z.string().uuid('Please select a tenant'),
  start_date: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  rentAmount: z.coerce.number().min(0, 'Rent must be 0 or more'),
  depositMonths: z.coerce.number().int().min(0).optional(),
  depositAmount: z.preprocess(
    (v) => (v === '' || v == null ? undefined : v),
    z.coerce.number().min(0).optional(),
  ),
  termsNotes: z.string().optional(),
});

type ContractFormValues = z.infer<typeof contractFormSchema>;

interface ContractFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: Contract | null;
  mode: 'create' | 'edit';
}

export function ContractFormDialog({
  open,
  onOpenChange,
  contract,
  mode,
}: ContractFormDialogProps) {
  const { toast } = useToast();
  const createContract = useCreateContract();
  const updateContract = useUpdateContract();

  // Fetch vacant apartments for selection
  const { data: apartmentsData } = useApartments({ limit: 200 });
  const apartments = apartmentsData?.data || [];

  // Only show vacant apartments for new contracts, or include current apartment in edit
  const availableApartments = apartments.filter(
    (a: Apartment) =>
      a.status === 'vacant' ||
      (mode === 'edit' && contract && a.id === contract.apartmentId),
  );

  // Fetch users (residents) for tenant selection
  const { data: usersData } = useQuery<UsersResponse>({
    queryKey: ['users', 'all'],
    queryFn: () => apiClient.get<UsersResponse>('/users?limit=200'),
    staleTime: 5 * 60 * 1000,
  });
  const users = usersData?.data || [];
  const residents = users.filter(
    (u) => u.isActive && u.roles.includes('resident'),
  );

  const form = useForm<ContractFormValues>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: {
      apartmentId: '',
      tenantId: '',
      start_date: '',
      endDate: '',
      rentAmount: 0,
      depositMonths: 2,
      depositAmount: undefined,
      termsNotes: '',
    },
  });

  useEffect(() => {
    if (open) {
      if (mode === 'edit' && contract) {
        form.reset({
          apartmentId: contract.apartmentId,
          tenantId: contract.tenantId,
          start_date: contract.start_date
            ? new Date(contract.start_date).toISOString().split('T')[0]
            : '',
          endDate: contract.endDate
            ? new Date(contract.endDate).toISOString().split('T')[0]
            : '',
          rentAmount: contract.rentAmount,
          depositMonths: contract.depositMonths,
          depositAmount: contract.depositAmount,
          termsNotes: contract.termsNotes || '',
        });
      } else {
        form.reset({
          apartmentId: '',
          tenantId: '',
          start_date: new Date().toISOString().split('T')[0],
          endDate: '',
          rentAmount: 0,
          depositMonths: 2,
          depositAmount: undefined,
          termsNotes: '',
        });
      }
    }
  }, [open, mode, contract, form]);

  const onSubmit = async (values: ContractFormValues) => {
    try {
      if (mode === 'create') {
        const input: CreateContractInput = {
          apartmentId: values.apartmentId,
          tenantId: values.tenantId,
          start_date: values.start_date,
          endDate: values.endDate || undefined,
          rentAmount: values.rentAmount,
          depositMonths: values.depositMonths,
          depositAmount: values.depositAmount,
          termsNotes: values.termsNotes || undefined,
        };
        await createContract.mutateAsync(input);
        toast({
          title: 'Contract created',
          description: 'The lease contract has been created and apartment marked as occupied.',
        });
      } else if (contract) {
        await updateContract.mutateAsync({
          id: contract.id,
          data: {
            endDate: values.endDate || undefined,
            rentAmount: values.rentAmount,
            termsNotes: values.termsNotes || undefined,
          },
        });
        toast({
          title: 'Contract updated',
          description: 'The contract details have been updated.',
        });
      }
      onOpenChange(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      toast({
        title: mode === 'create' ? 'Failed to create contract' : 'Failed to update contract',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const isSubmitting = createContract.isPending || updateContract.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'New Contract' : 'Edit Contract'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Create a new lease contract. The apartment will be marked as occupied.'
              : 'Update contract details.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Apartment */}
            <FormField
              control={form.control}
              name="apartmentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Apartment</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={mode === 'edit'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select apartment" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableApartments.map((apt: Apartment) => (
                        <SelectItem key={apt.id} value={apt.id}>
                          {apt.unit_number}
                          {apt.building?.name ? ` — ${apt.building.name}` : ''}
                          {apt.status !== 'vacant' ? ` (${apt.status})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {mode === 'create'
                      ? 'Only vacant apartments are shown.'
                      : 'Apartment cannot be changed after creation.'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tenant */}
            <FormField
              control={form.control}
              name="tenantId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tenant</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={mode === 'edit'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select tenant (resident)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {residents.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.firstName} {user.lastName} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Only active users with the resident role are listed.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} disabled={mode === 'edit'} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormDescription>Leave empty for open-ended.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Financial */}
            <FormField
              control={form.control}
              name="rentAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monthly Rent (VND)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="depositMonths"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deposit Months</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="depositAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deposit Amount (VND)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        placeholder="Auto = rent × months"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormDescription>
                      Leave empty to auto-calculate from rent.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Notes */}
            <FormField
              control={form.control}
              name="termsNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Terms & Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional contract terms, special conditions..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {mode === 'create' ? 'Create Contract' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
