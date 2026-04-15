import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PaymentsWebhookService, WebhookProcessingResult } from './payments-webhook.service';
import { PayOSAdapter } from './adapters/payos.adapter';
import { CassoAdapter } from './adapters/casso.adapter';
import { SePayAdapter } from './adapters/sepay.adapter';
import { IPaymentWebhookAdapter } from './adapters/adapter.interface';

export interface ReconciliationResult {
  gateway: string;
  fromDate: Date;
  toDate: Date;
  totalFetched: number;
  results: {
    matched: number;
    unmatched: number;
    alreadyProcessed: number;
    skipped: number;
  };
  details: WebhookProcessingResult[];
}

/**
 * Reconciliation Service
 * 
 * Fetches recent transactions from gateway APIs and processes
 * any that were missed (e.g., due to server downtime).
 * 
 * Can be triggered:
 * - Manually via API endpoint (for accountants)
 * - Scheduled daily at 6 AM
 */
@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);
  private readonly adapters: Map<string, IPaymentWebhookAdapter>;

  constructor(
    private readonly webhookService: PaymentsWebhookService,
    private readonly payosAdapter: PayOSAdapter,
    private readonly cassoAdapter: CassoAdapter,
    private readonly sepayAdapter: SePayAdapter,
  ) {
    this.adapters = new Map<string, IPaymentWebhookAdapter>([
      ['payos', payosAdapter],
      ['casso', cassoAdapter],
      ['sepay', sepayAdapter],
    ]);
  }

  /**
   * Reconcile transactions from a specific gateway
   * Fetches recent transactions and processes any not yet recorded
   */
  async reconcile(
    gateway: 'payos' | 'casso' | 'sepay',
    hours: number = 24,
  ): Promise<ReconciliationResult> {
    const adapter = this.adapters.get(gateway);
    if (!adapter) {
      throw new BadRequestException(`Unknown gateway: ${gateway}`);
    }

    const fromDate = new Date(Date.now() - hours * 60 * 60 * 1000);
    const toDate = new Date();

    this.logger.log('Starting reconciliation', {
      gateway,
      hours,
      fromDate: fromDate.toISOString(),
      toDate: toDate.toISOString(),
    });

    // Fetch transactions from gateway API
    const transactions = await adapter.fetchRecentTransactions(hours);

    this.logger.log(`Fetched ${transactions.length} transactions from ${gateway}`);

    if (transactions.length === 0) {
      return {
        gateway,
        fromDate,
        toDate,
        totalFetched: 0,
        results: {
          matched: 0,
          unmatched: 0,
          alreadyProcessed: 0,
          skipped: 0,
        },
        details: [],
      };
    }

    // Process all transactions
    const results = await this.webhookService.processPayments(transactions);

    // Aggregate results
    const aggregated = {
      matched: 0,
      unmatched: 0,
      alreadyProcessed: 0,
      skipped: 0,
    };

    for (const result of results) {
      switch (result.status) {
        case 'matched':
          aggregated.matched++;
          break;
        case 'unmatched':
          aggregated.unmatched++;
          break;
        case 'already_processed':
          aggregated.alreadyProcessed++;
          break;
        case 'skipped':
          aggregated.skipped++;
          break;
      }
    }

    this.logger.log('Reconciliation completed', {
      gateway,
      totalFetched: transactions.length,
      ...aggregated,
    });

    return {
      gateway,
      fromDate,
      toDate,
      totalFetched: transactions.length,
      results: aggregated,
      details: results,
    };
  }

  /**
   * Reconcile all configured gateways
   */
  async reconcileAll(hours: number = 24): Promise<ReconciliationResult[]> {
    const gateways: ('payos' | 'casso' | 'sepay')[] = ['payos', 'casso', 'sepay'];
    const results: ReconciliationResult[] = [];

    for (const gateway of gateways) {
      try {
        const result = await this.reconcile(gateway, hours);
        results.push(result);
      } catch (error) {
        this.logger.error(`Failed to reconcile ${gateway}`, {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        // Continue with other gateways
      }
    }

    return results;
  }

  /**
   * Scheduled daily reconciliation at 6 AM
   * Runs for all gateways, fetches last 24 hours
   */
  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async scheduledReconciliation(): Promise<void> {
    this.logger.log('Starting scheduled daily reconciliation');

    try {
      const results = await this.reconcileAll(24);

      const summary = results.map((r) => ({
        gateway: r.gateway,
        fetched: r.totalFetched,
        matched: r.results.matched,
        unmatched: r.results.unmatched,
      }));

      this.logger.log('Scheduled reconciliation completed', { summary });
    } catch (error) {
      this.logger.error('Scheduled reconciliation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
