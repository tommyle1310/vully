import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
} from '@nestjs/swagger';
import { PaymentsWebhookService, WebhookProcessingResult } from './payments-webhook.service';
import { PayOSAdapter } from './adapters/payos.adapter';
import { CassoAdapter } from './adapters/casso.adapter';
import { SePayAdapter } from './adapters/sepay.adapter';
import {
  PayOSWebhookDto,
  CassoWebhookDto,
  SePayWebhookDto,
} from './dto/webhook-payload.dto';

/**
 * Payment Webhook Controller
 * 
 * Receives payment notifications from VietQR-compatible gateways:
 * - PayOS
 * - Casso
 * - SePay
 * 
 * Each gateway has its own endpoint for different payload formats
 * and signature verification methods.
 */
@ApiTags('Payment Webhooks')
@Controller('api/v1/payments/webhook')
export class PaymentsWebhookController {
  private readonly logger = new Logger(PaymentsWebhookController.name);

  constructor(
    private readonly webhookService: PaymentsWebhookService,
    private readonly payosAdapter: PayOSAdapter,
    private readonly cassoAdapter: CassoAdapter,
    private readonly sepayAdapter: SePayAdapter,
  ) {}

  /**
   * PayOS Webhook Endpoint
   */
  @Post('payos')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive PayOS payment webhook' })
  @ApiHeader({
    name: 'x-payos-signature',
    description: 'PayOS webhook signature',
    required: true,
  })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid signature' })
  async handlePayOS(
    @Body() body: PayOSWebhookDto,
    @Headers('x-payos-signature') signature: string,
  ): Promise<{ success: boolean; results: WebhookProcessingResult[] }> {
    this.logger.log('Received PayOS webhook', {
      orderCode: body.orderCode,
      reference: body.reference,
    });

    // Verify signature
    this.payosAdapter.verifySignature(body, signature);

    // Extract normalized payment info
    const payments = this.payosAdapter.extractPaymentInfo(body);

    // Process payments
    const results = await this.webhookService.processPayments(payments);

    return { success: true, results };
  }

  /**
   * Casso Webhook Endpoint
   */
  @Post('casso')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive Casso payment webhook' })
  @ApiHeader({
    name: 'secure-token',
    description: 'Casso webhook secret token',
    required: true,
  })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid signature' })
  async handleCasso(
    @Body() body: CassoWebhookDto,
    @Headers('secure-token') signature: string,
  ): Promise<{ success: boolean; results: WebhookProcessingResult[] }> {
    this.logger.log('Received Casso webhook', {
      transactionCount: body.data?.length || 0,
    });

    // Verify signature
    this.cassoAdapter.verifySignature(body, signature);

    // Extract normalized payment info (Casso can batch multiple transactions)
    const payments = this.cassoAdapter.extractPaymentInfo(body);

    if (payments.length === 0) {
      return { success: true, results: [] };
    }

    // Process payments
    const results = await this.webhookService.processPayments(payments);

    return { success: true, results };
  }

  /**
   * SePay Webhook Endpoint
   */
  @Post('sepay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive SePay payment webhook' })
  @ApiHeader({
    name: 'x-sepay-signature',
    description: 'SePay webhook signature',
    required: true,
  })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid signature' })
  async handleSePay(
    @Body() body: SePayWebhookDto,
    @Headers('x-sepay-signature') signature: string,
  ): Promise<{ success: boolean; results: WebhookProcessingResult[] }> {
    this.logger.log('Received SePay webhook', {
      id: body.id,
      transferType: body.transferType,
    });

    // Verify signature
    this.sepayAdapter.verifySignature(body, signature);

    // Extract normalized payment info
    const payments = this.sepayAdapter.extractPaymentInfo(body);

    if (payments.length === 0) {
      // Skip outgoing transactions
      return { success: true, results: [] };
    }

    // Process payments
    const results = await this.webhookService.processPayments(payments);

    return { success: true, results };
  }

  /**
   * Generic webhook endpoint for testing
   * Accepts gateway type in header
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generic payment webhook (for testing)' })
  @ApiHeader({
    name: 'x-gateway',
    description: 'Gateway type: payos | casso | sepay',
    required: true,
  })
  async handleGeneric(
    @Body() body: unknown,
    @Headers('x-gateway') gateway: string,
    @Headers('x-signature') signature: string,
  ): Promise<{ success: boolean; results: WebhookProcessingResult[] }> {
    switch (gateway?.toLowerCase()) {
      case 'payos':
        return this.handlePayOS(body as PayOSWebhookDto, signature);
      case 'casso':
        return this.handleCasso(body as CassoWebhookDto, signature);
      case 'sepay':
        return this.handleSePay(body as SePayWebhookDto, signature);
      default:
        throw new BadRequestException(`Unknown gateway: ${gateway}`);
    }
  }
}
