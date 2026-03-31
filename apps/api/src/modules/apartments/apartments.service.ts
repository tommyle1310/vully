import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateApartmentDto,
  UpdateApartmentDto,
  ApartmentResponseDto,
  ApartmentFiltersDto,
} from './dto/apartment.dto';

@Injectable()
export class ApartmentsService {
  private readonly logger = new Logger(ApartmentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateApartmentDto): Promise<ApartmentResponseDto> {
    // Verify building exists
    const building = await this.prisma.building.findUnique({
      where: { id: dto.buildingId },
    });

    if (!building) {
      throw new NotFoundException('Building not found');
    }

    this.logger.debug({
      event: 'apartment_create_input',
      dto: {
        areaSqm: dto.areaSqm,
        bedroomCount: dto.bedroomCount,
        bathroomCount: dto.bathroomCount,
      },
    });

    const apartment = await this.prisma.apartment.create({
      data: {
        buildingId: dto.buildingId,
        unitNumber: dto.unitNumber,
        floor: dto.floor,
        areaSqm: dto.areaSqm !== undefined ? dto.areaSqm : null,
        bedroomCount: dto.bedroomCount ?? 1,
        bathroomCount: dto.bathroomCount ?? 1,
        features: (dto.features || {}) as Prisma.InputJsonValue,
        svgElementId: dto.svgElementId ?? null,
        status: 'vacant',
      },
      include: {
        building: {
          select: { id: true, name: true, address: true },
        },
      },
    });

    this.logger.log({
      event: 'apartment_created',
      apartmentId: apartment.id,
      buildingId: dto.buildingId,
      unitNumber: dto.unitNumber,
      storedValues: {
        areaSqm: apartment.areaSqm,
        bedroomCount: apartment.bedroomCount,
        bathroomCount: apartment.bathroomCount,
      },
    });

    return this.toResponseDto(apartment);
  }

  async findAll(
    filters: ApartmentFiltersDto,
    page = 1,
    limit = 20,
  ): Promise<{ data: ApartmentResponseDto[]; total: number }> {
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (filters.buildingId) where.buildingId = filters.buildingId;
    if (filters.status) where.status = filters.status;
    if (filters.floor) where.floor = filters.floor;
    if (filters.minBedrooms) where.bedroomCount = { gte: filters.minBedrooms };

    const [apartments, total] = await Promise.all([
      this.prisma.apartment.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ buildingId: 'asc' }, { floor: 'asc' }, { unitNumber: 'asc' }],
        include: {
          building: {
            select: { id: true, name: true, address: true },
          },
        },
      }),
      this.prisma.apartment.count({ where }),
    ]);

    return {
      data: apartments.map(this.toResponseDto),
      total,
    };
  }

  async findOne(id: string): Promise<ApartmentResponseDto> {
    const apartment = await this.prisma.apartment.findUnique({
      where: { id },
      include: {
        building: {
          select: { id: true, name: true, address: true },
        },
      },
    });

    if (!apartment) {
      throw new NotFoundException('Apartment not found');
    }

    return this.toResponseDto(apartment);
  }

  async findByResident(
    residentId: string,
  ): Promise<ApartmentResponseDto | null> {
    const contract = await this.prisma.contract.findFirst({
      where: {
        tenantId: residentId,
        status: 'active',
      },
      include: {
        apartment: {
          include: {
            building: {
              select: { id: true, name: true, address: true },
            },
          },
        },
      },
    });

    if (!contract) {
      return null;
    }

    return this.toResponseDto(contract.apartment);
  }

  async findOneForResident(
    id: string,
    residentId: string,
  ): Promise<ApartmentResponseDto> {
    const apartment = await this.findOne(id);

    // Check if resident has active contract for this apartment
    const contract = await this.prisma.contract.findFirst({
      where: {
        apartmentId: id,
        tenantId: residentId,
        status: 'active',
      },
    });

    if (!contract) {
      throw new ForbiddenException('You do not have access to this apartment');
    }

    return apartment;
  }

  async update(id: string, dto: UpdateApartmentDto): Promise<ApartmentResponseDto> {
    const apartment = await this.prisma.apartment.findUnique({ where: { id } });

    if (!apartment) {
      throw new NotFoundException('Apartment not found');
    }

    this.logger.debug({
      event: 'apartment_update_input',
      apartmentId: id,
      dto: {
        areaSqm: dto.areaSqm,
        bedroomCount: dto.bedroomCount,
        bathroomCount: dto.bathroomCount,
      },
    });

    const updateData: Prisma.ApartmentUpdateInput = {};
    
    if (dto.unitNumber !== undefined) updateData.unitNumber = dto.unitNumber;
    if (dto.floor !== undefined) updateData.floor = dto.floor;
    if (dto.areaSqm !== undefined) updateData.areaSqm = dto.areaSqm;
    if (dto.bedroomCount !== undefined) updateData.bedroomCount = dto.bedroomCount;
    if (dto.bathroomCount !== undefined) updateData.bathroomCount = dto.bathroomCount;
    if (dto.features !== undefined) updateData.features = dto.features as Prisma.InputJsonValue;
    if (dto.svgElementId !== undefined) updateData.svgElementId = dto.svgElementId;
    if (dto.status !== undefined) updateData.status = dto.status;

    this.logger.debug({
      event: 'apartment_update_data',
      updateData: {
        areaSqm: updateData.areaSqm,
        bedroomCount: updateData.bedroomCount,
        bathroomCount: updateData.bathroomCount,
      },
    });

    const updated = await this.prisma.apartment.update({
      where: { id },
      data: updateData,
      include: {
        building: {
          select: { id: true, name: true, address: true },
        },
      },
    });

    this.logger.log({
      event: 'apartment_updated',
      apartmentId: id,
      status: dto.status,
      storedValues: {
        areaSqm: updated.areaSqm,
        bedroomCount: updated.bedroomCount,
        bathroomCount: updated.bathroomCount,
      },
    });

    return this.toResponseDto(updated);
  }

  async updateStatus(
    id: string,
    status: 'vacant' | 'occupied' | 'maintenance' | 'reserved',
  ): Promise<ApartmentResponseDto> {
    return this.update(id, { status });
  }

  private toResponseDto(apartment: {
    id: string;
    buildingId: string;
    unitNumber: string;
    floor: number;
    status: string;
    areaSqm: unknown;
    bedroomCount: number;
    bathroomCount: number;
    features: unknown;
    svgElementId: string | null;
    createdAt: Date;
    updatedAt: Date;
    building?: {
      id: string;
      name: string;
      address: string;
    };
  }): ApartmentResponseDto {
    return {
      id: apartment.id,
      buildingId: apartment.buildingId,
      unitNumber: apartment.unitNumber,
      floor: apartment.floor,
      status: apartment.status,
      areaSqm: apartment.areaSqm ? Number(apartment.areaSqm) : undefined,
      bedroomCount: apartment.bedroomCount,
      bathroomCount: apartment.bathroomCount,
      features: (apartment.features as Record<string, unknown>) || {},
      svgElementId: apartment.svgElementId || undefined,
      createdAt: apartment.createdAt,
      updatedAt: apartment.updatedAt,
      building: apartment.building,
    };
  }
}
