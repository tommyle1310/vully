import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { IPaymentWebhookAdapter } from './adapter.interface';
import { PaymentInfoDto, PayOSWebhookDto } from '../dto/webhook-payload.dto';

/**
 * PayOS Webhook Adapter
 * 
 * Handles PayOS payment gateway webhooks
 * @see https://payos.vn/docs/webhook
 */
@Injectable()
export class PayOSAdapter implements IPaymentWebhookAdapter {
  private readonly logger = new Logger(PayOSAdapter.name);
  readonly gateway = 'payos' as const;

  constructor(private readonly configService: ConfigService) {}

  /**
   * Verify PayOS webhook signature
   * 
   * PayOS uses HMAC-SHA256 with checksum key
   * Signature = HMAC(checksumKey, data string)
   */
  verifySignature(payload: PayOSWebhookDto, signature: string): boolean {
    const checksumKey = this.configService.get<string>('PAYOS_CHECKSUM_KEY');
    
    if (!checksumKey) {
      this.logger.warn('PAYOS_CHECKSUM_KEY not configured, skipping signature verification');
      return true; // Allow in dev mode
    }

    // Build data string for checksum (PayOS specific order)
    const dataString = [
      payload.orderCode,
      payload.amount,
      payload.description,
      payload.accountNumber,
      payload.reference,
      payload.transactionDateTime,
    ].join('|');

    const expectedSignature = crypto
      .createHmac('sha256', checksumKey)
      .update(dataString)
      .digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature.toLowerCase()),
      Buffer.from(expectedSignature.toLowerCase()),
    );

    if (!isValid) {
      this.logger.warn('PayOS signature verification failed', {
        expected: expectedSignature.substring(0, 10) + '...',
        received: signature.substring(0, 10) + '...',
      });
      throw new UnauthorizedException('Invalid PayOS signature');
    }

    return true;
  }

  /**
   * Extract payment info from PayOS webhook payload
   */
  extractPaymentInfo(payload: PayOSWebhookDto): PaymentInfoDto[] {
    return [
      {
        transactionId: payload.reference,
        amount: payload.amount,
        senderName: payload.counterAccountName,
        description: payload.description,
        transactionTime: payload.transactionDateTime,
        gateway: this.gateway,
      },
    ];
  }

  /**
   * Fetch recent transactions from PayOS API
   * Used for manual reconciliation
   */
  async fetchRecentTransactions(hours: number): Promise<PaymentInfoDto[]> {
    const apiKey = this.configService.get<string>('PAYOS_API_KEY');
    const clientId = this.configService.get<string>('PAYOS_CLIENT_ID');

    if (!apiKey || !clientId) {
      this.logger.warn('PayOS API credentials not configured');
      return [];
    }

    try {
      const fromDate = new Date(Date.now() - hours * 60 * 60 * 1000);
      const toDate = new Date();

      // PayOS API call to fetch transactions
      const response = await fetch(
        `https://api-merchant.payos.vn/v2/payment-requests?fromDate=${fromDate.toISOString()}&toDate=${toDate.toISOString()}`,
        {
          headers: {
            'x-client-id': clientId,
            'x-api-key': apiKey,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`PayOS API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Filter for successful payments only
      const successfulPayments = data.data?.filter(
        (tx: { status: string }) => tx.status === 'PAID',
      ) || [];

      return successfulPayments.map((tx: PayOSWebhookDto) => ({
        transactionId: tx.reference,
        amount: tx.amount,
        senderName: tx.counterAccountName,
        description: tx.description,
        transactionTime: tx.transactionDateTime,
        gateway: this.gateway,
      }));
    } catch (error) {
      this.logger.error('Failed to fetch PayOS transactions', error);
      return [];
    }
  }
}
