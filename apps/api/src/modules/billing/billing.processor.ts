import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../common/prisma/prisma.service';
import { InvoicesService } from './invoices.service';

export interface GenerateMonthlyInvoicesPayload {
  billingPeriod: string;
  buildingId?: string;
  triggeredById: string;
  billingJobId: string;
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
  ) {
    super();
  }

  async process(job: Job<GenerateMonthlyInvoicesPayload>): Promise<{ success: number; failed: number }> {
    const { billingPeriod, buildingId, triggeredById, billingJobId } = job.data;

    this.logger.log({
      event: 'billing_job_started',
      jobId: job.id,
      billingJobId,
      billingPeriod,
      buildingId,
    });

    // Update billing job status to processing
    await this.prisma.billingJob.update({
      where: { id: billingJobId },
      data: {
        status: 'processing',
        startedAt: new Date(),
      },
    });

    try {
      // Get all active contracts
      const whereClause: Record<string, unknown> = {
        status: 'active',
      };

      if (buildingId) {
        whereClause.apartment = { buildingId };
      }

      const contracts = await this.prisma.contract.findMany({
        where: whereClause,
        include: {
          apartment: {
            include: { building: true },
          },
        },
      });

      // Update total contracts in billing job
      await this.prisma.billingJob.update({
        where: { id: billingJobId },
        data: { totalContracts: contracts.length },
      });

      await job.updateProgress(5);

      let successCount = 0;
      let failedCount = 0;
      const errors: Array<{ contractId: string; error: string }> = [];

      // Process each contract
      for (let i = 0; i < contracts.length; i++) {
        const contract = contracts[i];

        try {
          // Check if invoice already exists
          const existing = await this.prisma.invoice.findFirst({
            where: {
              contractId: contract.id,
              billingPeriod,
            },
          });

          if (existing) {
            this.logger.debug({
              event: 'invoice_skipped',
              contractId: contract.id,
              reason: 'already_exists',
            });
            continue;
          }

          // Create invoice
          await this.invoicesService.create(
            {
              contractId: contract.id,
              billingPeriod,
              notes: `Auto-generated for ${billingPeriod}`,
            },
            triggeredById,
          );

          successCount++;
          
          this.logger.debug({
            event: 'invoice_generated',
            contractId: contract.id,
            billingPeriod,
          });
        } catch (error) {
          failedCount++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push({ contractId: contract.id, error: errorMessage });

          this.logger.error({
            event: 'invoice_generation_failed',
            contractId: contract.id,
            error: errorMessage,
          });
        }

        // Update progress
        const progress = Math.round(((i + 1) / contracts.length) * 95) + 5;
        await job.updateProgress(progress);

        // Update processed count
        await this.prisma.billingJob.update({
          where: { id: billingJobId },
          data: {
            processedCount: i + 1,
            failedCount,
          },
        });
      }

      // Update billing job as completed
      await this.prisma.billingJob.update({
        where: { id: billingJobId },
        data: {
          status: failedCount === 0 ? 'completed' : 'failed',
          completedAt: new Date(),
          processedCount: contracts.length,
          failedCount,
          errorLog: errors.length > 0 ? errors : undefined,
        },
      });

      await job.updateProgress(100);

      this.logger.log({
        event: 'billing_job_completed',
        jobId: job.id,
        billingJobId,
        successCount,
        failedCount,
        totalContracts: contracts.length,
      });

      return { success: successCount, failed: failedCount };
    } catch (error) {
      // Update billing job as failed
      await this.prisma.billingJob.update({
        where: { id: billingJobId },
        data: {
          status: 'failed',
          completedAt: new Date(),
          errorLog: {
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
