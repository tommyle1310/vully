import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { GenerateMonthlyInvoicesPayload } from './billing.processor';

export interface BulkGenerateResult {
  jobId: string;
  billingJobId: string;
  message: string;
  totalContracts: number;
}

@Injectable()
export class BillingQueueService {
  private readonly logger = new Logger(BillingQueueService.name);

  constructor(
    @InjectQueue('billing') private readonly billingQueue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  async enqueueMonthlyInvoiceGeneration(
    billingPeriod: string,
    triggeredById: string,
    buildingId?: string,
  ): Promise<BulkGenerateResult> {
    // Count contracts to process
    const whereClause: Record<string, unknown> = {
      status: 'active',
    };

    if (buildingId) {
      whereClause.apartments = { building_id: buildingId };
    }

    const totalContracts = await this.prisma.contracts.count({
      where: whereClause,
    });

    // Create billing job record
    const billingJob = await this.prisma.billing_jobs.create({
      data: {
        job_type: 'generate-monthly-invoices',
        billing_period: billingPeriod,
        status: 'pending',
        total_contracts: totalContracts,
      },
    });

    // Enqueue the job
    const job = await this.billingQueue.add(
      'generate-monthly-invoices',
      {
        billingPeriod,
        buildingId,
        triggeredById,
        billingJobId: billingJob.id,
      } satisfies GenerateMonthlyInvoicesPayload,
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000, // Start with 5 second delay
        },
        removeOnComplete: {
          age: 86400, // Keep completed jobs for 24 hours
          count: 100, // Keep last 100 completed jobs
        },
        removeOnFail: {
          age: 604800, // Keep failed jobs for 7 days
        },
      },
    );

    this.logger.log({
      event: 'bulk_invoice_generation_queued',
      jobId: job.id,
      billingJobId: billingJob.id,
      billingPeriod,
      buildingId,
      totalContracts,
      triggeredById,
    });

    return {
      jobId: job.id || '',
      billingJobId: billingJob.id,
      message: `Invoice generation queued for ${totalContracts} contracts`,
      totalContracts,
    };
  }

  async getBillingJobStatus(billingJobId: string) {
    const billingJob = await this.prisma.billing_jobs.findUnique({
      where: { id: billingJobId },
    });

    if (!billingJob) {
      return null;
    }

    return {
      id: billingJob.id,
      jobType: billingJob.job_type,
      billingPeriod: billingJob.billing_period,
      status: billingJob.status,
      totalContracts: billingJob.total_contracts,
      processedCount: billingJob.processed_count,
      failedCount: billingJob.failed_count,
      progress:
        billingJob.total_contracts > 0
          ? Math.round((billingJob.processed_count / billingJob.total_contracts) * 100)
          : 0,
      startedAt: billingJob.started_at,
      completedAt: billingJob.completed_at,
      errorLog: billingJob.error_log,
      created_at: billingJob.created_at,
    };
  }

  async listBillingJobs(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [jobs, total] = await Promise.all([
      this.prisma.billing_jobs.findMany({
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.billing_jobs.count(),
    ]);

    return {
      data: jobs.map((job: any) => ({
        id: job.id,
        jobType: job.job_type,
        billingPeriod: job.billing_period,
        status: job.status,
        totalContracts: job.total_contracts,
        processedCount: job.processed_count,
        failedCount: job.failed_count,
        progress:
          job.total_contracts > 0
            ? Math.round((job.processed_count / job.total_contracts) * 100)
            : 0,
        startedAt: job.started_at,
        completedAt: job.completed_at,
        created_at: job.created_at,
      })),
      total,
    };
  }

  async getQueueStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.billingQueue.getWaitingCount(),
      this.billingQueue.getActiveCount(),
      this.billingQueue.getCompletedCount(),
      this.billingQueue.getFailedCount(),
      this.billingQueue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
    };
  }
}
