'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Loader2,
  Check,
  ChevronsUpDown,
  UserPlus,
  Search,
  X,
  Home,
  Key,
  ShoppingBag,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import {
  Contract,
  CreateContractInput,
  useCreateContract,
  useUpdateContract,
} from '@/hooks/use-contracts';
import { ApartmentCombobox } from '@/components/apartment-combobox';
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
  CommandSeparator,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// ============================================================================
// Types
// ============================================================================

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  roles: string[];
  isActive: boolean;
}

interface UsersResponse {
  data: User[];
  meta: { total: number; page: number; limit: number };
}

// Contract types for different use cases
const CONTRACT_TYPES = {
  rental: {
    label: 'Rental',
    description: 'Monthly/yearly lease agreement',
    icon: Key,
    partyLabel: 'Tenant',
  },
  purchase: {
    label: 'Purchase',
    description: 'Property sale/ownership transfer',
    icon: ShoppingBag,
    partyLabel: 'Buyer',
  },
  lease_to_own: {
    label: 'Lease to Own',
    description: 'Rent with option to purchase',
    icon: Home,
    partyLabel: 'Lessee/Buyer',
  },
} as const;

type ContractType = keyof typeof CONTRACT_TYPES;

// ============================================================================
// Schema
// ============================================================================

const contractFormSchema = z.object({
  contractType: z.enum(['rental', 'purchase', 'lease_to_own']),
  apartmentId: z.string().uuid('Please select an apartment'),
  partyId: z.string().uuid('Please select a party'),
  // Common dates
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  // Rental fields
  rentAmount: z.coerce.number().min(0).optional(),
  depositMonths: z.coerce.number().int().min(0).optional(),
  depositAmount: z.preprocess(
    (v) => (v === '' || v == null ? undefined : v),
    z.coerce.number().min(0).optional(),
  ),
  paymentDueDay: z.coerce.number().int().min(1).max(28).optional(),
  // Purchase fields
  purchasePrice: z.coerce.number().min(0).optional(),
  downPayment: z.coerce.number().min(0).optional(),
  paymentSchedule: z.string().optional(),
  transferDate: z.string().optional(),
  // Lease-to-own fields
  optionFee: z.coerce.number().min(0).optional(),
  optionPeriodMonths: z.coerce.number().int().min(1).optional(),
  purchaseOptionPrice: z.coerce.number().min(0).optional(),
  rentCreditPercent: z.coerce.number().min(0).max(100).optional(),
  // Common
  citizenId: z.string().max(30).optional(),
  numberOfResidents: z.coerce.number().int().min(1).optional(),
  termsNotes: z.string().optional(),
});

type ContractFormValues = z.infer<typeof contractFormSchema>;

// ============================================================================
// Quick Create Resident Form (inline)
// ============================================================================

const quickCreateSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
});

type QuickCreateValues = z.infer<typeof quickCreateSchema>;

interface QuickCreateResidentProps {
  onCreated: (user: User) => void;
  onCancel: () => void;
}

function QuickCreateResident({ onCreated, onCancel }: QuickCreateResidentProps) {
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
        password: '00000000', // Default password - user must change later
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

// ============================================================================
// Searchable Party Combobox
// ============================================================================

interface PartyComboboxProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  partyLabel: string;
}

function PartyCombobox({ value, onChange, disabled, partyLabel }: PartyComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showQuickCreate, setShowQuickCreate] = useState(false);

  // Fetch users
  const { data: usersData, isLoading, error, isError } = useQuery<UsersResponse>({
    queryKey: ['users', 'all'],
    queryFn: () => apiClient.get<UsersResponse>('/users?limit=500'),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // Log errors for debugging
  if (isError) {
    console.error('[PartyCombobox] Failed to fetch users:', error);
  }

  const users = usersData?.data || [];

  // Filter users client-side with debounced search
  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const searchLower = search.toLowerCase();
    return users.filter(
      (u) =>
        u.firstName.toLowerCase().includes(searchLower) ||
        u.lastName.toLowerCase().includes(searchLower) ||
        u.email.toLowerCase().includes(searchLower),
    );
  }, [users, search]);

  // Find selected user
  const selectedUser = useMemo(
    () => users.find((u) => u.id === value),
    [users, value],
  );

  const handleCreated = useCallback(
    (user: User) => {
      onChange(user.id);
      setShowQuickCreate(false);
      setOpen(false);
    },
    [onChange],
  );

  if (showQuickCreate) {
    return (
      <QuickCreateResident
        onCreated={handleCreated}
        onCancel={() => setShowQuickCreate(false)}
      />
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          disabled={disabled}
        >
          {selectedUser ? (
            <span className="truncate">
              {selectedUser.firstName} {selectedUser.lastName}
              <span className="text-muted-foreground ml-2">
                ({selectedUser.email})
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground">
              Search or select {partyLabel.toLowerCase()}...
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start" side="bottom" sideOffset={4}>
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={`Search by name or email...`}
            value={search}
            onValueChange={setSearch}
          />
          {/* Create New Resident - Always at top */}
          <div className="border-b px-2 py-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                setShowQuickCreate(true);
                setOpen(false);
              }}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Create New Resident
            </Button>
          </div>
          <CommandList className="max-h-[300px] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : isError ? (
              <div className="text-center py-4 px-2">
                <p className="text-sm text-destructive">
                  Failed to load users
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {error instanceof Error ? error.message : 'Please try again'}
                </p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <CommandEmpty>
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">
                    {users.length === 0 
                      ? 'No users in system. Create one above.'
                      : 'No users found matching your search'}
                  </p>
                </div>
              </CommandEmpty>
            ) : (
              <CommandGroup heading="Select existing user">
                {filteredUsers.slice(0, 50).map((user) => (
                  <CommandItem
                    key={user.id}
                    value={user.id}
                    onSelect={() => {
                      onChange(user.id);
                      setOpen(false);
                    }}
                    className="flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex flex-col">
                      <span>
                        {user.firstName} {user.lastName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {user.email}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {user.roles.map((role) => (
                        <Badge
                          key={role}
                          variant="secondary"
                          className="text-xs"
                        >
                          {role}
                        </Badge>
                      ))}
                      {value === user.id && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  </CommandItem>
                ))}
                {filteredUsers.length > 50 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Showing first 50 results. Refine your search.
                  </p>
                )}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ============================================================================
// Contract Form Dialog Props
// ============================================================================

interface ContractFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: Contract | null;
  mode: 'create' | 'edit';
}

// ============================================================================
// Main Component
// ============================================================================

export function ContractFormDialog({
  open,
  onOpenChange,
  contract,
  mode,
}: ContractFormDialogProps) {
  const { toast } = useToast();
  const createContract = useCreateContract();
  const updateContract = useUpdateContract();

  const form = useForm<ContractFormValues>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: {
      contractType: 'rental',
      apartmentId: '',
      partyId: '',
      startDate: '',
      endDate: '',
      rentAmount: 0,
      depositMonths: 2,
      depositAmount: undefined,
      paymentDueDay: 5,
      purchasePrice: undefined,
      downPayment: undefined,
      paymentSchedule: '',
      transferDate: '',
      optionFee: undefined,
      optionPeriodMonths: 12,
      purchaseOptionPrice: undefined,
      rentCreditPercent: 25,
      citizenId: '',
      numberOfResidents: undefined,
      termsNotes: '',
    },
  });

  const contractType = form.watch('contractType');

  // Helper to parse contract type from termsNotes
  const parseContractType = (termsNotes?: string): ContractType => {
    if (!termsNotes) return 'rental';
    const match = termsNotes.match(/\[Contract Type: ([^\]]+)\]/);
    if (match) {
      const type = match[1].toLowerCase().replace(/ /g, '_');
      if (type === 'purchase') return 'purchase';
      if (type === 'lease_to_own') return 'lease_to_own';
    }
    return 'rental';
  };

  // Helper to parse financial fields from termsNotes
  const parseTermsNotesFields = (termsNotes?: string) => {
    const fields: Partial<ContractFormValues> = {};
    if (!termsNotes) return fields;

    // Parse Vietnamese number format (1.000.000) or standard format
    const parseVndAmount = (str: string): number | undefined => {
      // Remove "VND" and spaces, then handle both 1.000.000 and 1000000 formats
      const cleaned = str.replace(/\s*VND\s*/gi, '').trim();
      // If it contains dots and no commas, it's likely Vietnamese format (thousand separators)
      if (cleaned.includes('.') && !cleaned.includes(',')) {
        const num = parseInt(cleaned.replace(/\./g, ''), 10);
        return isNaN(num) ? undefined : num;
      }
      const num = parseInt(cleaned.replace(/,/g, ''), 10);
      return isNaN(num) ? undefined : num;
    };

    // Purchase fields
    const purchasePriceMatch = termsNotes.match(/Purchase Price:\s*([\d.,]+)\s*VND/i);
    if (purchasePriceMatch) fields.purchasePrice = parseVndAmount(purchasePriceMatch[1]);

    const downPaymentMatch = termsNotes.match(/Down Payment:\s*([\d.,]+)\s*VND/i);
    if (downPaymentMatch) fields.downPayment = parseVndAmount(downPaymentMatch[1]);

    const transferDateMatch = termsNotes.match(/Transfer Date:\s*(\d{4}-\d{2}-\d{2})/i);
    if (transferDateMatch) fields.transferDate = transferDateMatch[1];

    const paymentScheduleMatch = termsNotes.match(/Payment Schedule:\s*(.+?)(?:\n|$)/i);
    if (paymentScheduleMatch) fields.paymentSchedule = paymentScheduleMatch[1].trim();

    // Lease-to-own fields
    const optionFeeMatch = termsNotes.match(/Option Fee:\s*([\d.,]+)\s*VND/i);
    if (optionFeeMatch) fields.optionFee = parseVndAmount(optionFeeMatch[1]);

    const purchaseOptionPriceMatch = termsNotes.match(/Purchase Option Price:\s*([\d.,]+)\s*VND/i);
    if (purchaseOptionPriceMatch) fields.purchaseOptionPrice = parseVndAmount(purchaseOptionPriceMatch[1]);

    const optionPeriodMatch = termsNotes.match(/Option Period:\s*(\d+)\s*months/i);
    if (optionPeriodMatch) fields.optionPeriodMonths = parseInt(optionPeriodMatch[1], 10);

    const rentCreditMatch = termsNotes.match(/Rent Credit:\s*(\d+)%/i);
    if (rentCreditMatch) fields.rentCreditPercent = parseInt(rentCreditMatch[1], 10);

    // Rental fields
    const paymentDueDayMatch = termsNotes.match(/Payment Due:\s*Day\s*(\d+)/i);
    if (paymentDueDayMatch) fields.paymentDueDay = parseInt(paymentDueDayMatch[1], 10);

    return fields;
  };

  // Helper to strip metadata from termsNotes for display
  const getCleanTermsNotes = (termsNotes?: string): string => {
    if (!termsNotes) return '';
    return termsNotes
      .replace(/\[Contract Type: [^\]]+\]\n?/g, '')
      .replace(/Purchase Price:\s*[\d.,]+\s*VND\n?/gi, '')
      .replace(/Down Payment:\s*[\d.,]+\s*VND\n?/gi, '')
      .replace(/Transfer Date:\s*\d{4}-\d{2}-\d{2}\n?/gi, '')
      .replace(/Payment Schedule:\s*.+?(?:\n|$)/gi, '')
      .replace(/Option Fee:\s*[\d.,]+\s*VND\n?/gi, '')
      .replace(/Purchase Option Price:\s*[\d.,]+\s*VND\n?/gi, '')
      .replace(/Option Period:\s*\d+\s*months\n?/gi, '')
      .replace(/Rent Credit:\s*\d+%\n?/gi, '')
      .replace(/Payment Due:\s*Day\s*\d+.*\n?/gi, '')
      .replace(/^---\n?/gm, '')
      .trim();
  };

  useEffect(() => {
    if (open) {
      if (mode === 'edit' && contract) {
        // Parse contract type and financial fields from termsNotes
        const detectedType = parseContractType(contract.termsNotes);
        const parsedFields = parseTermsNotesFields(contract.termsNotes);
        form.reset({
          contractType: detectedType,
          apartmentId: contract.apartmentId,
          partyId: contract.tenantId,
          startDate: contract.start_date
            ? new Date(contract.start_date).toISOString().split('T')[0]
            : '',
          endDate: contract.endDate
            ? new Date(contract.endDate).toISOString().split('T')[0]
            : '',
          rentAmount: contract.rentAmount,
          depositMonths: contract.depositMonths,
          depositAmount: contract.depositAmount,
          paymentDueDay: parsedFields.paymentDueDay ?? 5,
          // Purchase fields
          purchasePrice: parsedFields.purchasePrice,
          downPayment: parsedFields.downPayment,
          transferDate: parsedFields.transferDate ?? '',
          paymentSchedule: parsedFields.paymentSchedule ?? '',
          // Lease-to-own fields  
          optionFee: parsedFields.optionFee,
          optionPeriodMonths: parsedFields.optionPeriodMonths ?? 12,
          purchaseOptionPrice: parsedFields.purchaseOptionPrice,
          rentCreditPercent: parsedFields.rentCreditPercent ?? 25,
          // Common fields
          citizenId: contract.citizenId || '',
          numberOfResidents: contract.numberOfResidents,
          termsNotes: getCleanTermsNotes(contract.termsNotes),
        });
      } else {
        form.reset({
          contractType: 'rental',
          apartmentId: '',
          partyId: '',
          startDate: new Date().toISOString().split('T')[0],
          endDate: '',
          rentAmount: 0,
          depositMonths: 2,
          depositAmount: undefined,
          paymentDueDay: 5,
          purchasePrice: undefined,
          downPayment: undefined,
          paymentSchedule: '',
          transferDate: '',
          optionFee: undefined,
          optionPeriodMonths: 12,
          purchaseOptionPrice: undefined,
          rentCreditPercent: 25,
          citizenId: '',
          numberOfResidents: undefined,
          termsNotes: '',
        });
      }
    }
  }, [open, mode, contract, form]);

  const onSubmit = async (values: ContractFormValues) => {
    try {
      if (mode === 'create') {
        // Build input based on contract type - send actual field values
        const input: CreateContractInput = {
          apartmentId: values.apartmentId,
          tenantId: values.partyId, // API still uses tenantId
          start_date: values.startDate,
          endDate: values.endDate || undefined,
          // Base rental fields
          rentAmount: values.contractType === 'rental' || values.contractType === 'lease_to_own'
            ? (values.rentAmount || 0)
            : 0,
          depositMonths: values.depositMonths,
          depositAmount: values.depositAmount,
          citizenId: values.citizenId || undefined,
          numberOfResidents: values.numberOfResidents,
          termsNotes: buildTermsNotes(values),
          // Contract type specific fields
          contractType: values.contractType,
          paymentDueDay: values.paymentDueDay,
          // Purchase fields
          purchasePrice: values.contractType === 'purchase' ? values.purchasePrice : undefined,
          downPayment: values.contractType === 'purchase' ? values.downPayment : undefined,
          transferDate: values.contractType === 'purchase' ? values.transferDate : undefined,
          // Lease-to-own fields
          optionFee: values.contractType === 'lease_to_own' ? values.optionFee : undefined,
          purchaseOptionPrice: values.contractType === 'lease_to_own' ? values.purchaseOptionPrice : undefined,
          optionPeriodMonths: values.contractType === 'lease_to_own' ? values.optionPeriodMonths : undefined,
          rentCreditPercent: values.contractType === 'lease_to_own' ? values.rentCreditPercent : undefined,
        };
        await createContract.mutateAsync(input);
        toast({
          title: 'Contract created',
          description: getSuccessMessage(values.contractType),
        });
      } else if (contract) {
        await updateContract.mutateAsync({
          id: contract.id,
          data: {
            endDate: values.endDate || undefined,
            rentAmount: values.rentAmount,
            citizenId: values.citizenId || undefined,
            numberOfResidents: values.numberOfResidents,
            depositAmount: values.depositAmount,
            termsNotes: buildTermsNotes(values),
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
  const typeConfig = CONTRACT_TYPES[contractType];
  const TypeIcon = typeConfig.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TypeIcon className="h-5 w-5" />
            {mode === 'create' ? 'New Contract' : 'Edit Contract'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Create a new contract for the apartment.'
              : 'Update contract details.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Contract Type Selection */}
            <FormField
              control={form.control}
              name="contractType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contract Type</FormLabel>
                  <div className="grid grid-cols-3 gap-3">
                    {(Object.entries(CONTRACT_TYPES) as [ContractType, typeof CONTRACT_TYPES[ContractType]][]).map(
                      ([type, config]) => {
                        const Icon = config.icon;
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => field.onChange(type)}
                            className={cn(
                              'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors',
                              field.value === type
                                ? 'border-primary bg-primary/5'
                                : 'border-muted hover:border-muted-foreground/50',
                            )}
                          >
                            <Icon className="h-6 w-6" />
                            <div className="text-center">
                              <p className="font-medium text-sm">{config.label}</p>
                              <p className="text-xs text-muted-foreground">
                                {config.description}
                              </p>
                            </div>
                          </button>
                        );
                      },
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            {/* Parties Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Parties</h3>
              
              {/* Apartment */}
              <FormField
                control={form.control}
                name="apartmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Apartment</FormLabel>
                    <FormControl>
                      <ApartmentCombobox
                        value={field.value}
                        onChange={field.onChange}
                        disabled={mode === 'edit'}
                        statusFilter={mode === 'create' ? 'vacant' : undefined}
                        existingApartmentLabel={
                          mode === 'edit' && contract?.apartment
                            ? contract.apartment.unit_number
                            : undefined
                        }
                      />
                    </FormControl>
                    <FormDescription>
                      {mode === 'create'
                        ? 'Only vacant apartments are shown.'
                        : 'Apartment cannot be changed.'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Party (Tenant/Buyer) */}
              <FormField
                control={form.control}
                name="partyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{typeConfig.partyLabel}</FormLabel>
                    <FormControl>
                      <PartyCombobox
                        value={field.value}
                        onChange={field.onChange}
                        disabled={mode === 'edit'}
                        partyLabel={typeConfig.partyLabel}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Party Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Party Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="citizenId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Citizen / National ID</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 079200012345" {...field} />
                      </FormControl>
                      <FormDescription>CMND / CCCD number</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="numberOfResidents"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Residents</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          placeholder="2"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormDescription>People who will occupy the unit</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Dates Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Duration</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {contractType === 'purchase' ? 'Contract Date' : 'Start Date'}
                      </FormLabel>
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
                      <FormLabel>
                        {contractType === 'purchase' ? 'Completion Date' : 'End Date'}
                      </FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormDescription>
                        {contractType === 'rental' && 'Leave empty for open-ended lease.'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Financial Details - Conditional based on contract type */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Financial Terms</h3>

              {/* Rental Fields */}
              {contractType === 'rental' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
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
                    <FormField
                      control={form.control}
                      name="paymentDueDay"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Due Day</FormLabel>
                          <FormControl>
                            <Input type="number" min={1} max={28} {...field} />
                          </FormControl>
                          <FormDescription>Day of month (1-28)</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
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
                            Leave empty to auto-calculate.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </>
              )}

              {/* Purchase Fields */}
              {contractType === 'purchase' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="purchasePrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Purchase Price (VND)</FormLabel>
                          <FormControl>
                            <Input type="number" min={0} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="downPayment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Down Payment (VND)</FormLabel>
                          <FormControl>
                            <Input type="number" min={0} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="transferDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ownership Transfer Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormDescription>
                          Scheduled date for deed transfer.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="paymentSchedule"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Schedule</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="E.g., 30% on signing, 40% on handover, 30% within 30 days..."
                            className="min-h-[60px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {/* Lease-to-Own Fields */}
              {contractType === 'lease_to_own' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
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
                    <FormField
                      control={form.control}
                      name="optionFee"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Option Fee (VND)</FormLabel>
                          <FormControl>
                            <Input type="number" min={0} {...field} />
                          </FormControl>
                          <FormDescription>
                            Non-refundable fee for purchase option.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="purchaseOptionPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Purchase Option Price (VND)</FormLabel>
                          <FormControl>
                            <Input type="number" min={0} {...field} />
                          </FormControl>
                          <FormDescription>
                            Locked-in purchase price.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="optionPeriodMonths"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Option Period (months)</FormLabel>
                          <FormControl>
                            <Input type="number" min={1} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="rentCreditPercent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rent Credit (%)</FormLabel>
                          <FormControl>
                            <Input type="number" min={0} max={100} {...field} />
                          </FormControl>
                          <FormDescription>
                            % of rent applied to purchase price.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="depositAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Security Deposit (VND)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              {...field}
                              value={field.value ?? ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </>
              )}
            </div>

            <Separator />

            {/* Terms & Notes */}
            <FormField
              control={form.control}
              name="termsNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Terms & Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Special conditions, clauses, or notes..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 sm:gap-0">
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

// ============================================================================
// Helper Functions
// ============================================================================

function buildTermsNotes(values: ContractFormValues): string {
  const parts: string[] = [];
  
  // Add contract type header
  parts.push(`[Contract Type: ${CONTRACT_TYPES[values.contractType].label}]`);
  
  // Add type-specific details
  if (values.contractType === 'purchase') {
    if (values.purchasePrice) parts.push(`Purchase Price: ${values.purchasePrice.toLocaleString()} VND`);
    if (values.downPayment) parts.push(`Down Payment: ${values.downPayment.toLocaleString()} VND`);
    if (values.transferDate) parts.push(`Transfer Date: ${values.transferDate}`);
    if (values.paymentSchedule) parts.push(`Payment Schedule: ${values.paymentSchedule}`);
  } else if (values.contractType === 'lease_to_own') {
    if (values.optionFee) parts.push(`Option Fee: ${values.optionFee.toLocaleString()} VND`);
    if (values.purchaseOptionPrice) parts.push(`Purchase Option Price: ${values.purchaseOptionPrice.toLocaleString()} VND`);
    if (values.optionPeriodMonths) parts.push(`Option Period: ${values.optionPeriodMonths} months`);
    if (values.rentCreditPercent) parts.push(`Rent Credit: ${values.rentCreditPercent}%`);
  } else if (values.contractType === 'rental') {
    if (values.paymentDueDay) parts.push(`Payment Due: Day ${values.paymentDueDay} of each month`);
  }
  
  // Add user notes
  if (values.termsNotes) {
    parts.push('---');
    parts.push(values.termsNotes);
  }
  
  return parts.join('\n');
}

function getSuccessMessage(type: ContractType): string {
  switch (type) {
    case 'purchase':
      return 'The purchase contract has been created.';
    case 'lease_to_own':
      return 'The lease-to-own contract has been created.';
    default:
      return 'The rental contract has been created and apartment marked as occupied.';
  }
}
