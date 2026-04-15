import { Injectable } from '@nestjs/common';
import {
  CreateInvoiceDto,
  UpdateInvoiceDto,
  InvoiceFiltersDto,
  InvoiceResponseDto,
  ReportInvoicePaymentDto,
  VerifyInvoicePaymentDto,
} from '../dto/invoice.dto';
import { DEFAULT_PAGINATION_LIMIT } from '../../../common/constants/defaults';
import { InvoicesCoreService } from './invoices-core.service';
import { InvoicesPaymentService } from './invoices-payment.service';

/**
 * Facade service for invoice operations.
 * Delegates to specialized services by concern:
 * - InvoicesCoreService: CRUD + supplementation
 * - InvoicesPaymentService: Payment verification workflow
 */
@Injectable()
export class InvoicesService {
  constructor(
    private readonly coreService: InvoicesCoreService,
    private readonly paymentService: InvoicesPaymentService,
  ) {}

  // =========================================================================
  // Core CRUD Operations (delegated to InvoicesCoreService)
  // =========================================================================

  async create(dto: CreateInvoiceDto, actorId: string, operationalOnly = false): Promise<InvoiceResponseDto> {
    return this.coreService.create(dto, actorId, operationalOnly);
  }

  async supplementInvoice(
    invoiceId: string,
    contractId: string,
    billingPeriod: string,
    categories?: string[],
    actorId?: string,
  ): Promise<InvoiceResponseDto | null> {
    return this.coreService.supplementInvoice(invoiceId, contractId, billingPeriod, categories, actorId);
  }

  async findAll(
    filters: InvoiceFiltersDto,
    page = 1,
    limit = DEFAULT_PAGINATION_LIMIT,
    userId?: string,
    userRole?: string,
  ): Promise<{ data: InvoiceResponseDto[]; total: number }> {
    return this.coreService.findAll(filters, page, limit, userId, userRole);
  }

  async findOne(id: string, userId?: string, userRole?: string): Promise<InvoiceResponseDto> {
    return this.coreService.findOne(id, userId, userRole);
  }

  async update(id: string, dto: UpdateInvoiceDto, actorId: string): Promise<InvoiceResponseDto> {
    return this.coreService.update(id, dto, actorId);
  }

  async getOverdueInvoices(): Promise<InvoiceResponseDto[]> {
    return this.coreService.getOverdueInvoices();
  }

  // =========================================================================
  // Payment Workflow (delegated to InvoicesPaymentService)
  // =========================================================================

  async reportPayment(id: string, dto: ReportInvoicePaymentDto, reporterId: string): Promise<InvoiceResponseDto> {
    return this.paymentService.reportPayment(id, dto, reporterId);
  }

  async getReportedPayments(): Promise<InvoiceResponseDto[]> {
    return this.paymentService.getReportedPayments();
  }

  async getPaymentHistory(days: number = 30): Promise<InvoiceResponseDto[]> {
    return this.paymentService.getPaymentHistory(days);
  }

  async verifyPayment(id: string, dto: VerifyInvoicePaymentDto, verifierId: string): Promise<InvoiceResponseDto> {
    return this.paymentService.verifyPayment(id, dto, verifierId);
  }
}
