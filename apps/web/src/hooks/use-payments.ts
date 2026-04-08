'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

// Types matching backend DTOs
export type PaymentType = 'downpayment' | 'installment' | 'rent' | 'deposit' | 'option_fee' | 'penalty' | 'adjustment';
export type PaymentStatus = 'pending' | 'reported' | 'verified' | 'partial' | 'paid' | 'overdue' | 'waived';
export type ContractPaymentStatus = 'reported' | 'confirmed' | 'rejected';
export type PaymentMethod = 'bank_transfer' | 'cash' | 'check' | 'card' | 'other';

export interface PaymentSchedule {
  id: string;
  contractId: string;
  periodLabel: string;
  paymentType: PaymentType;
  sequenceNumber: number;
  dueDate: string;
  expectedAmount: number;
  receivedAmount: number;
  balance: number;
  status: PaymentStatus;
  notes?: string;
  created_at: string;
  updatedAt: string;
  payments?: Payment[];
}

export interface Payment {
  id: string;
  scheduleId: string;
  amount: number;
  paymentDate: string;
  paymentMethod?: PaymentMethod;
  referenceNumber?: string;
  status: ContractPaymentStatus;
  reportedBy?: string;
  reportedAt?: string;
  recordedBy: string;
  recordedAt: string;
  verifiedBy?: string;
  verifiedAt?: string;
  receiptUrl?: string;
  notes?: string;
  recordedByUser?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  reportedByUser?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export interface PendingPayment extends Payment {
  schedule: {
    id: string;
    periodLabel: string;
    expectedAmount: number;
    receivedAmount: number;
    dueDate: string;
    contractId: string;
  };
  contract?: {
    id: string;
    apartmentId: string;
    tenantId: string;
    tenantName: string;
    apartmentCode: string;
  };
}

export interface ContractFinancialSummary {
  totalContractValue: number;
  totalPaid: number;
  reportedPending: number;
  paidPercent: number;
  outstanding: number;
  remainingBalance: number;
  nextDue?: PaymentSchedule;
  recentPayments?: Payment[];
}

export interface CreatePaymentScheduleInput {
  periodLabel: string;
  paymentType: PaymentType;
  sequenceNumber: number;
  dueDate: string;
  expectedAmount: number;
  notes?: string;
}

export interface UpdatePaymentScheduleInput {
  periodLabel?: string;
  dueDate?: string;
  expectedAmount?: number;
  status?: PaymentStatus;
  notes?: string;
}

export interface RecordPaymentInput {
  amount: number;
  paymentDate: string;
  paymentMethod?: PaymentMethod;
  referenceNumber?: string;
  receiptUrl?: string;
  notes?: string;
}

export interface ReportPaymentInput {
  amount: number;
  paymentDate: string;
  paymentMethod?: PaymentMethod;
  referenceNumber?: string;
  receiptUrl?: string;
  notes?: string;
}

export interface VerifyPaymentInput {
  status: ContractPaymentStatus;
  notes?: string;
  actualAmount?: number;
}

export interface GenerateRentScheduleInput {
  months?: number;
  paymentDueDay?: number;
}

export interface GeneratePurchaseMilestonesInput {
  progressPaymentCount?: number;
  downPaymentPercent?: number;
}

// API response types
interface PaymentSchedulesResponse {
  data: PaymentSchedule[];
}

interface PaymentScheduleResponse {
  data: PaymentSchedule;
}

interface PaymentsResponse {
  data: Payment[];
}

interface PaymentResponse {
  data: Payment;
  message?: string;
}

interface FinancialSummaryResponse {
  data: ContractFinancialSummary;
}

interface PendingPaymentsResponse {
  data: PendingPayment[];
}

// =============================================================================
// Payment Schedule Hooks
// =============================================================================

/**
 * Get all payment schedules for a contract
 */
export function usePaymentSchedules(contractId: string) {
  return useQuery({
    queryKey: ['contracts', contractId, 'payment-schedules'],
    queryFn: () => apiClient.get<PaymentSchedulesResponse>(`/contracts/${contractId}/payment-schedules`),
    enabled: !!contractId,
    staleTime: 2 * 60 * 1000, // 2 min cache
  });
}

/**
 * Get a single payment schedule by ID
 */
export function usePaymentSchedule(scheduleId: string) {
  return useQuery({
    queryKey: ['payment-schedules', scheduleId],
    queryFn: () => apiClient.get<PaymentScheduleResponse>(`/payment-schedules/${scheduleId}`),
    enabled: !!scheduleId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Create a new payment schedule for a contract
 */
export function useCreatePaymentSchedule(contractId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePaymentScheduleInput) => {
      return apiClient.post<PaymentScheduleResponse>(`/contracts/${contractId}/payment-schedules`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts', contractId, 'payment-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['contracts', contractId, 'financial-summary'] });
    },
  });
}

/**
 * Update a payment schedule
 */
export function useUpdatePaymentSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ scheduleId, data }: { scheduleId: string; data: UpdatePaymentScheduleInput }) => {
      return apiClient.patch<PaymentScheduleResponse>(`/payment-schedules/${scheduleId}`, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payment-schedules', variables.scheduleId] });
      // Invalidate all contract payment schedules (we don't know which contract)
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
  });
}

/**
 * Delete a payment schedule
 */
export function useDeletePaymentSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (scheduleId: string) => {
      return apiClient.delete(`/payment-schedules/${scheduleId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['payment-schedules'] });
    },
  });
}

/**
 * Auto-generate rent schedule for a rental contract
 */
export function useGenerateRentSchedule(contractId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data?: GenerateRentScheduleInput) => {
      return apiClient.post<PaymentSchedulesResponse>(
        `/contracts/${contractId}/generate-rent-schedule`,
        data || {}
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts', contractId, 'payment-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['contracts', contractId, 'financial-summary'] });
    },
  });
}

/**
 * Auto-generate payment milestones for a purchase contract
 */
export function useGeneratePurchaseMilestones(contractId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data?: GeneratePurchaseMilestonesInput) => {
      return apiClient.post<PaymentSchedulesResponse>(
        `/contracts/${contractId}/generate-purchase-milestones`,
        data || {}
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts', contractId, 'payment-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['contracts', contractId, 'financial-summary'] });
    },
  });
}

// =============================================================================
// Payment Transaction Hooks
// =============================================================================

/**
 * Get all payments for a contract
 */
export function useContractPayments(contractId: string) {
  return useQuery({
    queryKey: ['contracts', contractId, 'payments'],
    queryFn: () => apiClient.get<PaymentsResponse>(`/contracts/${contractId}/payments`),
    enabled: !!contractId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Record a payment against a schedule
 */
export function useRecordPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ scheduleId, data }: { scheduleId: string; data: RecordPaymentInput }) => {
      return apiClient.post<PaymentResponse>(`/payment-schedules/${scheduleId}/payments`, data);
    },
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['payment-schedules'] });
    },
  });
}

/**
 * Void (delete) a payment
 */
export function useVoidPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (paymentId: string) => {
      return apiClient.delete(`/payments/${paymentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['payment-schedules'] });
    },
  });
}

// =============================================================================
// Payment Reporting (Resident)
// =============================================================================

/**
 * Report a payment transfer (for residents, awaiting admin verification)
 */
export function useReportPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ scheduleId, data }: { scheduleId: string; data: ReportPaymentInput }) => {
      return apiClient.post<PaymentResponse>(`/payment-schedules/${scheduleId}/report`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['payment-schedules'] });
    },
  });
}

// =============================================================================
// Payment Verification (Admin)
// =============================================================================

/**
 * Get all pending payments awaiting verification
 */
export function usePendingPayments() {
  return useQuery({
    queryKey: ['payments', 'pending'],
    queryFn: () => apiClient.get<PendingPaymentsResponse>('/payments/pending'),
    staleTime: 30 * 1000, // 30 seconds - needs to be fresher
  });
}

/**
 * Get payment history (confirmed/rejected in last N days)
 */
export function usePaymentHistory(days: number = 30) {
  return useQuery({
    queryKey: ['payments', 'history', days],
    queryFn: () => apiClient.get<PendingPaymentsResponse>(`/payments/history?days=${days}`),
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Verify or reject a reported payment
 */
export function useVerifyPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ paymentId, data }: { paymentId: string; data: VerifyPaymentInput }) => {
      return apiClient.patch<PaymentResponse>(`/payments/${paymentId}/verify`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', 'pending'] });
      queryClient.invalidateQueries({ queryKey: ['payments', 'history'] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['payment-schedules'] });
      // Also invalidate invoices since payment confirmation now syncs invoice status
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

// =============================================================================
// Financial Summary Hooks
// =============================================================================

/**
 * Get financial summary for a contract
 */
export function useContractFinancialSummary(contractId: string) {
  return useQuery({
    queryKey: ['contracts', contractId, 'financial-summary'],
    queryFn: () => apiClient.get<FinancialSummaryResponse>(`/contracts/${contractId}/financial-summary`),
    enabled: !!contractId,
    staleTime: 2 * 60 * 1000,
  });
}
