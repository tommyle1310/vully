'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface BankAccount {
  id: string;
  buildingId?: string;
  ownerId?: string;
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  isPrimary: boolean;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  building?: {
    id: string;
    name: string;
  };
  owner?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface CreateBankAccountInput {
  buildingId?: string;
  ownerId?: string;
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  isPrimary?: boolean;
  notes?: string;
}

export interface UpdateBankAccountInput {
  bankName?: string;
  accountName?: string;
  isPrimary?: boolean;
  isActive?: boolean;
  notes?: string;
}

interface BankAccountsResponse {
  data: BankAccount[];
}

interface BankAccountResponse {
  data: BankAccount;
}

interface PaymentBankAccountResponse {
  data: BankAccount | null;
}

// Common Vietnamese banks with their VietQR BIN codes
export const VIETNAMESE_BANKS = [
  { binCode: '970415', name: 'VietinBank' },
  { binCode: '970436', name: 'Vietcombank' },
  { binCode: '970418', name: 'BIDV' },
  { binCode: '970405', name: 'Agribank' },
  { binCode: '970407', name: 'Techcombank' },
  { binCode: '970422', name: 'MB Bank' },
  { binCode: '970423', name: 'TPBank' },
  { binCode: '970432', name: 'VPBank' },
  { binCode: '970403', name: 'Sacombank' },
  { binCode: '970441', name: 'VIB' },
  { binCode: '970426', name: 'MSB' },
  { binCode: '970448', name: 'OCB' },
  { binCode: '970433', name: 'SHB' },
  { binCode: '970454', name: 'ACB' },
  { binCode: '970449', name: 'HDBank' },
  { binCode: '970427', name: 'VietABank' },
  { binCode: '970443', name: 'Eximbank' },
  { binCode: '970431', name: 'SCB' },
  { binCode: '970428', name: 'NAB' },
  { binCode: '970429', name: 'SeABank' },
  { binCode: '970458', name: 'Bac A Bank' },
  { binCode: '970452', name: 'KienLongBank' },
  { binCode: '970430', name: 'PG Bank' },
  { binCode: '970440', name: 'LienVietPostBank' },
  { binCode: '970406', name: 'DongA Bank' },
  { binCode: '970439', name: 'Public Bank VN' },
  { binCode: '970438', name: 'Baoviet Bank' },
  { binCode: '970437', name: 'ABBANK' },
];

// =============================================================================
// Bank Account Hooks
// =============================================================================

/**
 * Get all bank accounts
 */
export function useBankAccounts(filters?: { buildingId?: string; ownerId?: string }) {
  const params = new URLSearchParams();
  if (filters?.buildingId) params.set('buildingId', filters.buildingId);
  if (filters?.ownerId) params.set('ownerId', filters.ownerId);

  return useQuery({
    queryKey: ['bank-accounts', filters],
    queryFn: () => apiClient.get<BankAccountsResponse>(`/bank-accounts?${params.toString()}`),
    staleTime: 5 * 60 * 1000, // 5 min cache
  });
}

/**
 * Get a single bank account
 */
export function useBankAccount(id: string) {
  return useQuery({
    queryKey: ['bank-accounts', id],
    queryFn: () => apiClient.get<BankAccountResponse>(`/bank-accounts/${id}`),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get the appropriate bank account for a payment (for residents)
 * Returns the bank account based on building (mgmt fees) or owner (rent)
 */
export function useBankAccountForPayment(buildingId: string, ownerId?: string, isRentPayment = true) {
  const params = new URLSearchParams();
  params.set('buildingId', buildingId);
  if (ownerId) params.set('ownerId', ownerId);
  params.set('isRentPayment', String(isRentPayment));

  return useQuery({
    queryKey: ['bank-accounts', 'for-payment', buildingId, ownerId, isRentPayment],
    queryFn: () => apiClient.get<PaymentBankAccountResponse>(`/bank-accounts/for-payment?${params.toString()}`),
    enabled: !!buildingId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Create a new bank account
 */
export function useCreateBankAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBankAccountInput) => {
      return apiClient.post<BankAccountResponse>('/bank-accounts', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
    },
  });
}

/**
 * Update a bank account
 */
export function useUpdateBankAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBankAccountInput }) => {
      return apiClient.patch<BankAccountResponse>(`/bank-accounts/${id}`, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['bank-accounts', variables.id] });
    },
  });
}

/**
 * Delete a bank account
 */
export function useDeleteBankAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => {
      return apiClient.delete(`/bank-accounts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
    },
  });
}
