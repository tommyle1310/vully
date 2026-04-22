'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

// ─── Types ──────────────────────────────────────────────

export interface UnmatchedPayment {
  id: string;
  gateway: string;
  transactionId: string;
  amount: number;
  senderName: string | null;
  description: string | null;
  receivedAt: string;
  status: string;
  matchedInvoiceId: string | null;
  matchedBy: string | null;
  matchedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

interface UnmatchedPaymentsListResponse {
  data: UnmatchedPayment[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface UnmatchedPaymentsStats {
  pending: number;
  matched: number;
  rejected: number;
  totalPendingAmount: number;
}

interface PotentialMatch {
  id: string;
  invoice_number: string;
  total_amount: number;
  paid_amount: number;
  status: string;
  apartment_unit?: string;
  due_date: string;
  matchScore: number;
}

// ─── Hooks ──────────────────────────────────────────────

export function useUnmatchedPayments(
  status: 'pending' | 'matched' | 'rejected' = 'pending',
  page = 1,
  limit = 20,
) {
  return useQuery({
    queryKey: ['unmatched-payments', { status, page, limit }],
    queryFn: () =>
      apiClient.get<UnmatchedPaymentsListResponse>(
        `/unmatched-payments?status=${status}&page=${page}&limit=${limit}`,
      ),
    staleTime: 30 * 1000,
  });
}

export function useUnmatchedPaymentsStats() {
  return useQuery({
    queryKey: ['unmatched-payments', 'stats'],
    queryFn: () =>
      apiClient.get<UnmatchedPaymentsStats>('/unmatched-payments/stats'),
    staleTime: 30 * 1000,
  });
}

export function usePotentialMatches(paymentId: string | null) {
  return useQuery({
    queryKey: ['unmatched-payments', paymentId, 'potential-matches'],
    queryFn: () =>
      apiClient.get<PotentialMatch[]>(
        `/unmatched-payments/${paymentId}/potential-matches`,
      ),
    enabled: !!paymentId,
  });
}

export function useMatchPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ paymentId, invoiceId }: { paymentId: string; invoiceId: string }) =>
      apiClient.post(`/unmatched-payments/${paymentId}/match`, { invoiceId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unmatched-payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

export function useRejectUnmatchedPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ paymentId, reason }: { paymentId: string; reason: string }) =>
      apiClient.post(`/unmatched-payments/${paymentId}/reject`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unmatched-payments'] });
    },
  });
}
