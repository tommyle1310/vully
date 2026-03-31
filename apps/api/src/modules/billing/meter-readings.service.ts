import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateMeterReadingDto,
  UpdateMeterReadingDto,
  MeterReadingFiltersDto,
  MeterReadingResponseDto,
} from './dto/meter-reading.dto';

@Injectable()
export class MeterReadingsService {
  private readonly logger = new Logger(MeterReadingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreateMeterReadingDto,
    actorId: string,
    actorRole: string,
  ): Promise<MeterReadingResponseDto> {
    // Verify apartment exists
    const apartment = await this.prisma.apartment.findUnique({
      where: { id: dto.apartmentId },
      include: { building: true },
    });

    if (!apartment) {
      throw new NotFoundException('Apartment not found');
    }

    // Verify utility type exists
    const utilityType = await this.prisma.utilityType.findUnique({
      where: { id: dto.utilityTypeId },
    });

    if (!utilityType) {
      throw new NotFoundException('Utility type not found');
    }

    // Check if resident has access to this apartment
    if (actorRole === 'resident') {
      const contract = await this.prisma.contract.findFirst({
        where: {
          apartmentId: dto.apartmentId,
          tenantId: actorId,
          status: 'active',
        },
      });

      if (!contract) {
        throw new ForbiddenException('You do not have access to this apartment');
      }
    }

    // Check for duplicate reading
    const existing = await this.prisma.meterReading.findFirst({
      where: {
        apartmentId: dto.apartmentId,
        utilityTypeId: dto.utilityTypeId,
        billingPeriod: dto.billingPeriod,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Meter reading already exists for this apartment, utility type, and billing period. ` +
          `Edit the existing reading (ID: ${existing.id}) or delete it first.`,
      );
    }

    // Get previous reading to auto-fill previousValue
    let previousValue = dto.previousValue;
    if (previousValue === undefined) {
      const lastReading = await this.prisma.meterReading.findFirst({
        where: {
          apartmentId: dto.apartmentId,
          utilityTypeId: dto.utilityTypeId,
          billingPeriod: { lt: dto.billingPeriod },
        },
        orderBy: { billingPeriod: 'desc' },
      });

      previousValue = lastReading ? Number(lastReading.currentValue) : undefined;
    }

    const reading = await this.prisma.meterReading.create({
      data: {
        apartmentId: dto.apartmentId,
        utilityTypeId: dto.utilityTypeId,
        currentValue: dto.currentValue,
        previousValue,
        billingPeriod: dto.billingPeriod,
        readingDate: new Date(dto.readingDate),
        recordedById: actorId,
        imageProofUrl: dto.imageProofUrl,
      },
      include: {
        apartment: {
          include: { building: true },
        },
        utilityType: true,
        recordedBy: true,
      },
    });

    this.logger.log({
      event: 'meter_reading_created',
      actorId,
      readingId: reading.id,
      apartmentId: dto.apartmentId,
      utilityType: utilityType.code,
      billingPeriod: dto.billingPeriod,
      usage: previousValue !== undefined ? dto.currentValue - previousValue : null,
    });

    return this.toResponseDto(reading);
  }

  async findAll(
    filters: MeterReadingFiltersDto,
    page = 1,
    limit = 20,
    userId?: string,
    userRole?: string,
  ): Promise<{ data: MeterReadingResponseDto[]; total: number }> {
    const skip = (page - 1) * limit;

    const where: Prisma.MeterReadingWhereInput = {};

    if (filters.apartmentId) {
      where.apartmentId = filters.apartmentId;
    }

    if (filters.utilityTypeId) {
      where.utilityTypeId = filters.utilityTypeId;
    }

    if (filters.billingPeriod) {
      where.billingPeriod = filters.billingPeriod;
    }

    // Residents can only see readings for their apartments
    if (userRole === 'resident' && userId) {
      const contracts = await this.prisma.contract.findMany({
        where: {
          tenantId: userId,
          status: 'active',
        },
        select: { apartmentId: true },
      });

      where.apartmentId = {
        in: contracts.map((c) => c.apartmentId),
      };
    }

    const [readings, total] = await Promise.all([
      this.prisma.meterReading.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ billingPeriod: 'desc' }, { createdAt: 'desc' }],
        include: {
          apartment: {
            include: { building: true },
          },
          utilityType: true,
          recordedBy: true,
        },
      }),
      this.prisma.meterReading.count({ where }),
    ]);

    return {
      data: readings.map(this.toResponseDto),
      total,
    };
  }

  async findOne(
    id: string,
    userId?: string,
    userRole?: string,
  ): Promise<MeterReadingResponseDto> {
    const reading = await this.prisma.meterReading.findUnique({
      where: { id },
      include: {
        apartment: {
          include: { building: true },
        },
        utilityType: true,
        recordedBy: true,
      },
    });

    if (!reading) {
      throw new NotFoundException('Meter reading not found');
    }

    // Check access for residents
    if (userRole === 'resident' && userId) {
      const contract = await this.prisma.contract.findFirst({
        where: {
          apartmentId: reading.apartmentId,
          tenantId: userId,
          status: 'active',
        },
      });

      if (!contract) {
        throw new ForbiddenException('Access denied');
      }
    }

    return this.toResponseDto(reading);
  }

  async update(
    id: string,
    dto: UpdateMeterReadingDto,
    actorId: string,
  ): Promise<MeterReadingResponseDto> {
    const reading = await this.prisma.meterReading.findUnique({
      where: { id },
      include: {
        lineItems: true, // Check if already used in an invoice
      },
    });

    if (!reading) {
      throw new NotFoundException('Meter reading not found');
    }

    // Check if reading is already used in an invoice
    if (reading.lineItems && reading.lineItems.length > 0) {
      throw new ConflictException(
        'Cannot update meter reading that is already used in an invoice',
      );
    }

    const updateData: Prisma.MeterReadingUpdateInput = {};

    if (dto.currentValue !== undefined) {
      updateData.currentValue = dto.currentValue;
    }

    if (dto.readingDate) {
      updateData.readingDate = new Date(dto.readingDate);
    }

    if (dto.imageProofUrl !== undefined) {
      updateData.imageProofUrl = dto.imageProofUrl;
    }

    const updated = await this.prisma.meterReading.update({
      where: { id },
      data: updateData,
      include: {
        apartment: {
          include: { building: true },
        },
        utilityType: true,
        recordedBy: true,
      },
    });

    this.logger.log({
      event: 'meter_reading_updated',
      actorId,
      readingId: id,
      changes: dto,
    });

    return this.toResponseDto(updated);
  }

  async delete(id: string, actorId: string): Promise<void> {
    const reading = await this.prisma.meterReading.findUnique({
      where: { id },
      include: {
        lineItems: true,
      },
    });

    if (!reading) {
      throw new NotFoundException('Meter reading not found');
    }

    if (reading.lineItems && reading.lineItems.length > 0) {
      throw new ConflictException(
        'Cannot delete meter reading that is already used in an invoice',
      );
    }

    await this.prisma.meterReading.delete({ where: { id } });

    this.logger.log({
      event: 'meter_reading_deleted',
      actorId,
      readingId: id,
    });
  }

  async getLatestReadings(apartmentId: string): Promise<MeterReadingResponseDto[]> {
    const utilityTypes = await this.prisma.utilityType.findMany({
      where: { isActive: true },
    });

    const readings: MeterReadingResponseDto[] = [];

    for (const utilityType of utilityTypes) {
      const latest = await this.prisma.meterReading.findFirst({
        where: {
          apartmentId,
          utilityTypeId: utilityType.id,
        },
        orderBy: { billingPeriod: 'desc' },
        include: {
          apartment: {
            include: { building: true },
          },
          utilityType: true,
          recordedBy: true,
        },
      });

      if (latest) {
        readings.push(this.toResponseDto(latest));
      }
    }

    return readings;
  }

  private toResponseDto(reading: any): MeterReadingResponseDto {
    const currentValue = Number(reading.currentValue);
    const previousValue = reading.previousValue
      ? Number(reading.previousValue)
      : undefined;

    return {
      id: reading.id,
      apartmentId: reading.apartmentId,
      utilityTypeId: reading.utilityTypeId,
      currentValue,
      previousValue,
      usage: previousValue !== undefined ? currentValue - previousValue : currentValue,
      billingPeriod: reading.billingPeriod,
      readingDate: reading.readingDate,
      recordedById: reading.recordedById,
      imageProofUrl: reading.imageProofUrl,
      createdAt: reading.createdAt,
      apartment: reading.apartment
        ? {
            id: reading.apartment.id,
            unitNumber: reading.apartment.unitNumber,
            building: {
              id: reading.apartment.building.id,
              name: reading.apartment.building.name,
            },
          }
        : undefined,
      utilityType: reading.utilityType
        ? {
            id: reading.utilityType.id,
            code: reading.utilityType.code,
            name: reading.utilityType.name,
            unit: reading.utilityType.unit,
          }
        : undefined,
      recordedBy: reading.recordedBy
        ? {
            id: reading.recordedBy.id,
            firstName: reading.recordedBy.firstName,
            lastName: reading.recordedBy.lastName,
          }
        : undefined,
    };
  }
}
