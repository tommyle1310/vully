import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { IPaymentWebhookAdapter } from './adapter.interface';
import { PaymentInfoDto, SePayWebhookDto } from '../dto/webhook-payload.dto';

/**
 * SePay Webhook Adapter
 * 
 * Handles SePay payment gateway webhooks
 * @see https://sepay.vn/developers/docs/webhook
 */
@Injectable()
export class SePayAdapter implements IPaymentWebhookAdapter {
  private readonly logger = new Logger(SePayAdapter.name);
  readonly gateway = 'sepay' as const;

  constructor(private readonly configService: ConfigService) {}

  /**
   * Verify SePay webhook signature
   * 
   * SePay uses HMAC-SHA256 with secret key
   */
  verifySignature(payload: SePayWebhookDto, signature: string): boolean {
    const secretKey = this.configService.get<string>('SEPAY_WEBHOOK_SECRET');
    
    if (!secretKey) {
      this.logger.warn('SEPAY_WEBHOOK_SECRET not configured, skipping signature verification');
      return true; // Allow in dev mode
    }

    // Build data string for checksum (SePay specific order)
    const dataString = JSON.stringify(payload);

    const expectedSignature = crypto
      .createHmac('sha256', secretKey)
      .update(dataString)
      .digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature.toLowerCase()),
      Buffer.from(expectedSignature.toLowerCase()),
    );

    if (!isValid) {
      this.logger.warn('SePay signature verification failed');
      throw new UnauthorizedException('Invalid SePay signature');
    }

    return true;
  }

  /**
   * Extract payment info from SePay webhook payload
   */
  extractPaymentInfo(payload: SePayWebhookDto): PaymentInfoDto[] {
    // Only process incoming payments
    if (payload.transferType !== 'in') {
      this.logger.debug('Skipping outgoing SePay transaction', {
        id: payload.id,
        type: payload.transferType,
      });
      return [];
    }

    return [
      {
        transactionId: payload.id,
        amount: payload.transferAmount,
        senderName: payload.senderName,
        description: payload.content,
        transactionTime: payload.transactionDate,
        gateway: this.gateway,
      },
    ];
  }

  /**
   * Fetch recent transactions from SePay API
   * Used for manual reconciliation
   */
  async fetchRecentTransactions(hours: number): Promise<PaymentInfoDto[]> {
    const apiKey = this.configService.get<string>('SEPAY_API_KEY');
    const merchantId = this.configService.get<string>('SEPAY_MERCHANT_ID');

    if (!apiKey || !merchantId) {
      this.logger.warn('SePay API credentials not configured');
      return [];
    }

    try {
      const fromDate = new Date(Date.now() - hours * 60 * 60 * 1000);
      const toDate = new Date();

      // SePay API call to fetch transactions
      const response = await fetch(
        `https://my.sepay.vn/userapi/transactions/list?from_date=${fromDate.toISOString().split('T')[0]}&to_date=${toDate.toISOString().split('T')[0]}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error(`SePay API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Filter for incoming payments only
      const incomingPayments = data.transactions?.filter(
        (tx: { transferType: string }) => tx.transferType === 'in',
      ) || [];

      return incomingPayments.map((tx: SePayWebhookDto) => ({
        transactionId: tx.id,
        amount: tx.transferAmount,
        senderName: tx.senderName,
        description: tx.content,
        transactionTime: tx.transactionDate,
        gateway: this.gateway,
      }));
    } catch (error) {
      this.logger.error('Failed to fetch SePay transactions', error);
      return [];
    }
  }
}
