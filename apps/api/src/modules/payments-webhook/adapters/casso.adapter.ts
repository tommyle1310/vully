import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { IPaymentWebhookAdapter } from './adapter.interface';
import { PaymentInfoDto, CassoWebhookDto } from '../dto/webhook-payload.dto';

/**
 * Casso Webhook Adapter
 * 
 * Handles Casso payment gateway webhooks
 * @see https://casso.vn/api-documents/webhook-api
 */
@Injectable()
export class CassoAdapter implements IPaymentWebhookAdapter {
  private readonly logger = new Logger(CassoAdapter.name);
  readonly gateway = 'casso' as const;

  constructor(private readonly configService: ConfigService) {}

  /**
   * Verify Casso webhook signature
   * 
   * Casso uses API key in header for verification
   */
  verifySignature(payload: CassoWebhookDto, signature: string): boolean {
    const secretKey = this.configService.get<string>('CASSO_WEBHOOK_SECRET');
    
    if (!secretKey) {
      this.logger.warn('CASSO_WEBHOOK_SECRET not configured, skipping signature verification');
      return true; // Allow in dev mode
    }

    // Casso uses a simple secret key comparison in header
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(secretKey),
    );

    if (!isValid) {
      this.logger.warn('Casso signature verification failed');
      throw new UnauthorizedException('Invalid Casso signature');
    }

    return true;
  }

  /**
   * Extract payment info from Casso webhook payload
   * Casso sends multiple transactions in a single webhook
   */
  extractPaymentInfo(payload: CassoWebhookDto): PaymentInfoDto[] {
    if (payload.error !== 0) {
      this.logger.warn('Casso webhook contains error', { error: payload.error });
      return [];
    }

    return payload.data
      .filter((tx) => tx.amount > 0) // Only incoming payments
      .map((tx) => ({
        transactionId: tx.id.toString(),
        amount: tx.amount,
        senderName: tx.corresponsiveName,
        description: tx.description,
        transactionTime: tx.when,
        gateway: this.gateway,
      }));
  }

  /**
   * Fetch recent transactions from Casso API
   * Used for manual reconciliation
   */
  async fetchRecentTransactions(hours: number): Promise<PaymentInfoDto[]> {
    const apiKey = this.configService.get<string>('CASSO_API_KEY');

    if (!apiKey) {
      this.logger.warn('CASSO_API_KEY not configured');
      return [];
    }

    try {
      const fromDate = new Date(Date.now() - hours * 60 * 60 * 1000);
      const toDate = new Date();

      // Casso API call to fetch transactions
      const response = await fetch(
        `https://oauth.casso.vn/v2/transactions?fromDate=${fromDate.toISOString()}&toDate=${toDate.toISOString()}&sort=DESC`,
        {
          headers: {
            Authorization: `Apikey ${apiKey}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Casso API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Filter for incoming payments only
      const incomingPayments = data.data?.records?.filter(
        (tx: { amount: number }) => tx.amount > 0,
      ) || [];

      return incomingPayments.map((tx: {
        id: number;
        amount: number;
        description: string;
        when: string;
        corresponsiveName?: string;
      }) => ({
        transactionId: tx.id.toString(),
        amount: tx.amount,
        senderName: tx.corresponsiveName,
        description: tx.description,
        transactionTime: tx.when,
        gateway: this.gateway,
      }));
    } catch (error) {
      this.logger.error('Failed to fetch Casso transactions', error);
      return [];
    }
  }
}
