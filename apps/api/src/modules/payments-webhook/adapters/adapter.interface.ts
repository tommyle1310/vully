import { PaymentInfoDto } from '../dto/webhook-payload.dto';

/**
 * Interface for payment gateway webhook adapters
 * Each gateway (PayOS, Casso, SePay) implements this interface
 */
export interface IPaymentWebhookAdapter {
  /**
   * Gateway identifier
   */
  readonly gateway: 'payos' | 'casso' | 'sepay';

  /**
   * Verify webhook signature/checksum
   * @param payload Raw webhook payload
   * @param signature Signature from headers
   * @returns true if valid, throws on invalid
   */
  verifySignature(payload: unknown, signature: string): boolean;

  /**
   * Extract normalized payment info from gateway-specific payload
   * @param payload Gateway webhook payload
   * @returns Array of normalized payment info (some gateways batch transactions)
   */
  extractPaymentInfo(payload: unknown): PaymentInfoDto[];

  /**
   * Fetch recent transactions from gateway API for reconciliation
   * @param hours Number of hours to look back
   * @returns Array of normalized payment info
   */
  fetchRecentTransactions(hours: number): Promise<PaymentInfoDto[]>;
}
