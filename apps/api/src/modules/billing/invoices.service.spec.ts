import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { PrismaService } from '../../common/prisma/prisma.service';

const mockPrismaService = {
  contracts: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  invoice: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
  },
  meterReading: {
    findMany: jest.fn(),
  },
  utilityTier: {
    findMany: jest.fn(),
  },
};

describe('InvoicesService', () => {
  let service: InvoicesService;
  let prisma: typeof mockPrismaService;

  const mockUser = {
    id: 'user-uuid-1',
    email: 'admin@test.com',
    role: 'admin',
  };

  const mockContract = {
    id: 'contract-uuid-1',
    apartmentId: 'apartment-uuid-1',
    tenantId: 'tenant-uuid-1',
    status: 'active',
    rentAmount: 5000000,
    start_date: new Date('2026-01-01'),
    apartments: {
      id: 'apartment-uuid-1',
      unit_number: 'A101',
      buildingId: 'building-uuid-1',
      buildings: {
        id: 'building-uuid-1',
        name: 'Building A',
      },
    },
    tenant: {
      id: 'tenant-uuid-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@test.com',
    },
  };

  const mockInvoice = {
    id: 'invoice-uuid-1',
    contractId: 'contract-uuid-1',
    invoice_number: 'INV-202603-0001',
    billingPeriod: '2026-03',
    issueDate: new Date('2026-03-01'),
    dueDate: new Date('2026-03-15'),
    status: 'pending',
    subtotal: 5500000,
    taxAmount: 0,
    totalAmount: 5500000,
    paidAmount: 0,
    paid_at: null,
    notes: null,
    created_at: new Date(),
    updatedAt: new Date(),
    lineItems: [
      {
        id: 'line-item-uuid-1',
        description: 'Rent for 2026-03',
        quantity: 1,
        unitPrice: 5000000,
        amount: 5000000,
      },
      {
        id: 'line-item-uuid-2',
        description: 'Electric - 100 kWh',
        quantity: 100,
        unitPrice: 5000,
        amount: 500000,
      },
    ],
    contracts: mockContract,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<InvoicesService>(InvoicesService);
    prisma = module.get<typeof mockPrismaService>(PrismaService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      contractId: 'contract-uuid-1',
      billingPeriod: '2026-03',
      notes: 'Test invoice',
    };

    it('should create an invoice successfully', async () => {
      prisma.contracts.findUnique.mockResolvedValue(mockContract);
      prisma.invoices.findFirst.mockResolvedValue(null);
      prisma.meterReading.findMany.mockResolvedValue([
        {
          id: 'reading-uuid-1',
          currentValue: 200,
          previousValue: 100,
          utilityTypeId: 'utility-uuid-1',
          utilityType: {
            id: 'utility-uuid-1',
            name: 'Electric',
            unit: 'kWh',
          },
        },
      ]);
      prisma.utilityTier.findMany.mockResolvedValue([
        {
          tierNumber: 1,
          minUsage: 0,
          maxUsage: 50,
          unitPrice: 3000,
        },
        {
          tierNumber: 2,
          minUsage: 50,
          maxUsage: 100,
          unitPrice: 3500,
        },
        {
          tierNumber: 3,
          minUsage: 100,
          maxUsage: null,
          unitPrice: 4000,
        },
      ]);
      prisma.invoices.create.mockResolvedValue(mockInvoice);

      const result = await service.create(createDto, mockUser.id);

      expect(result).toBeDefined();
      expect(result.invoice_number).toBe('INV-202603-0001');
      expect(prisma.contracts.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: createDto.contractId },
        }),
      );
      expect(prisma.invoices.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if contract not found', async () => {
      prisma.contracts.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto, mockUser.id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if contract is not active', async () => {
      prisma.contracts.findUnique.mockResolvedValue({
        ...mockContract,
        status: 'terminated',
      });

      await expect(service.create(createDto, mockUser.id)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ConflictException if invoice already exists', async () => {
      prisma.contracts.findUnique.mockResolvedValue(mockContract);
      prisma.invoices.findFirst.mockResolvedValue(mockInvoice);

      await expect(service.create(createDto, mockUser.id)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated invoices', async () => {
      prisma.invoices.findMany.mockResolvedValue([mockInvoice]);
      prisma.invoices.count.mockResolvedValue(1);

      const filters = { status: 'pending' as const };
      const result = await service.findAll(filters, 1, 20);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(prisma.invoices.findMany).toHaveBeenCalled();
      expect(prisma.invoices.count).toHaveBeenCalled();
    });

    it('should filter invoices by billingPeriod', async () => {
      prisma.invoices.findMany.mockResolvedValue([mockInvoice]);
      prisma.invoices.count.mockResolvedValue(1);

      const filters = { billingPeriod: '2026-03' };
      await service.findAll(filters, 1, 20);

      expect(prisma.invoices.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            billingPeriod: '2026-03',
          }),
        }),
      );
    });

    it('should filter invoices by due date range', async () => {
      prisma.invoices.findMany.mockResolvedValue([]);
      prisma.invoices.count.mockResolvedValue(0);

      const filters = {
        dueDateFrom: '2026-03-01',
        dueDateTo: '2026-03-31',
      };
      await service.findAll(filters, 1, 20);

      expect(prisma.invoices.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dueDate: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        }),
      );
    });

    it('should restrict residents to their own invoices', async () => {
      prisma.invoices.findMany.mockResolvedValue([mockInvoice]);
      prisma.invoices.count.mockResolvedValue(1);

      await service.findAll({}, 1, 20, 'resident-uuid', 'resident');

      expect(prisma.invoices.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            contracts: expect.objectContaining({
              tenant: { id: 'resident-uuid' },
            }),
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a single invoice', async () => {
      prisma.invoices.findUnique.mockResolvedValue(mockInvoice);

      const result = await service.findOne('invoice-uuid-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('invoice-uuid-1');
    });

    it('should throw NotFoundException if invoice not found', async () => {
      prisma.invoices.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException for resident accessing others invoice', async () => {
      prisma.invoices.findUnique.mockResolvedValue(mockInvoice);

      await expect(
        service.findOne('invoice-uuid-1', 'other-user-id', 'resident'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow resident to access their own invoice', async () => {
      prisma.invoices.findUnique.mockResolvedValue(mockInvoice);

      const result = await service.findOne(
        'invoice-uuid-1',
        'tenant-uuid-1',
        'resident',
      );

      expect(result).toBeDefined();
    });
  });

  describe('update', () => {
    it('should update invoice status to paid', async () => {
      const pendingInvoice = { ...mockInvoice, status: 'pending' };
      const paidInvoice = { ...mockInvoice, status: 'paid', paid_at: new Date() };

      prisma.invoices.findUnique.mockResolvedValue(pendingInvoice);
      prisma.invoices.update.mockResolvedValue(paidInvoice);

      const result = await service.update(
        'invoice-uuid-1',
        { status: 'paid' },
        mockUser.id,
      );

      expect(result.status).toBe('paid');
      expect(prisma.invoices.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'paid',
            paid_at: expect.any(Date),
          }),
        }),
      );
    });

    it('should throw NotFoundException if invoice not found', async () => {
      prisma.invoices.findUnique.mockResolvedValue(null);

      await expect(
        service.update('non-existent', { status: 'paid' }, mockUser.id),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update notes field', async () => {
      prisma.invoices.findUnique.mockResolvedValue(mockInvoice);
      prisma.invoices.update.mockResolvedValue({
        ...mockInvoice,
        notes: 'Updated notes',
      });

      const result = await service.update(
        'invoice-uuid-1',
        { notes: 'Updated notes' },
        mockUser.id,
      );

      expect(prisma.invoices.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            notes: 'Updated notes',
          }),
        }),
      );
    });
  });

  describe('getOverdueInvoices', () => {
    it('should return and update overdue invoices', async () => {
      const overdueInvoice = {
        ...mockInvoice,
        status: 'pending',
        dueDate: new Date('2026-01-01'),
      };

      prisma.invoices.findMany.mockResolvedValue([overdueInvoice]);
      prisma.invoices.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.getOverdueInvoices();

      expect(result).toHaveLength(1);
      expect(prisma.invoices.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: [overdueInvoice.id] } },
          data: { status: 'overdue' },
        }),
      );
    });

    it('should return empty array if no overdue invoices', async () => {
      prisma.invoices.findMany.mockResolvedValue([]);

      const result = await service.getOverdueInvoices();

      expect(result).toHaveLength(0);
      expect(prisma.invoices.updateMany).not.toHaveBeenCalled();
    });
  });
});
