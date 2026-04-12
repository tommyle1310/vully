import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import { BillingProcessor, GenerateMonthlyInvoicesPayload } from './billing.processor';
import { PrismaService } from '../../common/prisma/prisma.service';
import { InvoicesService } from './invoices.service';
import { VacantBillingService } from './vacant-billing.service';

const mockPrismaService = {
  billing_jobs: {
    update: jest.fn(),
  },
  contracts: {
    findMany: jest.fn(),
  },
  invoices: {
    findFirst: jest.fn(),
  },
};

const mockInvoicesService = {
  create: jest.fn(),
  supplementInvoice: jest.fn(),
};

const mockVacantBillingService = {
  findBillableVacantApartments: jest.fn(),
  generateVacantInvoice: jest.fn(),
};

describe('BillingProcessor', () => {
  let processor: BillingProcessor;
  let prisma: typeof mockPrismaService;
  let invoicesService: typeof mockInvoicesService;
  let vacantBillingService: typeof mockVacantBillingService;

  const mockContract = {
    id: 'contract-uuid-1',
    status: 'active',
    contract_type: 'rental',
    apartments: {
      id: 'apartment-uuid-1',
      unit_number: 'A101',
      buildings: { id: 'building-uuid-1', name: 'Building A' },
    },
  };

  const mockPurchaseContract = {
    id: 'contract-uuid-2',
    status: 'active',
    contract_type: 'purchase',
    apartments: {
      id: 'apartment-uuid-2',
      unit_number: 'B201',
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
        {
          provide: VacantBillingService,
          useValue: mockVacantBillingService,
        },
      ],
    }).compile();

    processor = module.get<BillingProcessor>(BillingProcessor);
    prisma = module.get<typeof mockPrismaService>(PrismaService);
    invoicesService = module.get<typeof mockInvoicesService>(InvoicesService);
    vacantBillingService = module.get<typeof mockVacantBillingService>(VacantBillingService);

    jest.clearAllMocks();

    // Default: no vacant apartments (overridden in specific tests)
    vacantBillingService.findBillableVacantApartments.mockResolvedValue([]);
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

      prisma.billing_jobs.update.mockResolvedValue({});
      prisma.contracts.findMany.mockResolvedValue([mockContract]);
      prisma.invoices.findFirst.mockResolvedValue(null);
      invoicesService.create.mockResolvedValue({ id: 'invoice-uuid' });

      const result = await processor.process(mockJob as Job<GenerateMonthlyInvoicesPayload>);

      expect(result).toEqual({ success: 1, supplemented: 0, failed: 0, vacantCount: 0 });
      expect(invoicesService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          contractId: 'contract-uuid-1',
          billingPeriod: '2026-03',
        }),
        'admin-uuid',
        true,
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

      prisma.billing_jobs.update.mockResolvedValue({});
      prisma.contracts.findMany.mockResolvedValue([mockContract]);
      prisma.invoices.findFirst.mockResolvedValue({ id: 'existing-invoice' });

      const result = await processor.process(mockJob as Job<GenerateMonthlyInvoicesPayload>);

      expect(result.success).toBe(0);
      expect(result.failed).toBe(0);
      expect(invoicesService.create).not.toHaveBeenCalled();
    });

    it('should handle invoice generation failures gracefully', async () => {
      const jobData: GenerateMonthlyInvoicesPayload = {
        billingPeriod: '2026-03',
        triggeredById: 'admin-uuid',
        billingJobId: 'billing-job-uuid',
      };

      const mockJob = createMockJob(jobData);

      prisma.billing_jobs.update.mockResolvedValue({});
      prisma.contracts.findMany.mockResolvedValue([mockContract, { ...mockContract, id: 'contract-2' }]);
      prisma.invoices.findFirst.mockResolvedValue(null);
      invoicesService.create
        .mockResolvedValueOnce({ id: 'invoice-1' })
        .mockRejectedValueOnce(new Error('Generation failed'));

      const result = await processor.process(mockJob as Job<GenerateMonthlyInvoicesPayload>);

      expect(result.success).toBe(1);
      expect(result.failed).toBe(1);
    });

    it('should filter by building when buildingId provided', async () => {
      const jobData: GenerateMonthlyInvoicesPayload = {
        billingPeriod: '2026-03',
        buildingId: 'building-uuid-1',
        triggeredById: 'admin-uuid',
        billingJobId: 'billing-job-uuid',
      };

      const mockJob = createMockJob(jobData);

      prisma.billing_jobs.update.mockResolvedValue({});
      prisma.contracts.findMany.mockResolvedValue([]);

      await processor.process(mockJob as Job<GenerateMonthlyInvoicesPayload>);

      expect(prisma.contracts.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            apartments: { building_id: 'building-uuid-1' },
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

      prisma.billing_jobs.update.mockResolvedValue({});
      prisma.contracts.findMany.mockResolvedValue([]);

      await processor.process(mockJob as Job<GenerateMonthlyInvoicesPayload>);

      expect(prisma.billing_jobs.update).toHaveBeenCalledWith(
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

      prisma.billing_jobs.update.mockResolvedValue({});
      prisma.contracts.findMany.mockResolvedValue([mockContract]);
      prisma.invoices.findFirst.mockResolvedValue(null);
      invoicesService.create.mockResolvedValue({ id: 'invoice-uuid' });

      await processor.process(mockJob as Job<GenerateMonthlyInvoicesPayload>);

      // Check last update call has 'completed' status
      const lastCall = prisma.billing_jobs.update.mock.calls[prisma.billing_jobs.update.mock.calls.length - 1];
      expect(lastCall[0].data.status).toBe('completed');
    });

    it('should mark billing job as failed if errors occurred', async () => {
      const jobData: GenerateMonthlyInvoicesPayload = {
        billingPeriod: '2026-03',
        triggeredById: 'admin-uuid',
        billingJobId: 'billing-job-uuid',
      };

      const mockJob = createMockJob(jobData);

      prisma.billing_jobs.update.mockResolvedValue({});
      prisma.contracts.findMany.mockResolvedValue([mockContract]);
      prisma.invoices.findFirst.mockResolvedValue(null);
      invoicesService.create.mockRejectedValue(new Error('Generation failed'));

      await processor.process(mockJob as Job<GenerateMonthlyInvoicesPayload>);

      const lastCall = prisma.billing_jobs.update.mock.calls[prisma.billing_jobs.update.mock.calls.length - 1];
      expect(lastCall[0].data.status).toBe('failed');
      expect(lastCall[0].data.error_log).toBeDefined();
    });

    it('should include purchase contracts in processing', async () => {
      const jobData: GenerateMonthlyInvoicesPayload = {
        billingPeriod: '2026-03',
        triggeredById: 'admin-uuid',
        billingJobId: 'billing-job-uuid',
      };

      const mockJob = createMockJob(jobData);

      prisma.billing_jobs.update.mockResolvedValue({});
      prisma.contracts.findMany.mockResolvedValue([mockContract, mockPurchaseContract]);
      prisma.invoices.findFirst.mockResolvedValue(null);
      invoicesService.create.mockResolvedValue({ id: 'invoice-uuid' });

      const result = await processor.process(mockJob as Job<GenerateMonthlyInvoicesPayload>);

      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
      expect(invoicesService.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('process - vacant apartments (Pass 2)', () => {
    const createMockJob = (
      data: GenerateMonthlyInvoicesPayload,
    ): Partial<Job<GenerateMonthlyInvoicesPayload>> => ({
      id: 'job-uuid-1',
      data,
      updateProgress: jest.fn(),
    });

    const jobData: GenerateMonthlyInvoicesPayload = {
      billingPeriod: '2026-03',
      triggeredById: 'admin-uuid',
      billingJobId: 'billing-job-uuid',
    };

    it('should generate invoices for vacant apartments', async () => {
      const mockJob = createMockJob(jobData);
      prisma.billing_jobs.update.mockResolvedValue({});
      prisma.contracts.findMany.mockResolvedValue([]);

      vacantBillingService.findBillableVacantApartments.mockResolvedValue([
        { id: 'apt-v1', unit_number: 'C301', building_id: 'b1', owner_id: 'owner-1' },
      ]);
      vacantBillingService.generateVacantInvoice.mockResolvedValue({ id: 'inv-v1' });

      const result = await processor.process(mockJob as Job<GenerateMonthlyInvoicesPayload>);

      expect(result.vacantCount).toBe(1);
      expect(vacantBillingService.generateVacantInvoice).toHaveBeenCalledWith(
        'apt-v1', 'b1', 'C301', '2026-03',
      );
    });

    it('should handle both contract and vacant invoices in one run', async () => {
      const mockJob = createMockJob(jobData);
      prisma.billing_jobs.update.mockResolvedValue({});
      prisma.contracts.findMany.mockResolvedValue([mockContract]);
      prisma.invoices.findFirst.mockResolvedValue(null);
      invoicesService.create.mockResolvedValue({ id: 'inv-1' });

      vacantBillingService.findBillableVacantApartments.mockResolvedValue([
        { id: 'apt-v1', unit_number: 'C301', building_id: 'b1', owner_id: 'owner-1' },
        { id: 'apt-v2', unit_number: 'C302', building_id: 'b1', owner_id: 'owner-2' },
      ]);
      vacantBillingService.generateVacantInvoice.mockResolvedValue({ id: 'inv-v' });

      const result = await processor.process(mockJob as Job<GenerateMonthlyInvoicesPayload>);

      expect(result.success).toBe(1);
      expect(result.vacantCount).toBe(2);
    });

    it('should skip null results from vacant invoice generation', async () => {
      const mockJob = createMockJob(jobData);
      prisma.billing_jobs.update.mockResolvedValue({});
      prisma.contracts.findMany.mockResolvedValue([]);

      vacantBillingService.findBillableVacantApartments.mockResolvedValue([
        { id: 'apt-v1', unit_number: 'C301', building_id: 'b1', owner_id: 'owner-1' },
      ]);
      vacantBillingService.generateVacantInvoice.mockResolvedValue(null);

      const result = await processor.process(mockJob as Job<GenerateMonthlyInvoicesPayload>);

      expect(result.vacantCount).toBe(0);
    });

    it('should handle vacant invoice failure without crashing', async () => {
      const mockJob = createMockJob(jobData);
      prisma.billing_jobs.update.mockResolvedValue({});
      prisma.contracts.findMany.mockResolvedValue([]);

      vacantBillingService.findBillableVacantApartments.mockResolvedValue([
        { id: 'apt-v1', unit_number: 'C301', building_id: 'b1', owner_id: 'owner-1' },
        { id: 'apt-v2', unit_number: 'C302', building_id: 'b1', owner_id: 'owner-2' },
      ]);
      vacantBillingService.generateVacantInvoice
        .mockRejectedValueOnce(new Error('DB error'))
        .mockResolvedValueOnce({ id: 'inv-v2' });

      const result = await processor.process(mockJob as Job<GenerateMonthlyInvoicesPayload>);

      expect(result.vacantCount).toBe(1);
    });

    it('should include vacantCount in job summary', async () => {
      const mockJob = createMockJob(jobData);
      prisma.billing_jobs.update.mockResolvedValue({});
      prisma.contracts.findMany.mockResolvedValue([]);

      vacantBillingService.findBillableVacantApartments.mockResolvedValue([
        { id: 'apt-v1', unit_number: 'C301', building_id: 'b1', owner_id: 'owner-1' },
      ]);
      vacantBillingService.generateVacantInvoice.mockResolvedValue({ id: 'inv-v1' });

      await processor.process(mockJob as Job<GenerateMonthlyInvoicesPayload>);

      const lastCall = prisma.billing_jobs.update.mock.calls[
        prisma.billing_jobs.update.mock.calls.length - 1
      ];
      expect(lastCall[0].data.error_log.vacantCount).toBe(1);
    });
  });
});
