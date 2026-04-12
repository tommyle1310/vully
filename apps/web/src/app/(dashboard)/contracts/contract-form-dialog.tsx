'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, parseISO } from 'date-fns';
import { Loader2, Key, Car, CreditCard } from 'lucide-react';
import {
  Contract,
  CreateContractInput,
  useCreateContract,
  useUpdateContract,
} from '@/hooks/use-contracts';
import { useIssueAccessCard } from '@/hooks/use-access-cards';
import { ApartmentCombobox } from '@/components/apartment-combobox';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Separator } from '@/components/ui/separator';
import { DatePicker } from '@/components/date-picker';
import {
  contractFormSchema,
  ContractFormValues,
  ContractType,
  CONTRACT_TYPES,
} from './contract-form-schema';
import {
  parseContractType,
  parseTermsNotesFields,
  getCleanTermsNotes,
  buildTermsNotes,
  getSuccessMessage,
} from './contract-form-helpers';
import { PartyCombobox } from './party-combobox';
import { ContractFinancialTerms } from './contract-financial-terms';

interface ContractFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract?: Contract;
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
  const issueAccessCard = useIssueAccessCard();

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
      issueBuildingCard: true,
      issueParkingCard: false,
      requestedFacilities: ['lobby', 'elevator'],
    },
  });

  const contractType = form.watch('contractType');

  useEffect(() => {
    if (open) {
      if (mode === 'edit' && contract) {
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
          purchasePrice: parsedFields.purchasePrice,
          downPayment: parsedFields.downPayment,
          transferDate: parsedFields.transferDate ?? '',
          paymentSchedule: parsedFields.paymentSchedule ?? '',
          optionFee: parsedFields.optionFee,
          optionPeriodMonths: parsedFields.optionPeriodMonths ?? 12,
          purchaseOptionPrice: parsedFields.purchaseOptionPrice,
          rentCreditPercent: parsedFields.rentCreditPercent ?? 25,
          citizenId: contract.citizenId || '',
          numberOfResidents: contract.numberOfResidents,
          termsNotes: getCleanTermsNotes(contract.termsNotes),
          issueBuildingCard: false,
          issueParkingCard: false,
          requestedFacilities: [],
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
          issueBuildingCard: true,
          issueParkingCard: false,
          requestedFacilities: ['lobby', 'elevator'],
        });
      }
    }
  }, [open, mode, contract, form]);

  const onSubmit = async (values: ContractFormValues) => {
    try {
      if (mode === 'create') {
        const input: CreateContractInput = {
          apartmentId: values.apartmentId,
          tenantId: values.partyId,
          start_date: values.startDate,
          endDate: values.endDate || undefined,
          rentAmount: values.contractType === 'rental' || values.contractType === 'lease_to_own'
            ? (values.rentAmount || 0)
            : 0,
          depositMonths: values.depositMonths,
          depositAmount: values.depositAmount,
          citizenId: values.citizenId || undefined,
          numberOfResidents: values.numberOfResidents,
          termsNotes: buildTermsNotes(values),
          contractType: values.contractType,
          paymentDueDay: values.paymentDueDay,
          purchasePrice: values.contractType === 'purchase' ? values.purchasePrice : undefined,
          downPayment: values.contractType === 'purchase' ? values.downPayment : undefined,
          transferDate: values.contractType === 'purchase' ? values.transferDate : undefined,
          optionFee: values.contractType === 'lease_to_own' ? values.optionFee : undefined,
          purchaseOptionPrice: values.contractType === 'lease_to_own' ? values.purchaseOptionPrice : undefined,
          optionPeriodMonths: values.contractType === 'lease_to_own' ? values.optionPeriodMonths : undefined,
          rentCreditPercent: values.contractType === 'lease_to_own' ? values.rentCreditPercent : undefined,
        };
        await createContract.mutateAsync(input);

        const accessCardPromises: Promise<unknown>[] = [];
        if (values.issueBuildingCard) {
          accessCardPromises.push(
            issueAccessCard.mutateAsync({
              apartmentId: values.apartmentId,
              cardType: 'building',
              accessZones: values.requestedFacilities || ['lobby', 'elevator'],
            }),
          );
        }
        if (values.issueParkingCard) {
          accessCardPromises.push(
            issueAccessCard.mutateAsync({
              apartmentId: values.apartmentId,
              cardType: 'parking',
              accessZones: ['parking'],
            }),
          );
        }

        if (accessCardPromises.length > 0) {
          try {
            await Promise.all(accessCardPromises);
            toast({
              title: 'Contract created',
              description: `${getSuccessMessage(values.contractType)} Access cards have been issued.`,
            });
          } catch {
            toast({
              title: 'Contract created',
              description: `${getSuccessMessage(values.contractType)} However, some access cards failed to issue. Please issue them manually.`,
              variant: 'default',
            });
          }
        } else {
          toast({
            title: 'Contract created',
            description: getSuccessMessage(values.contractType),
          });
        }
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

  const isSubmitting = createContract.isPending || updateContract.isPending || issueAccessCard.isPending;
  const typeConfig = CONTRACT_TYPES[contractType];
  const TypeIcon = typeConfig.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
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
                            disabled={mode === 'edit'}
                            className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                              field.value === type
                                ? 'border-primary bg-primary/5'
                                : 'border-muted hover:border-muted-foreground/30'
                            } ${mode === 'edit' ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            <Icon className={`h-5 w-5 ${field.value === type ? 'text-primary' : 'text-muted-foreground'}`} />
                            <span className="text-sm font-medium">{config.label}</span>
                            <span className="text-xs text-muted-foreground text-center">
                              {config.description}
                            </span>
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

            {/* Parties */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Parties</h3>
              <div className="grid grid-cols-2 gap-4">
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
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
            </div>

            {/* Party Details */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="citizenId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Citizen ID / CCCD</FormLabel>
                    <FormControl>
                      <Input placeholder="ID number" {...field} />
                    </FormControl>
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
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Dates */}
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
                        <DatePicker
                          value={field.value ? parseISO(field.value) : undefined}
                          onChange={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                          disabled={mode === 'edit'}
                          placeholder="Select date"
                        />
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
                        <DatePicker
                          value={field.value ? parseISO(field.value) : undefined}
                          onChange={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                          placeholder="Select date"
                        />
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

            {/* Financial Terms */}
            <ContractFinancialTerms form={form} contractType={contractType} />

            <Separator />

            {/* Access Cards (create mode only) */}
            {mode === 'create' && (
              <>
                <div className="space-y-4">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Access Cards
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Issue access cards automatically when creating this contract.
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="issueBuildingCard"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <label className="flex flex-row items-start space-x-3 rounded-md border p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                              <div className="space-y-1 leading-none flex-1">
                                <div className="flex items-center gap-2 font-medium text-sm cursor-pointer">
                                  <Key className="h-4 w-4" />
                                  Building Card
                                </div>
                                <p className="text-sm text-muted-foreground cursor-pointer">
                                  Lobby & elevator access
                                </p>
                              </div>
                            </label>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="issueParkingCard"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <label className="flex flex-row items-start space-x-3 rounded-md border p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                              <div className="space-y-1 leading-none flex-1">
                                <div className="flex items-center gap-2 font-medium text-sm cursor-pointer">
                                  <Car className="h-4 w-4" />
                                  Parking Card
                                </div>
                                <p className="text-sm text-muted-foreground cursor-pointer">
                                  Vehicle parking access
                                </p>
                              </div>
                            </label>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  {form.watch('issueBuildingCard') && (
                    <FormField
                      control={form.control}
                      name="requestedFacilities"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Facility Access</FormLabel>
                          <FormDescription>
                            Select which facilities the building card can access.
                          </FormDescription>
                          <div className="grid grid-cols-3 gap-2 mt-2">
                            {[
                              { id: 'lobby', label: 'Lobby' },
                              { id: 'elevator', label: 'Elevator' },
                              { id: 'gym', label: 'Gym' },
                              { id: 'pool', label: 'Pool' },
                              { id: 'rooftop', label: 'Rooftop' },
                              { id: 'laundry', label: 'Laundry' },
                            ].map((facility) => (
                              <label
                                key={facility.id}
                                className="flex items-center gap-2 rounded border p-2 cursor-pointer hover:bg-muted/50 transition-colors"
                              >
                                <Checkbox
                                  checked={field.value?.includes(facility.id)}
                                  onCheckedChange={(checked) => {
                                    const current = field.value || [];
                                    if (checked) {
                                      field.onChange([...current, facility.id]);
                                    } else {
                                      field.onChange(
                                        current.filter((f) => f !== facility.id),
                                      );
                                    }
                                  }}
                                />
                                <span className="text-sm cursor-pointer">{facility.label}</span>
                              </label>
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <Separator />
              </>
            )}

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
            </div>

            <DialogFooter className="px-6 py-4 border-t gap-2 sm:gap-0">
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
