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
    const apartment = await this.prisma.apartments.findUnique({
      where: { id: dto.apartmentId },
      include: { buildings: true },
    });

    if (!apartment) {
      throw new NotFoundException('Apartment not found');
    }

    // Verify utility type exists
    const utilityType = await this.prisma.utility_types.findUnique({
      where: { id: dto.utilityTypeId },
    });

    if (!utilityType) {
      throw new NotFoundException('Utility type not found');
    }

    // Check if resident has access to this apartment
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

    // Check for duplicate reading
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

    // Get previous reading to auto-fill previousValue
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

    // Auto-generate meter ID if this is the first reading for this utility type
    const meterIdField = this.getMeterIdFieldByUtilityCode(utilityType.code);
    const currentMeterId = meterIdField ? (apartment as Record<string, unknown>)[meterIdField] : null;
    if (meterIdField && !currentMeterId) {
      const generatedMeterId = this.generateMeterId(
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
      include: {
        apartments: {
          include: { buildings: true },
        },
        utility_types: true,
        users: true,
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

    const where: Prisma.meter_readingsWhereInput = {};

    if (filters.apartmentId) {
      where.apartment_id = filters.apartmentId;
    }

    if (filters.utilityTypeId) {
      where.utility_type_id = filters.utilityTypeId;
    }

    if (filters.billingPeriod) {
      where.billing_period = filters.billingPeriod;
    }

    // Residents can only see readings for their apartments
    if (userRole === 'resident' && userId) {
      const contracts = await this.prisma.contracts.findMany({
        where: {
          tenant_id: userId,
          status: 'active',
        },
        select: { apartment_id: true },
      });

      where.apartment_id = {
        in: contracts.map((c: any) => c.apartment_id),
      };
    }

    const [readings, total] = await Promise.all([
      this.prisma.meter_readings.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ billing_period: 'desc' }, { created_at: 'desc' }],
        include: {
          apartments: {
            include: { buildings: true },
          },
          utility_types: true,
          users: true,
        },
      }),
      this.prisma.meter_readings.count({ where }),
    ]);

    return {
      data: readings.map((r: any) => this.toResponseDto(r)),
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
      include: {
        apartments: {
          include: { buildings: true },
        },
        utility_types: true,
        users: true,
      },
    });

    if (!reading) {
      throw new NotFoundException('Meter reading not found');
    }

    // Check access for residents
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

    return this.toResponseDto(reading);
  }

  async update(
    id: string,
    dto: UpdateMeterReadingDto,
    actorId: string,
  ): Promise<MeterReadingResponseDto> {
    const reading = await this.prisma.meter_readings.findUnique({
      where: { id },
      include: {
        invoice_line_items: true, // Check if already used in an invoice
      },
    });

    if (!reading) {
      throw new NotFoundException('Meter reading not found');
    }

    // Check if reading is already used in an invoice
    if (reading.invoice_line_items && reading.invoice_line_items.length > 0) {
      throw new ConflictException(
        'Cannot update meter reading that is already used in an invoice',
      );
    }

    const updateData: Prisma.meter_readingsUpdateInput = {};

    if (dto.currentValue !== undefined) {
      updateData.current_value = dto.currentValue;
    }

    if (dto.readingDate) {
      updateData.reading_date = new Date(dto.readingDate);
    }

    if (dto.imageProofUrl !== undefined) {
      updateData.image_proof_url = dto.imageProofUrl;
    }

    const updated = await this.prisma.meter_readings.update({
      where: { id },
      data: updateData,
      include: {
        apartments: {
          include: { buildings: true },
        },
        utility_types: true,
        users: true,
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
    const reading = await this.prisma.meter_readings.findUnique({
      where: { id },
      include: {
        invoice_line_items: true,
      },
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
    const utilityTypes = await this.prisma.utility_types.findMany({
      where: { is_active: true },
    });

    const readings: MeterReadingResponseDto[] = [];

    for (const utilityType of utilityTypes) {
      const latest = await this.prisma.meter_readings.findFirst({
        where: {
          apartment_id: apartmentId,
          utility_type_id: utilityType.id,
        },
        orderBy: { billing_period: 'desc' },
        include: {
          apartments: {
            include: { buildings: true },
          },
          utility_types: true,
          users: true,
        },
      });

      if (latest) {
        readings.push(this.toResponseDto(latest));
      }
    }

    return readings;
  }

  private toResponseDto(reading: any): MeterReadingResponseDto {
    const currentValue = Number(reading.current_value);
    const previousValue = reading.previous_value
      ? Number(reading.previous_value)
      : undefined;

    return {
      id: reading.id,
      apartmentId: reading.apartment_id,
      utilityTypeId: reading.utility_type_id,
      currentValue,
      previousValue,
      usage: previousValue !== undefined ? currentValue - previousValue : currentValue,
      billingPeriod: reading.billing_period,
      readingDate: reading.reading_date,
      recordedById: reading.recorded_by_id,
      imageProofUrl: reading.image_proof_url,
      created_at: reading.created_at,
      apartment: reading.apartments
        ? {
            id: reading.apartments.id,
            unit_number: reading.apartments.unit_number,
            buildings: {
              id: reading.apartments.buildings.id,
              name: reading.apartments.buildings.name,
            },
          }
        : undefined,
      utilityType: reading.utility_types
        ? {
            id: reading.utility_types.id,
            code: reading.utility_types.code,
            name: reading.utility_types.name,
            unit: reading.utility_types.unit,
          }
        : undefined,
      recordedBy: reading.users
        ? {
            id: reading.users.id,
            firstName: reading.users.first_name,
            lastName: reading.users.last_name,
          }
        : undefined,
    };
  }

  /**
   * Maps utility code to the corresponding meter ID field on apartments table
   */
  private getMeterIdFieldByUtilityCode(code: string): string | null {
    const mapping: Record<string, string> = {
      ELECTRIC: 'electric_meter_id',
      WATER: 'water_meter_id',
      GAS: 'gas_meter_id',
    };
    return mapping[code.toUpperCase()] || null;
  }

  /**
   * Generates a unique meter ID in format: {PREFIX}-{BUILDING}-{UNIT}
   * Examples: EL-TOMTOWN-101, WT-TOMTOWN-101, GS-TOMTOWN-101
   */
  private generateMeterId(
    utilityCode: string,
    buildingCode: string,
    unitNumber: string,
  ): string {
    const prefixMap: Record<string, string> = {
      ELECTRIC: 'EL',
      WATER: 'WT',
      GAS: 'GS',
    };
    const prefix = prefixMap[utilityCode.toUpperCase()] || utilityCode.substring(0, 2).toUpperCase();
    const cleanBuilding = buildingCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const cleanUnit = unitNumber.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    return `${prefix}-${cleanBuilding}-${cleanUnit}`;
  }
}
