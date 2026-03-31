import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { MeterReadingsService } from './meter-readings.service';
import { PrismaService } from '../../common/prisma/prisma.service';

const mockPrismaService = {
  apartment: {
    findUnique: jest.fn(),
  },
  utilityType: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  contract: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  meterReading: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
};

describe('MeterReadingsService', () => {
  let service: MeterReadingsService;
  let prisma: typeof mockPrismaService;

  const mockApartment = {
    id: 'apartment-uuid-1',
    unitNumber: 'A101',
    buildingId: 'building-uuid-1',
    building: {
      id: 'building-uuid-1',
      name: 'Building A',
    },
  };

  const mockUtilityType = {
    id: 'utility-uuid-1',
    code: 'ELECTRIC',
    name: 'Electric',
    unit: 'kWh',
    isActive: true,
  };

  const mockMeterReading = {
    id: 'reading-uuid-1',
    apartmentId: 'apartment-uuid-1',
    utilityTypeId: 'utility-uuid-1',
    currentValue: 200,
    previousValue: 100,
    billingPeriod: '2026-03',
    readingDate: new Date('2026-03-28'),
    recordedById: 'user-uuid-1',
    imageProofUrl: null,
    createdAt: new Date(),
    apartment: mockApartment,
    utilityType: mockUtilityType,
    recordedBy: {
      id: 'user-uuid-1',
      firstName: 'Admin',
      lastName: 'User',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeterReadingsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<MeterReadingsService>(MeterReadingsService);
    prisma = module.get<typeof mockPrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      apartmentId: 'apartment-uuid-1',
      utilityTypeId: 'utility-uuid-1',
      currentValue: 200,
      billingPeriod: '2026-03',
      readingDate: '2026-03-28',
    };

    it('should create a meter reading successfully for admin', async () => {
      prisma.apartment.findUnique.mockResolvedValue(mockApartment);
      prisma.utilityType.findUnique.mockResolvedValue(mockUtilityType);
      prisma.meterReading.findFirst
        .mockResolvedValueOnce(null) // No existing reading
        .mockResolvedValueOnce({ currentValue: 100 }); // Previous reading
      prisma.meterReading.create.mockResolvedValue(mockMeterReading);

      const result = await service.create(createDto, 'admin-uuid', 'admin');

      expect(result).toBeDefined();
      expect(result.currentValue).toBe(200);
      expect(result.usage).toBe(100);
      expect(prisma.meterReading.create).toHaveBeenCalled();
    });

    it('should auto-fill previousValue from last reading', async () => {
      prisma.apartment.findUnique.mockResolvedValue(mockApartment);
      prisma.utilityType.findUnique.mockResolvedValue(mockUtilityType);
      prisma.meterReading.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ currentValue: 150 });
      prisma.meterReading.create.mockResolvedValue({
        ...mockMeterReading,
        previousValue: 150,
      });

      const result = await service.create(createDto, 'admin-uuid', 'admin');

      expect(prisma.meterReading.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            previousValue: 150,
          }),
        }),
      );
    });

    it('should throw NotFoundException if apartment not found', async () => {
      prisma.apartment.findUnique.mockResolvedValue(null);

      await expect(
        service.create(createDto, 'admin-uuid', 'admin'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if utility type not found', async () => {
      prisma.apartment.findUnique.mockResolvedValue(mockApartment);
      prisma.utilityType.findUnique.mockResolvedValue(null);

      await expect(
        service.create(createDto, 'admin-uuid', 'admin'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if resident has no contract for apartment', async () => {
      prisma.apartment.findUnique.mockResolvedValue(mockApartment);
      prisma.utilityType.findUnique.mockResolvedValue(mockUtilityType);
      prisma.contract.findFirst.mockResolvedValue(null);

      await expect(
        service.create(createDto, 'resident-uuid', 'resident'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow resident with active contract', async () => {
      prisma.apartment.findUnique.mockResolvedValue(mockApartment);
      prisma.utilityType.findUnique.mockResolvedValue(mockUtilityType);
      prisma.contract.findFirst.mockResolvedValue({
        id: 'contract-uuid',
        status: 'active',
      });
      prisma.meterReading.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      prisma.meterReading.create.mockResolvedValue(mockMeterReading);

      const result = await service.create(createDto, 'resident-uuid', 'resident');

      expect(result).toBeDefined();
    });

    it('should throw ConflictException if reading already exists for period', async () => {
      prisma.apartment.findUnique.mockResolvedValue(mockApartment);
      prisma.utilityType.findUnique.mockResolvedValue(mockUtilityType);
      prisma.meterReading.findFirst.mockResolvedValue(mockMeterReading);

      await expect(
        service.create(createDto, 'admin-uuid', 'admin'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return paginated meter readings', async () => {
      prisma.meterReading.findMany.mockResolvedValue([mockMeterReading]);
      prisma.meterReading.count.mockResolvedValue(1);

      const result = await service.findAll({}, 1, 20);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by apartmentId', async () => {
      prisma.meterReading.findMany.mockResolvedValue([mockMeterReading]);
      prisma.meterReading.count.mockResolvedValue(1);

      await service.findAll({ apartmentId: 'apartment-uuid-1' }, 1, 20);

      expect(prisma.meterReading.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            apartmentId: 'apartment-uuid-1',
          }),
        }),
      );
    });

    it('should filter by billingPeriod', async () => {
      prisma.meterReading.findMany.mockResolvedValue([mockMeterReading]);
      prisma.meterReading.count.mockResolvedValue(1);

      await service.findAll({ billingPeriod: '2026-03' }, 1, 20);

      expect(prisma.meterReading.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            billingPeriod: '2026-03',
          }),
        }),
      );
    });

    it('should restrict residents to their apartments', async () => {
      const mockContracts = [{ apartmentId: 'apartment-uuid-1' }];
      prisma.contract.findMany.mockResolvedValue(mockContracts);
      prisma.meterReading.findMany.mockResolvedValue([mockMeterReading]);
      prisma.meterReading.count.mockResolvedValue(1);

      await service.findAll({}, 1, 20, 'resident-uuid', 'resident');

      expect(prisma.contract.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: 'resident-uuid',
            status: 'active',
          },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a single meter reading', async () => {
      prisma.meterReading.findUnique.mockResolvedValue(mockMeterReading);

      const result = await service.findOne('reading-uuid-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('reading-uuid-1');
    });

    it('should throw NotFoundException if not found', async () => {
      prisma.meterReading.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException for resident without contract', async () => {
      prisma.meterReading.findUnique.mockResolvedValue(mockMeterReading);
      prisma.contract.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne('reading-uuid-1', 'other-resident', 'resident'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('should update meter reading successfully', async () => {
      const readingWithoutInvoice = { ...mockMeterReading, lineItems: [] };
      prisma.meterReading.findUnique.mockResolvedValue(readingWithoutInvoice);
      prisma.meterReading.update.mockResolvedValue({
        ...mockMeterReading,
        currentValue: 250,
      });

      const result = await service.update(
        'reading-uuid-1',
        { currentValue: 250 },
        'admin-uuid',
      );

      expect(prisma.meterReading.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if not found', async () => {
      prisma.meterReading.findUnique.mockResolvedValue(null);

      await expect(
        service.update('non-existent', { currentValue: 250 }, 'admin-uuid'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if reading used in invoice', async () => {
      const readingWithInvoice = {
        ...mockMeterReading,
        lineItems: [{ id: 'line-item-uuid' }],
      };
      prisma.meterReading.findUnique.mockResolvedValue(readingWithInvoice);

      await expect(
        service.update('reading-uuid-1', { currentValue: 250 }, 'admin-uuid'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('delete', () => {
    it('should delete meter reading successfully', async () => {
      const readingWithoutInvoice = { ...mockMeterReading, lineItems: [] };
      prisma.meterReading.findUnique.mockResolvedValue(readingWithoutInvoice);
      prisma.meterReading.delete.mockResolvedValue(readingWithoutInvoice);

      await service.delete('reading-uuid-1', 'admin-uuid');

      expect(prisma.meterReading.delete).toHaveBeenCalledWith({
        where: { id: 'reading-uuid-1' },
      });
    });

    it('should throw NotFoundException if not found', async () => {
      prisma.meterReading.findUnique.mockResolvedValue(null);

      await expect(service.delete('non-existent', 'admin-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if reading used in invoice', async () => {
      const readingWithInvoice = {
        ...mockMeterReading,
        lineItems: [{ id: 'line-item-uuid' }],
      };
      prisma.meterReading.findUnique.mockResolvedValue(readingWithInvoice);

      await expect(
        service.delete('reading-uuid-1', 'admin-uuid'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getLatestReadings', () => {
    it('should return latest readings for each utility type', async () => {
      prisma.utilityType.findMany.mockResolvedValue([
        mockUtilityType,
        { ...mockUtilityType, id: 'utility-uuid-2', code: 'WATER', name: 'Water' },
      ]);
      prisma.meterReading.findFirst
        .mockResolvedValueOnce(mockMeterReading)
        .mockResolvedValueOnce({
          ...mockMeterReading,
          id: 'reading-uuid-2',
          utilityTypeId: 'utility-uuid-2',
        });

      const result = await service.getLatestReadings('apartment-uuid-1');

      expect(result).toHaveLength(2);
      expect(prisma.meterReading.findFirst).toHaveBeenCalledTimes(2);
    });

    it('should return empty array if no readings exist', async () => {
      prisma.utilityType.findMany.mockResolvedValue([mockUtilityType]);
      prisma.meterReading.findFirst.mockResolvedValue(null);

      const result = await service.getLatestReadings('apartment-uuid-1');

      expect(result).toHaveLength(0);
    });
  });
});
