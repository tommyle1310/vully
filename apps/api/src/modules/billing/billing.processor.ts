import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../common/prisma/prisma.service';
import { InvoicesService } from './invoices/invoices.service';
import { VacantBillingService } from './vacant-billing/vacant-billing.service';

export interface GenerateMonthlyInvoicesPayload {
  billingPeriod: string;
  buildingId?: string;
  triggeredById: string;
  billingJobId: string;
  categories?: string[];
}

@Injectable()
@Processor('billing', {
  concurrency: 5,
  limiter: {
    max: 10,
    duration: 1000, // 10 jobs per second max
  },
})
export class BillingProcessor extends WorkerHost {
  private readonly logger = new Logger(BillingProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly invoicesService: InvoicesService,
    private readonly vacantBillingService: VacantBillingService,
  ) {
    super();
  }

  async process(job: Job<GenerateMonthlyInvoicesPayload>): Promise<{ success: number; supplemented: number; failed: number; vacantCount: number }> {
    const { billingPeriod, buildingId, triggeredById, billingJobId, categories } = job.data;

    this.logger.log({
      event: 'billing_job_started',
      jobId: job.id,
      billingJobId,
      billingPeriod,
      buildingId,
      categories,
    });

    // Update billing job status to processing
    await this.prisma.billing_jobs.update({
      where: { id: billingJobId },
      data: {
        status: 'processing',
        started_at: new Date(),
      },
    });

    try {
      // Get all active contracts (all types incl. purchase for utilities/mgmt fees/milestones)
      const whereClause: Record<string, unknown> = {
        status: 'active',
      };

      if (buildingId) {
        whereClause.apartments = { building_id: buildingId };
      }

      const contracts = await this.prisma.contracts.findMany({
        where: whereClause,
        include: {
          apartments: {
            include: { buildings: true },
          },
        },
      });

      // Update total contracts in billing job
      await this.prisma.billing_jobs.update({
        where: { id: billingJobId },
        data: { total_contracts: contracts.length },
      });

      await job.updateProgress(5);

      let successCount = 0;
      let failedCount = 0;
      let skippedCount = 0;
      let supplementedCount = 0;
      const createdByType: Record<string, number> = {};
      const errors: Array<{ contractId: string; error: string }> = [];

      // Process each contract
      for (let i = 0; i < contracts.length; i++) {
        const contract = contracts[i];

        try {
          // Check if invoice already exists
          const existing = await this.prisma.invoices.findFirst({
            where: {
              contract_id: contract.id,
              billing_period: billingPeriod,
            },
          });

          if (existing) {
            // Invoice exists — try to supplement it with any missing line items
            // (e.g. meter readings entered after initial invoice generation)
            try {
              const supplemented = await this.invoicesService.supplementInvoice(
                existing.id,
                contract.id,
                billingPeriod,
                categories,
                triggeredById,
              );

              if (supplemented) {
                supplementedCount++;
                this.logger.debug({
                  event: 'invoice_supplemented',
                  contractId: contract.id,
                  invoiceId: existing.id,
                });
              } else {
                skippedCount++;
                this.logger.debug({
                  event: 'invoice_skipped',
                  contractId: contract.id,
                  reason: 'already_complete',
                });
              }
            } catch (suppError) {
              // Supplement failed — not critical, just skip
              skippedCount++;
              this.logger.debug({
                event: 'invoice_supplement_skipped',
                contractId: contract.id,
                reason: suppError instanceof Error ? suppError.message : 'unknown',
              });
            }
            continue;
          }

          // Create invoice (operational only — skip milestone/installment)
          await this.invoicesService.create(
            {
              contractId: contract.id,
              billingPeriod,
              notes: `Auto-generated for ${billingPeriod}`,
              categories,
            },
            triggeredById,
            true, // operationalOnly: bulk generation skips property payments
          );

          successCount++;
          const cType = contract.contract_type || 'rental';
          createdByType[cType] = (createdByType[cType] || 0) + 1;
          
          this.logger.debug({
            event: 'invoice_generated',
            contractId: contract.id,
            contractType: cType,
            billingPeriod,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';

          // "No billable items" is expected for contracts with nothing due this period
          // (e.g. purchase contracts with milestones in other months, no utility readings).
          // Treat as skip, not failure.
          if (error instanceof BadRequestException && errorMessage.includes('No billable items')) {
            skippedCount++;
            this.logger.debug({
              event: 'invoice_skipped',
              contractId: contract.id,
              reason: 'no_billable_items',
              detail: errorMessage,
            });
          } else {
            failedCount++;
            errors.push({ contractId: contract.id, error: errorMessage });

            this.logger.error({
              event: 'invoice_generation_failed',
              contractId: contract.id,
              error: errorMessage,
            });
          }
        }

        // Update progress
        const progress = Math.round(((i + 1) / contracts.length) * 95) + 5;
        await job.updateProgress(progress);

        // Update processed count
        await this.prisma.billing_jobs.update({
          where: { id: billingJobId },
          data: {
            processed_count: i + 1,
            failed_count: failedCount,
          },
        });
      }

      // === Pass 2: Vacant apartment billing ===
      let vacantCount = 0;
      try {
        const vacantApartments = await this.vacantBillingService.findBillableVacantApartments(
          billingPeriod,
          buildingId,
        );

        for (const apt of vacantApartments) {
          try {
            const result = await this.vacantBillingService.generateVacantInvoice(
              apt.id,
              apt.building_id,
              apt.unit_number,
              billingPeriod,
            );

            if (result) {
              vacantCount++;
              this.logger.debug({
                event: 'vacant_invoice_generated',
                apartmentId: apt.id,
                unitNumber: apt.unit_number,
                billingPeriod,
              });

              // TODO: Enqueue owner notification (email + in-app) when notification module is implemented
              // Template: "Management fee invoice #{invoice_number} for unit {unit_number} — ₫{total_amount} due by {due_date}"
              // this.notificationService.notify(apt.owner_id, { type: 'vacant_invoice', invoiceId: result.id });
              this.logger.log({
                event: 'owner_notification_pending',
                ownerId: apt.owner_id,
                apartmentId: apt.id,
                unitNumber: apt.unit_number,
                message: 'Owner notification for vacant invoice — awaiting notification module implementation',
              });
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            errors.push({ contractId: `vacant:${apt.id}`, error: errorMessage });
            this.logger.error({
              event: 'vacant_invoice_failed',
              apartmentId: apt.id,
              unitNumber: apt.unit_number,
              error: errorMessage,
            });
          }
        }
      } catch (error) {
        this.logger.error({
          event: 'vacant_billing_pass_failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // Build summary for error_log (includes created/skipped/supplemented counts)
      const jobSummary = {
        createdCount: successCount,
        skippedCount,
        supplementedCount,
        vacantCount,
        createdByType,
        errors: errors.length > 0 ? errors : undefined,
      };

      // Update billing job as completed
      await this.prisma.billing_jobs.update({
        where: { id: billingJobId },
        data: {
          status: failedCount === 0 ? 'completed' : 'failed',
          completed_at: new Date(),
          processed_count: contracts.length + vacantCount,
          failed_count: failedCount,
          error_log: jobSummary,
        },
      });

      await job.updateProgress(100);

      this.logger.log({
        event: 'billing_job_completed',
        jobId: job.id,
        billingJobId,
        successCount,
        supplementedCount,
        skippedCount,
        failedCount,
        vacantCount,
        totalContracts: contracts.length,
      });

      return { success: successCount, supplemented: supplementedCount, failed: failedCount, vacantCount };
    } catch (error) {
      // Update billing job as failed
      await this.prisma.billing_jobs.update({
        where: { id: billingJobId },
        data: {
          status: 'failed',
          completed_at: new Date(),
          error_log: {
            globalError: error instanceof Error ? error.message : 'Unknown error',
          },
        },
      });

      throw error;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<GenerateMonthlyInvoicesPayload>) {
    this.logger.log({
      event: 'worker_job_completed',
      jobId: job.id,
      result: job.returnvalue,
    });
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<GenerateMonthlyInvoicesPayload>, error: Error) {
    this.logger.error({
      event: 'worker_job_failed',
      jobId: job.id,
      error: error.message,
      attempts: job.attemptsMade,
    });
  }

  @OnWorkerEvent('progress')
  onProgress(job: Job<GenerateMonthlyInvoicesPayload>, progress: number) {
    this.logger.debug({
      event: 'worker_job_progress',
      jobId: job.id,
      progress,
    });
  }
}
