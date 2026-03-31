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
      whereClause.apartment = { buildingId };
    }

    const totalContracts = await this.prisma.contract.count({
      where: whereClause,
    });

    // Create billing job record
    const billingJob = await this.prisma.billingJob.create({
      data: {
        jobType: 'generate-monthly-invoices',
        billingPeriod,
        status: 'pending',
        totalContracts,
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
    const billingJob = await this.prisma.billingJob.findUnique({
      where: { id: billingJobId },
    });

    if (!billingJob) {
      return null;
    }

    return {
      id: billingJob.id,
      jobType: billingJob.jobType,
      billingPeriod: billingJob.billingPeriod,
      status: billingJob.status,
      totalContracts: billingJob.totalContracts,
      processedCount: billingJob.processedCount,
      failedCount: billingJob.failedCount,
      progress:
        billingJob.totalContracts > 0
          ? Math.round((billingJob.processedCount / billingJob.totalContracts) * 100)
          : 0,
      startedAt: billingJob.startedAt,
      completedAt: billingJob.completedAt,
      errorLog: billingJob.errorLog,
      createdAt: billingJob.createdAt,
    };
  }

  async listBillingJobs(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [jobs, total] = await Promise.all([
      this.prisma.billingJob.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.billingJob.count(),
    ]);

    return {
      data: jobs.map((job) => ({
        id: job.id,
        jobType: job.jobType,
        billingPeriod: job.billingPeriod,
        status: job.status,
        totalContracts: job.totalContracts,
        processedCount: job.processedCount,
        failedCount: job.failedCount,
        progress:
          job.totalContracts > 0
            ? Math.round((job.processedCount / job.totalContracts) * 100)
            : 0,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        createdAt: job.createdAt,
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
