// =============================================================================
// Shared service-level types — moved from inline definitions in services
// =============================================================================

// --- Invoice Calculation ---
export interface InvoiceLineItemCalc {
  description: string;
  category: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  vatRate: number;
  vatAmount: number;
  environmentFee: number;
  utilityTypeId?: string;
  meterReadingId?: string;
  tierBreakdown?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface InvoiceCalculation {
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paymentReference?: string;
  lineItems: InvoiceLineItemCalc[];
}

// --- Dashboard Stats ---
export interface DashboardStats {
  apartments: {
    total: number;
    vacant: number;
    occupied: number;
    maintenance: number;
  };
  residents: {
    total: number;
    active: number;
  };
  invoices: {
    pending: number;
    overdue: number;
    paidThisMonth: number;
    totalOutstanding: number;
  };
  incidents: {
    open: number;
    inProgress: number;
    resolvedThisMonth: number;
  };
}

export interface AdminStats extends DashboardStats {
  revenue: {
    thisMonth: number;
    lastMonth: number;
    percentChange: number;
  };
  buildings: {
    total: number;
  };
}

// --- AI Assistant ---
export interface ChatQueryDto {
  query: string;
  userId: string;
  context?: {
    apartmentId?: string;
    buildingId?: string;
  };
}

export interface ChatResponse {
  response: string;
  sources: Array<{
    title: string;
    category: string;
    relevance: number;
  }>;
  tokensUsed?: number;
  responseTime: number;
  queryId?: string; // For cache write after response
}

export interface ApartmentQueryResult {
  id: string;
  unit_number: string;
  status: string;
  unit_type: string | null;
  bedroom_count: number;
  bathroom_count: number;
  gross_area: number | null;
  net_area: number | null;
  floor_index: number;
  building: {
    id: string;
    name: string;
    address: string;
  };
}

export interface BuildingQueryResult {
  id: string;
  name: string;
  address: string;
  city: string;
  floor_count: number;
  is_active: boolean;
  apartmentStats: {
    total: number;
    vacant: number;
    occupied: number;
    maintenance: number;
  };
}
