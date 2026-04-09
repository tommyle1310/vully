import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { VietQRService } from './vietqr.service';
import {
  CreateInvoiceDto,
  UpdateInvoiceDto,
  InvoiceResponseDto,
  InvoiceFiltersDto,
  ReportInvoicePaymentDto,
  VerifyInvoicePaymentDto,
} from './dto/invoice.dto';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { InvoiceStatus } from '@prisma/client';
import { AuthUser } from '../../common/interfaces/auth-user.interface';

@ApiTags('Invoices')
@Controller('invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class InvoicesController {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly vietqrService: VietQRService,
  ) {}

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create a new invoice (admin only)' })
  @ApiResponse({ status: 201, description: 'Invoice created', type: InvoiceResponseDto })
  @ApiResponse({ status: 409, description: 'Invoice already exists for this contract and period' })
  async create(
    @Body() dto: CreateInvoiceDto,
    @CurrentUser() user: AuthUser,
  ): Promise<{ data: InvoiceResponseDto }> {
    const invoice = await this.invoicesService.create(dto, user.id);
    return { data: invoice };
  }

  @Get()
  @Roles('admin', 'technician', 'resident')
  @ApiOperation({ summary: 'List invoices (filtered by role)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'contractId', required: false, type: String })
  @ApiQuery({ name: 'apartmentId', required: false, type: String })
  @ApiQuery({ name: 'billingPeriod', required: false, type: String, example: '2026-03' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['draft', 'pending', 'paid', 'overdue', 'cancelled'],
  })
  @ApiQuery({ name: 'dueDateFrom', required: false, type: String })
  @ApiQuery({ name: 'dueDateTo', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Invoice list' })
  async findAll(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('contractId') contractId?: string,
    @Query('apartmentId') apartmentId?: string,
    @Query('billingPeriod') billingPeriod?: string,
    @Query('status') status?: string,
    @Query('dueDateFrom') dueDateFrom?: string,
    @Query('dueDateTo') dueDateTo?: string,
  ): Promise<{
    data: InvoiceResponseDto[];
    meta: { total: number; page: number; limit: number };
  }> {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '20', 10);

    const filters: InvoiceFiltersDto = {
      contractId,
      apartmentId,
      billingPeriod,
      status: status as InvoiceStatus,
      dueDateFrom,
      dueDateTo,
    };

    const result = await this.invoicesService.findAll(
      filters,
      pageNum,
      limitNum,
      user.id,
      user.role,
    );

    return {
      data: result.data,
      meta: {
        total: result.total,
        page: pageNum,
        limit: limitNum,
      },
    };
  }

  @Get('overdue')
  @Roles('admin')
  @ApiOperation({ summary: 'Get overdue invoices (admin only)' })
  @ApiResponse({ status: 200, description: 'Overdue invoices list' })
  async getOverdue(): Promise<{ data: InvoiceResponseDto[] }> {
    const invoices = await this.invoicesService.getOverdueInvoices();
    return { data: invoices };
  }

  @Get(':id')
  @Roles('admin', 'technician', 'resident')
  @ApiOperation({ summary: 'Get invoice by ID' })
  @ApiResponse({ status: 200, description: 'Invoice details', type: InvoiceResponseDto })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<{ data: InvoiceResponseDto }> {
    const invoice = await this.invoicesService.findOne(id, user.id, user.role);
    return { data: invoice };
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update invoice status/payment (admin only)' })
  @ApiResponse({ status: 200, description: 'Invoice updated', type: InvoiceResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInvoiceDto,
    @CurrentUser() user: AuthUser,
  ): Promise<{ data: InvoiceResponseDto }> {
    const invoice = await this.invoicesService.update(id, dto, user.id);
    return { data: invoice };
  }

  @Patch(':id/pay')
  @Roles('admin')
  @ApiOperation({ summary: 'Mark invoice as paid (admin only)' })
  @ApiResponse({ status: 200, description: 'Invoice marked as paid' })
  async markAsPaid(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<{ data: InvoiceResponseDto }> {
    const invoice = await this.invoicesService.update(
      id,
      { status: 'paid' },
      user.id,
    );
    return { data: invoice };
  }

  @Get(':id/payment-qr')
  @Roles('admin', 'resident')
  @ApiOperation({ summary: 'Get VietQR payment code for an invoice' })
  @ApiResponse({ status: 200, description: 'Payment QR data' })
  @ApiResponse({ status: 400, description: 'Invoice already paid or cancelled' })
  async getPaymentQR(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    const invoice = await this.invoicesService.findOne(id, user.id, user.role);

    if (invoice.status === 'paid' || invoice.status === 'cancelled') {
      throw new BadRequestException(
        `Cannot generate QR for ${invoice.status} invoice`,
      );
    }

    const reference =
      (invoice as unknown as Record<string, unknown>).paymentReference ??
      `INV_${invoice.invoice_number}`;
    const qr = this.vietqrService.generateQR(
      invoice.totalAmount,
      String(reference),
    );
    return { data: qr };
  }

  @Post(':id/report-payment')
  @Roles('resident')
  @ApiOperation({ summary: 'Report a payment transfer for an invoice (resident)' })
  @ApiResponse({ status: 200, description: 'Payment reported, awaiting verification' })
  @ApiResponse({ status: 400, description: 'Invoice already paid or cancelled' })
  @ApiResponse({ status: 403, description: 'Only the invoice tenant can report' })
  async reportPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReportInvoicePaymentDto,
    @CurrentUser() user: AuthUser,
  ): Promise<{ data: InvoiceResponseDto; message: string }> {
    const invoice = await this.invoicesService.reportPayment(id, dto, user.id);
    return {
      data: invoice,
      message: 'Payment reported. Admin will verify your transfer shortly.',
    };
  }

  @Get('payments/reported')
  @Roles('admin')
  @ApiOperation({ summary: 'Get invoices with reported payments awaiting verification (admin)' })
  @ApiResponse({ status: 200, description: 'List of invoices with reported payments' })
  async getReportedPayments(): Promise<{ data: InvoiceResponseDto[] }> {
    const invoices = await this.invoicesService.getReportedPayments();
    return { data: invoices };
  }

  @Get('payments/history')
  @Roles('admin')
  @ApiOperation({ summary: 'Get invoice payment verification history (admin)' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Number of days to look back (default: 30)' })
  @ApiResponse({ status: 200, description: 'List of invoices with verified/rejected payments' })
  async getPaymentHistory(@Query('days') days?: string): Promise<{ data: InvoiceResponseDto[] }> {
    const invoices = await this.invoicesService.getPaymentHistory(days ? parseInt(days, 10) : 30);
    return { data: invoices };
  }

  @Patch(':id/verify-payment')
  @Roles('admin')
  @ApiOperation({ summary: 'Verify or reject a reported invoice payment (admin)' })
  @ApiResponse({ status: 200, description: 'Payment verified/rejected' })
  @ApiResponse({ status: 400, description: 'No reported payment to verify' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async verifyPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VerifyInvoicePaymentDto,
    @CurrentUser() user: AuthUser,
  ): Promise<{ data: InvoiceResponseDto; message: string }> {
    const invoice = await this.invoicesService.verifyPayment(id, dto, user.id);
    return {
      data: invoice,
      message: dto.status === 'confirmed'
        ? 'Payment confirmed successfully.'
        : 'Payment rejected.',
    };
  }
}
