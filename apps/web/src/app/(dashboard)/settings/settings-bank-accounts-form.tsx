'use client';

import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Plus, Pencil, Trash2, Check, Star, AlertCircle } from 'lucide-react';
import { useBuildings } from '@/hooks/use-buildings';
import {
  useBankAccounts,
  useCreateBankAccount,
  useUpdateBankAccount,
  useDeleteBankAccount,
  BankAccount,
  VIETNAMESE_BANKS,
} from '@/hooks/use-bank-accounts';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { Switch } from '@/components/ui/switch';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const bankAccountSchema = z.object({
  bankName: z.string().min(1, 'Bank name is required'),
  bankCode: z.string().min(1, 'Bank code is required'),
  accountNumber: z.string().min(1, 'Account number is required'),
  accountName: z.string().min(1, 'Account holder name is required'),
  buildingId: z.string().optional(),
  ownerId: z.string().optional(),
  isPrimary: z.boolean().default(false),
  notes: z.string().optional(),
});

type BankAccountFormData = z.infer<typeof bankAccountSchema>;

function BankAccountSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}

export function SettingsBankAccountsForm() {
  const { toast } = useToast();
  const { hasRole } = useAuthStore();
  const isAdmin = hasRole('admin');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<BankAccount | null>(null);

  const { data: accountsData, isLoading, error, refetch } = useBankAccounts();
  const { data: buildingsData } = useBuildings({ page: 1, limit: 100 });
  
  const createAccount = useCreateBankAccount();
  const updateAccount = useUpdateBankAccount();
  const deleteAccount = useDeleteBankAccount();

  const accounts = accountsData?.data || [];
  const buildings = buildingsData?.data || [];

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BankAccountFormData>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: {
      isPrimary: false,
    },
  });

  const selectedBankCode = watch('bankCode');

  const handleOpenDialog = useCallback((account?: BankAccount) => {
    if (account) {
      setEditingAccount(account);
      reset({
        bankName: account.bankName,
        bankCode: account.bankCode,
        accountNumber: account.accountNumber,
        accountName: account.accountName,
        buildingId: account.buildingId || '',
        ownerId: account.ownerId || '',
        isPrimary: account.isPrimary,
        notes: account.notes || '',
      });
    } else {
      setEditingAccount(null);
      reset({
        bankName: '',
        bankCode: '',
        accountNumber: '',
        accountName: '',
        buildingId: '',
        ownerId: '',
        isPrimary: false,
        notes: '',
      });
    }
    setDialogOpen(true);
  }, [reset]);

  const handleBankSelect = (bankCode: string) => {
    const bank = VIETNAMESE_BANKS.find((b) => b.binCode === bankCode);
    if (bank) {
      setValue('bankCode', bankCode);
      setValue('bankName', bank.name);
    }
  };

  const onSubmit = async (data: BankAccountFormData) => {
    try {
      if (editingAccount) {
        await updateAccount.mutateAsync({
          id: editingAccount.id,
          data: {
            bankName: data.bankName,
            accountName: data.accountName,
            isPrimary: data.isPrimary,
            notes: data.notes,
          },
        });
        toast({ title: 'Bank account updated', description: 'The bank account has been updated successfully.' });
      } else {
        await createAccount.mutateAsync({
          bankName: data.bankName,
          bankCode: data.bankCode,
          accountNumber: data.accountNumber,
          accountName: data.accountName,
          buildingId: data.buildingId || undefined,
          ownerId: data.ownerId || undefined,
          isPrimary: data.isPrimary,
          notes: data.notes,
        });
        toast({ title: 'Bank account created', description: 'The bank account has been created successfully.' });
      }
      setDialogOpen(false);
      refetch();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to save bank account',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteClick = (account: BankAccount) => {
    setAccountToDelete(account);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!accountToDelete) return;
    
    try {
      await deleteAccount.mutateAsync(accountToDelete.id);
      toast({ title: 'Bank account deleted', description: 'The bank account has been deleted.' });
      refetch();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to delete bank account',
        variant: 'destructive',
      });
    }
    setDeleteConfirmOpen(false);
    setAccountToDelete(null);
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
          <p className="text-muted-foreground text-center">
            Only administrators can manage bank accounts.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bank Accounts</CardTitle>
          <CardDescription>Manage bank accounts for receiving payments via VietQR</CardDescription>
        </CardHeader>
        <CardContent>
          <BankAccountSkeleton />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-semibold mb-2">Failed to load bank accounts</h3>
          <Button onClick={() => refetch()}>Try Again</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Bank Accounts</CardTitle>
              <CardDescription>
                Manage bank accounts for receiving payments via VietQR. Link accounts to buildings (for management fees) or owners (for rent).
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Account
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 border border-dashed rounded-lg">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No bank accounts</h3>
              <p className="text-muted-foreground text-center mb-4">
                Add your first bank account to enable VietQR payments
              </p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Bank Account
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bank</TableHead>
                    <TableHead>Account Number</TableHead>
                    <TableHead>Account Holder</TableHead>
                    <TableHead>Linked To</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence mode="popLayout">
                    {accounts.map((account) => (
                      <motion.tr
                        key={account.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="border-b transition-colors hover:bg-muted/50"
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {account.bankName}
                            {account.isPrimary && (
                              <Badge variant="secondary" className="gap-1">
                                <Star className="h-3 w-3" />
                                Primary
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">{account.accountNumber}</TableCell>
                        <TableCell>{account.accountName}</TableCell>
                        <TableCell>
                          {account.building ? (
                            <Badge variant="outline">
                              Building: {account.building.name}
                            </Badge>
                          ) : account.owner ? (
                            <Badge variant="outline">
                              Owner: {account.owner.firstName} {account.owner.lastName}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">Not linked</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(account)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteClick(account)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingAccount ? 'Edit Bank Account' : 'Add Bank Account'}
            </DialogTitle>
            <DialogDescription>
              {editingAccount
                ? 'Update the bank account details'
                : 'Add a new bank account for receiving VietQR payments'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Bank</Label>
              <Select value={selectedBankCode} onValueChange={handleBankSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a bank" />
                </SelectTrigger>
                <SelectContent>
                  {VIETNAMESE_BANKS.map((bank) => (
                    <SelectItem key={bank.binCode} value={bank.binCode}>
                      {bank.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.bankCode && (
                <p className="text-sm text-destructive">{errors.bankCode.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountNumber">Account Number</Label>
              <Input
                id="accountNumber"
                placeholder="Enter account number"
                {...register('accountNumber')}
              />
              {errors.accountNumber && (
                <p className="text-sm text-destructive">{errors.accountNumber.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountName">Account Holder Name</Label>
              <Input
                id="accountName"
                placeholder="Enter account holder name"
                {...register('accountName')}
              />
              {errors.accountName && (
                <p className="text-sm text-destructive">{errors.accountName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                placeholder="Enter notes"
                {...register('notes')}
              />
            </div>

            {!editingAccount && (
              <>
                <div className="space-y-2">
                  <Label>Link to Building (for Management Fees)</Label>
                  <Select
                    value={watch('buildingId') || '__none__'}
                    onValueChange={(v) => {
                      setValue('buildingId', v === '__none__' ? '' : v);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a building (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {buildings.map((building) => (
                        <SelectItem key={building.id} value={building.id}>
                          {building.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="isPrimary">Primary Account</Label>
                <p className="text-xs text-muted-foreground">
                  Use this as the primary account for payments
                </p>
              </div>
              <Switch
                id="isPrimary"
                checked={watch('isPrimary')}
                onCheckedChange={(checked) => setValue('isPrimary', checked)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createAccount.isPending || updateAccount.isPending}>
                {createAccount.isPending || updateAccount.isPending ? (
                  'Saving...'
                ) : editingAccount ? (
                  'Update'
                ) : (
                  'Create'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bank Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the bank account &quot;{accountToDelete?.bankName} - {accountToDelete?.accountNumber}&quot;?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
