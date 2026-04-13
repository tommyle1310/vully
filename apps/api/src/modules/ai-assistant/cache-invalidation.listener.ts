import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SemanticCacheService } from './semantic-cache.service';
import { QueryIntent } from './ai-assistant.types';

/**
 * Cache invalidation event listeners
 * Listens to domain events and invalidates semantic cache accordingly
 */
@Injectable()
export class CacheInvalidationListener {
  private readonly logger = new Logger(CacheInvalidationListener.name);

  constructor(private readonly semanticCacheService: SemanticCacheService) {}

  /**
   * Invalidate billing cache when invoices are created
   */
  @OnEvent('invoice.created')
  async handleInvoiceCreated(payload: { userId: string; buildingId: string }) {
    this.logger.log(`Invoice created for user ${payload.userId}, invalidating billing cache`);
    
    const count = await this.semanticCacheService.invalidateByContext({
      intent: QueryIntent.BILLING_QUERY,
      userId: payload.userId,
      buildingId: payload.buildingId,
    });

    this.logger.log(`Invalidated ${count} billing queries for user ${payload.userId}`);
  }

  /**
   * Invalidate billing cache when payments are recorded
   */
  @OnEvent('payment.recorded')
  async handlePaymentRecorded(payload: { userId: string; contractId: string }) {
    this.logger.log(`Payment recorded for contract ${payload.contractId}, invalidating billing cache`);
    
    const count = await this.semanticCacheService.invalidateByContext({
      intent: QueryIntent.BILLING_QUERY,
      userId: payload.userId,
    });

    this.logger.log(`Invalidated ${count} billing queries for user ${payload.userId}`);
  }

  /**
   * Invalidate policy cache when building policies are updated
   */
  @OnEvent('building-policy.updated')
  async handleBuildingPolicyUpdated(payload: { buildingId: string }) {
    this.logger.log(`Building policy updated for building ${payload.buildingId}, invalidating policy cache`);
    
    const count = await this.semanticCacheService.invalidateByContext({
      intent: QueryIntent.POLICY_QUERY,
      buildingId: payload.buildingId,
    });

    this.logger.log(`Invalidated ${count} policy queries for building ${payload.buildingId}`);
  }

  /**
   * Invalidate cache when apartment status changes
   */
  @OnEvent('apartment.status-changed')
  async handleApartmentStatusChanged(payload: { apartmentId: string; buildingId: string }) {
    this.logger.log(
      `Apartment status changed for apartment ${payload.apartmentId}, invalidating related cache`,
    );
    
    const count = await this.semanticCacheService.invalidateByContext({
      apartmentId: payload.apartmentId,
      buildingId: payload.buildingId,
    });

    this.logger.log(`Invalidated ${count} queries for apartment ${payload.apartmentId}`);
  }

  /**
   * Invalidate cache when meter readings are submitted
   */
  @OnEvent('meter-reading.submitted')
  async handleMeterReadingSubmitted(payload: { buildingId: string }) {
    this.logger.log(`Meter reading submitted for building ${payload.buildingId}, invalidating billing cache`);
    
    const count = await this.semanticCacheService.invalidateByContext({
      intent: QueryIntent.BILLING_QUERY,
      buildingId: payload.buildingId,
    });

    this.logger.log(`Invalidated ${count} billing queries for building ${payload.buildingId}`);
  }

  /**
   * Invalidate all cache for a specific user (e.g., user data changed)
   */
  @OnEvent('user.updated')
  async handleUserUpdated(payload: { userId: string }) {
    this.logger.log(`User ${payload.userId} updated, invalidating all user cache`);
    
    const count = await this.semanticCacheService.invalidateByContext({
      userId: payload.userId,
    });

    this.logger.log(`Invalidated ${count} queries for user ${payload.userId}`);
  }
}
