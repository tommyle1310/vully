import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import { BillingProcessor, GenerateMonthlyInvoicesPayload } from './billing.processor';
import { PrismaService } from '../../common/prisma/prisma.service';
import { InvoicesService } from './invoices.service';

const mockPrismaService = {
  billingJob: {
    update: jest.fn(),
  },
  contracts: {
    findMany: jest.fn(),
  },
  invoice: {
    findFirst: jest.fn(),
  },
};

const mockInvoicesService = {
  create: jest.fn(),
};

describe('BillingProcessor', () => {
  let processor: BillingProcessor;
  let prisma: typeof mockPrismaService;
  let invoicesService: typeof mockInvoicesService;

  const mockContract = {
    id: 'contract-uuid-1',
    status: 'active',
    apartments: {
      id: 'apartment-uuid-1',
      unit_number: 'A101',
      buildings: { id: 'building-uuid-1', name: 'Building A' },
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingProcessor,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: InvoicesService,
          useValue: mockInvoicesService,
        },
      ],
    }).compile();

    processor = module.get<BillingProcessor>(BillingProcessor);
    prisma = module.get<typeof mockPrismaService>(PrismaService);
    invoicesService = module.get<typeof mockInvoicesService>(InvoicesService);

    jest.clearAllMocks();
  });

  describe('process', () => {
    const createMockJob = (
      data: GenerateMonthlyInvoicesPayload,
    ): Partial<Job<GenerateMonthlyInvoicesPayload>> => ({
      id: 'job-uuid-1',
      data,
      updateProgress: jest.fn(),
    });

    it('should process all contracts and generate invoices', async () => {
      const jobData: GenerateMonthlyInvoicesPayload = {
        billingPeriod: '2026-03',
        triggeredById: 'admin-uuid',
        billingJobId: 'billing-job-uuid',
      };

      const mockJob = createMockJob(jobData);

      prisma.billingJob.update.mockResolvedValue({});
      prisma.contracts.findMany.mockResolvedValue([mockContract]);
      prisma.invoices.findFirst.mockResolvedValue(null);
      invoicesService.create.mockResolvedValue({ id: 'invoice-uuid' });

      const result = await processor.process(mockJob as Job<GenerateMonthlyInvoicesPayload>);

      expect(result).toEqual({ success: 1, failed: 0 });
      expect(invoicesService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          contractId: 'contract-uuid-1',
          billingPeriod: '2026-03',
        }),
        'admin-uuid',
      );
      expect(mockJob.updateProgress).toHaveBeenCalled();
    });

    it('should skip contracts with existing invoices', async () => {
      const jobData: GenerateMonthlyInvoicesPayload = {
        billingPeriod: '2026-03',
        triggeredById: 'admin-uuid',
        billingJobId: 'billing-job-uuid',
      };

      const mockJob = createMockJob(jobData);

      prisma.billingJob.update.mockResolvedValue({});
      prisma.contracts.findMany.mockResolvedValue([mockContract]);
      prisma.invoices.findFirst.mockResolvedValue({ id: 'existing-invoice' });

      const result = await processor.process(mockJob as Job<GenerateMonthlyInvoicesPayload>);

      expect(result).toEqual({ success: 0, failed: 0 });
      expect(invoicesService.create).not.toHaveBeenCalled();
    });

    it('should handle invoice generation failures gracefully', async () => {
      const jobData: GenerateMonthlyInvoicesPayload = {
        billingPeriod: '2026-03',
        triggeredById: 'admin-uuid',
        billingJobId: 'billing-job-uuid',
      };

      const mockJob = createMockJob(jobData);

      prisma.billingJob.update.mockResolvedValue({});
      prisma.contracts.findMany.mockResolvedValue([mockContract, { ...mockContract, id: 'contract-2' }]);
      prisma.invoices.findFirst.mockResolvedValue(null);
      invoicesService.create
        .mockResolvedValueOnce({ id: 'invoice-1' })
        .mockRejectedValueOnce(new Error('Generation failed'));

      const result = await processor.process(mockJob as Job<GenerateMonthlyInvoicesPayload>);

      expect(result).toEqual({ success: 1, failed: 1 });
    });

    it('should filter by building when buildingId provided', async () => {
      const jobData: GenerateMonthlyInvoicesPayload = {
        billingPeriod: '2026-03',
        buildingId: 'building-uuid-1',
        triggeredById: 'admin-uuid',
        billingJobId: 'billing-job-uuid',
      };

      const mockJob = createMockJob(jobData);

      prisma.billingJob.update.mockResolvedValue({});
      prisma.contracts.findMany.mockResolvedValue([]);

      await processor.process(mockJob as Job<GenerateMonthlyInvoicesPayload>);

      expect(prisma.contracts.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            apartments: { buildingId: 'building-uuid-1' },
          }),
        }),
      );
    });

    it('should update billing job status on start', async () => {
      const jobData: GenerateMonthlyInvoicesPayload = {
        billingPeriod: '2026-03',
        triggeredById: 'admin-uuid',
        billingJobId: 'billing-job-uuid',
      };

      const mockJob = createMockJob(jobData);

      prisma.billingJob.update.mockResolvedValue({});
      prisma.contracts.findMany.mockResolvedValue([]);

      await processor.process(mockJob as Job<GenerateMonthlyInvoicesPayload>);

      expect(prisma.billingJob.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'billing-job-uuid' },
          data: expect.objectContaining({
            status: 'processing',
          }),
        }),
      );
    });

    it('should mark billing job as completed on success', async () => {
      const jobData: GenerateMonthlyInvoicesPayload = {
        billingPeriod: '2026-03',
        triggeredById: 'admin-uuid',
        billingJobId: 'billing-job-uuid',
      };

      const mockJob = createMockJob(jobData);

      prisma.billingJob.update.mockResolvedValue({});
      prisma.contracts.findMany.mockResolvedValue([mockContract]);
      prisma.invoices.findFirst.mockResolvedValue(null);
      invoicesService.create.mockResolvedValue({ id: 'invoice-uuid' });

      await processor.process(mockJob as Job<GenerateMonthlyInvoicesPayload>);

      // Check last update call has 'completed' status
      const lastCall = prisma.billingJob.update.mock.calls[prisma.billingJob.update.mock.calls.length - 1];
      expect(lastCall[0].data.status).toBe('completed');
    });

    it('should mark billing job as failed if errors occurred', async () => {
      const jobData: GenerateMonthlyInvoicesPayload = {
        billingPeriod: '2026-03',
        triggeredById: 'admin-uuid',
        billingJobId: 'billing-job-uuid',
      };

      const mockJob = createMockJob(jobData);

      prisma.billingJob.update.mockResolvedValue({});
      prisma.contracts.findMany.mockResolvedValue([mockContract]);
      prisma.invoices.findFirst.mockResolvedValue(null);
      invoicesService.create.mockRejectedValue(new Error('Generation failed'));

      await processor.process(mockJob as Job<GenerateMonthlyInvoicesPayload>);

      const lastCall = prisma.billingJob.update.mock.calls[prisma.billingJob.update.mock.calls.length - 1];
      expect(lastCall[0].data.status).toBe('failed');
      expect(lastCall[0].data.errorLog).toBeDefined();
    });
  });
});
