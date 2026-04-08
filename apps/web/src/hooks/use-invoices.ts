'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  category?: string;
  vatRate?: number;
  vatAmount?: number;
  environmentFee?: number;
  utilityTypeId?: string;
  meterReadingId?: string;
  tierBreakdown?: Record<string, unknown>;
}

export interface ReportedPaymentSnapshot {
  amount: number;
  paymentDate: string;
  paymentMethod?: string;
  referenceNumber?: string;
  notes?: string;
  reportedBy: string;
  reportedAt: string;
}

export interface Invoice {
  id: string;
  contractId: string;
  invoice_number: string;
  billingPeriod: string;
  issueDate: string;
  dueDate: string;
  status: 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled';
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  paid_at?: string;
  notes?: string;
  paymentReference?: string;
  lineItems: InvoiceLineItem[];
  created_at: string;
  updatedAt: string;
  // Reported payment info (from price_snapshot)
  priceSnapshot?: {
    reportedPayment?: ReportedPaymentSnapshot;
    [key: string]: unknown;
  };
  contract?: {
    id: string;
    apartments: {
      id: string;
      unit_number: string;
      buildings: {
        id: string;
        name: string;
      };
    };
    tenant: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  };
}

export interface InvoiceFilters {
  page?: number;
  limit?: number;
  contractId?: string;
  apartmentId?: string;
  billingPeriod?: string;
  status?: Invoice['status'];
  dueDateFrom?: string;
  dueDateTo?: string;
}

interface InvoicesResponse {
  data: Invoice[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

interface InvoiceResponse {
  data: Invoice;
}

export interface CreateInvoiceDto {
  contractId: string;
  billingPeriod: string;
  notes?: string;
}

export interface UpdateInvoiceDto {
  status?: Invoice['status'];
  paidAmount?: number;
  notes?: string;
}

// List invoices
export function useInvoices(filters: InvoiceFilters = {}) {
  const queryParams = new URLSearchParams();
  
  if (filters.page) queryParams.set('page', String(filters.page));
  if (filters.limit) queryParams.set('limit', String(filters.limit));
  if (filters.contractId) queryParams.set('contractId', filters.contractId);
  if (filters.apartmentId) queryParams.set('apartmentId', filters.apartmentId);
  if (filters.billingPeriod) queryParams.set('billingPeriod', filters.billingPeriod);
  if (filters.status) queryParams.set('status', filters.status);
  if (filters.dueDateFrom) queryParams.set('dueDateFrom', filters.dueDateFrom);
  if (filters.dueDateTo) queryParams.set('dueDateTo', filters.dueDateTo);

  return useQuery({
    queryKey: ['invoices', filters],
    queryFn: (): Promise<InvoicesResponse> => {
      const url = `/invoices?${queryParams.toString()}`;
      return apiClient.get<InvoicesResponse>(url);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Get single invoice
export function useInvoice(id: string) {
  return useQuery({
    queryKey: ['invoices', id],
    queryFn: (): Promise<InvoiceResponse> =>
      apiClient.get<InvoiceResponse>(`/invoices/${id}`),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

// Create invoice
export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateInvoiceDto): Promise<InvoiceResponse> =>
      apiClient.post<InvoiceResponse>('/invoices', dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

// Update invoice
export function useUpdateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateInvoiceDto;
    }): Promise<InvoiceResponse> =>
      apiClient.patch<InvoiceResponse>(`/invoices/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices', variables.id] });
    },
  });
}

// Mark invoice as paid
export function useMarkInvoicePaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string): Promise<InvoiceResponse> =>
      apiClient.patch<InvoiceResponse>(`/invoices/${id}/pay`, {}),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices', id] });
      // Also invalidate contract payment queries since mark-paid syncs to schedule
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });
}

// Get overdue invoices
export function useOverdueInvoices() {
  return useQuery({
    queryKey: ['invoices', 'overdue'],
    queryFn: (): Promise<{ data: Invoice[] }> =>
      apiClient.get<{ data: Invoice[] }>('/invoices/overdue'),
    staleTime: 5 * 60 * 1000,
  });
}

// Report invoice payment (resident)
export interface ReportInvoicePaymentInput {
  amount: number;
  paymentDate: string;
  paymentMethod?: 'bank_transfer' | 'cash' | 'check' | 'card' | 'other';
  referenceNumber?: string;
  notes?: string;
}

export function useReportInvoicePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      invoiceId,
      data,
    }: {
      invoiceId: string;
      data: ReportInvoicePaymentInput;
    }): Promise<InvoiceResponse & { message: string }> =>
      apiClient.post<InvoiceResponse & { message: string }>(
        `/invoices/${invoiceId}/report-payment`,
        data,
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices', variables.invoiceId] });
      // Also notify admin pending payments view
      queryClient.invalidateQueries({ queryKey: ['invoices', 'reported-payments'] });
    },
  });
}

// Get invoices with reported payments (admin)
export function useReportedInvoicePayments() {
  return useQuery({
    queryKey: ['invoices', 'reported-payments'],
    queryFn: (): Promise<{ data: Invoice[] }> =>
      apiClient.get<{ data: Invoice[] }>('/invoices/payments/reported'),
    staleTime: 30 * 1000, // 30 seconds - needs to be fresher for admin review
  });
}

// Verify or reject a reported invoice payment (admin)
export interface VerifyInvoicePaymentInput {
  status: 'confirmed' | 'rejected';
  actualAmount?: number;
  notes?: string;
}

export function useVerifyInvoicePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      invoiceId,
      data,
    }: {
      invoiceId: string;
      data: VerifyInvoicePaymentInput;
    }): Promise<InvoiceResponse & { message: string }> =>
      apiClient.patch<InvoiceResponse & { message: string }>(
        `/invoices/${invoiceId}/verify-payment`,
        data,
      ),
    onSuccess: () => {
      // Invalidate invoice queries
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices', 'reported-payments'] });
      // Also invalidate contract payment queries since invoice payment syncs to schedule
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });
}
