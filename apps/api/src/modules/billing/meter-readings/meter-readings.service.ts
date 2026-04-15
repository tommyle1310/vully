import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { DEFAULT_PAGINATION_LIMIT } from '../../../common/constants/defaults';
import {
  CreateMeterReadingDto,
  UpdateMeterReadingDto,
  MeterReadingFiltersDto,
  MeterReadingResponseDto,
} from '../dto/meter-reading.dto';
import {
  toMeterReadingResponseDto,
  getMeterIdFieldByUtilityCode,
  generateMeterId,
} from './meter-readings.mapper';

const READING_INCLUDE = {
  apartments: { include: { buildings: true } },
  utility_types: true,
  users: true,
} as const;

@Injectable()
export class MeterReadingsService {
  private readonly logger = new Logger(MeterReadingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreateMeterReadingDto,
    actorId: string,
    actorRole: string,
  ): Promise<MeterReadingResponseDto> {
    const apartment = await this.prisma.apartments.findUnique({
      where: { id: dto.apartmentId },
      include: { buildings: true },
    });

    if (!apartment) {
      throw new NotFoundException('Apartment not found');
    }

    const utilityType = await this.prisma.utility_types.findUnique({
      where: { id: dto.utilityTypeId },
    });

    if (!utilityType) {
      throw new NotFoundException('Utility type not found');
    }

    if (actorRole === 'resident') {
      const contract = await this.prisma.contracts.findFirst({
        where: {
          apartment_id: dto.apartmentId,
          tenant_id: actorId,
          status: 'active',
        },
      });

      if (!contract) {
        throw new ForbiddenException('You do not have access to this apartment');
      }
    }

    const existing = await this.prisma.meter_readings.findFirst({
      where: {
        apartment_id: dto.apartmentId,
        utility_type_id: dto.utilityTypeId,
        billing_period: dto.billingPeriod,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Meter reading already exists for this apartment, utility type, and billing period. ` +
          `Edit the existing reading (ID: ${existing.id}) or delete it first.`,
      );
    }

    let previousValue = dto.previousValue;
    if (previousValue === undefined) {
      const lastReading = await this.prisma.meter_readings.findFirst({
        where: {
          apartment_id: dto.apartmentId,
          utility_type_id: dto.utilityTypeId,
          billing_period: { lt: dto.billingPeriod },
        },
        orderBy: { billing_period: 'desc' },
      });

      previousValue = lastReading ? Number(lastReading.current_value) : undefined;
    }

    const meterIdField = getMeterIdFieldByUtilityCode(utilityType.code);
    const currentMeterId = meterIdField ? (apartment as Record<string, unknown>)[meterIdField] : null;
    if (meterIdField && !currentMeterId) {
      const generatedMeterId = generateMeterId(
        utilityType.code,
        apartment.buildings?.name || 'BLD',
        apartment.unit_number,
      );

      await this.prisma.apartments.update({
        where: { id: dto.apartmentId },
        data: { [meterIdField]: generatedMeterId },
      });

      this.logger.log({
        event: 'meter_id_auto_generated',
        apartmentId: dto.apartmentId,
        utilityCode: utilityType.code,
        meterId: generatedMeterId,
      });
    }

    const reading = await this.prisma.meter_readings.create({
      data: {
        apartment_id: dto.apartmentId,
        utility_type_id: dto.utilityTypeId,
        current_value: dto.currentValue,
        previous_value: previousValue,
        billing_period: dto.billingPeriod,
        reading_date: new Date(dto.readingDate),
        recorded_by: actorId,
        image_proof_url: dto.imageProofUrl,
      },
      include: READING_INCLUDE,
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

    return toMeterReadingResponseDto(reading);
  }

  async findAll(
    filters: MeterReadingFiltersDto,
    page = 1,
    limit = DEFAULT_PAGINATION_LIMIT,
    userId?: string,
    userRole?: string,
  ): Promise<{ data: MeterReadingResponseDto[]; total: number }> {
    const skip = (page - 1) * limit;

    const where: Prisma.meter_readingsWhereInput = {};

    if (filters.apartmentId) where.apartment_id = filters.apartmentId;
    if (filters.utilityTypeId) where.utility_type_id = filters.utilityTypeId;
    if (filters.billingPeriod) where.billing_period = filters.billingPeriod;

    if (userRole === 'resident' && userId) {
      const contracts = await this.prisma.contracts.findMany({
        where: { tenant_id: userId, status: 'active' },
        select: { apartment_id: true },
      });

      where.apartment_id = { in: contracts.map((c) => c.apartment_id) };
    }

    const [readings, total] = await Promise.all([
      this.prisma.meter_readings.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ billing_period: 'desc' }, { created_at: 'desc' }],
        include: READING_INCLUDE,
      }),
      this.prisma.meter_readings.count({ where }),
    ]);

    return {
      data: readings.map((r) => toMeterReadingResponseDto(r)),
      total,
    };
  }

  async findOne(
    id: string,
    userId?: string,
    userRole?: string,
  ): Promise<MeterReadingResponseDto> {
    const reading = await this.prisma.meter_readings.findUnique({
      where: { id },
      include: READING_INCLUDE,
    });

    if (!reading) {
      throw new NotFoundException('Meter reading not found');
    }

    if (userRole === 'resident' && userId) {
      const contract = await this.prisma.contracts.findFirst({
        where: {
          apartment_id: reading.apartment_id,
          tenant_id: userId,
          status: 'active',
        },
      });

      if (!contract) {
        throw new ForbiddenException('Access denied');
      }
    }

    return toMeterReadingResponseDto(reading);
  }

  async update(
    id: string,
    dto: UpdateMeterReadingDto,
    actorId: string,
  ): Promise<MeterReadingResponseDto> {
    const reading = await this.prisma.meter_readings.findUnique({
      where: { id },
      include: { invoice_line_items: true },
    });

    if (!reading) {
      throw new NotFoundException('Meter reading not found');
    }

    if (reading.invoice_line_items && reading.invoice_line_items.length > 0) {
      throw new ConflictException(
        'Cannot update meter reading that is already used in an invoice',
      );
    }

    const updateData: Prisma.meter_readingsUpdateInput = {};
    if (dto.currentValue !== undefined) updateData.current_value = dto.currentValue;
    if (dto.readingDate) updateData.reading_date = new Date(dto.readingDate);
    if (dto.imageProofUrl !== undefined) updateData.image_proof_url = dto.imageProofUrl;

    const updated = await this.prisma.meter_readings.update({
      where: { id },
      data: updateData,
      include: READING_INCLUDE,
    });

    this.logger.log({
      event: 'meter_reading_updated',
      actorId,
      readingId: id,
      changes: dto,
    });

    return toMeterReadingResponseDto(updated);
  }

  async delete(id: string, actorId: string): Promise<void> {
    const reading = await this.prisma.meter_readings.findUnique({
      where: { id },
      include: { invoice_line_items: true },
    });

    if (!reading) {
      throw new NotFoundException('Meter reading not found');
    }

    if (reading.invoice_line_items && reading.invoice_line_items.length > 0) {
      throw new ConflictException(
        'Cannot delete meter reading that is already used in an invoice',
      );
    }

    await this.prisma.meter_readings.delete({ where: { id } });

    this.logger.log({
      event: 'meter_reading_deleted',
      actorId,
      readingId: id,
    });
  }

  async getLatestReadings(apartmentId: string): Promise<MeterReadingResponseDto[]> {
    const allReadings = await this.prisma.meter_readings.findMany({
      where: {
        apartment_id: apartmentId,
        utility_types: { is_active: true },
      },
      orderBy: { billing_period: 'desc' },
      include: READING_INCLUDE,
    });

    const latestByType = new Map<string, (typeof allReadings)[0]>();
    for (const reading of allReadings) {
      if (!latestByType.has(reading.utility_type_id)) {
        latestByType.set(reading.utility_type_id, reading);
      }
    }

    return Array.from(latestByType.values()).map(r => toMeterReadingResponseDto(r));
  }
}
