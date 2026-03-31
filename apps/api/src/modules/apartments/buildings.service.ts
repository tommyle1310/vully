import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateBuildingDto,
  UpdateBuildingDto,
  BuildingResponseDto,
} from './dto/building.dto';

@Injectable()
export class BuildingsService {
  private readonly logger = new Logger(BuildingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBuildingDto): Promise<BuildingResponseDto> {
    const building = await this.prisma.building.create({
      data: {
        name: dto.name,
        address: dto.address,
        city: dto.city,
        floorCount: dto.floorCount,
        svgMapData: dto.svgMapData,
        amenities: dto.amenities || [],
      },
    });

    this.logger.log({
      event: 'building_created',
      buildingId: building.id,
      name: building.name,
    });

    return this.toResponseDto(building);
  }

  async findAll(
    page = 1,
    limit = 20,
    includeInactive = false,
  ): Promise<{ data: BuildingResponseDto[]; total: number }> {
    const skip = (page - 1) * limit;
    const where = includeInactive ? {} : { isActive: true };

    const [buildings, total] = await Promise.all([
      this.prisma.building.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { apartments: true },
          },
        },
      }),
      this.prisma.building.count({ where }),
    ]);

    return {
      data: buildings.map((b) => ({
        ...this.toResponseDto(b),
        apartmentCount: b._count.apartments,
      })),
      total,
    };
  }

  async findOne(id: string): Promise<BuildingResponseDto> {
    const building = await this.prisma.building.findUnique({
      where: { id },
      include: {
        _count: {
          select: { apartments: true },
        },
      },
    });

    if (!building) {
      throw new NotFoundException('Building not found');
    }

    return {
      ...this.toResponseDto(building),
      apartmentCount: building._count.apartments,
    };
  }

  async update(id: string, dto: UpdateBuildingDto): Promise<BuildingResponseDto> {
    const building = await this.prisma.building.findUnique({ where: { id } });

    if (!building) {
      throw new NotFoundException('Building not found');
    }

    const updated = await this.prisma.building.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.address && { address: dto.address }),
        ...(dto.city && { city: dto.city }),
        ...(dto.floorCount && { floorCount: dto.floorCount }),
        ...(dto.svgMapData !== undefined && { svgMapData: dto.svgMapData }),
        ...(dto.amenities && { amenities: dto.amenities }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    this.logger.log({
      event: 'building_updated',
      buildingId: id,
    });

    return this.toResponseDto(updated);
  }

  async updateSvgMap(id: string, svgMapData: string): Promise<BuildingResponseDto> {
    const building = await this.prisma.building.findUnique({ where: { id } });

    if (!building) {
      throw new NotFoundException('Building not found');
    }

    const updated = await this.prisma.building.update({
      where: { id },
      data: { svgMapData },
    });

    this.logger.log({
      event: 'building_svg_updated',
      buildingId: id,
    });

    return this.toResponseDto(updated);
  }

  private toResponseDto(building: {
    id: string;
    name: string;
    address: string;
    city: string;
    floorCount: number;
    svgMapData: string | null;
    amenities: unknown;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): BuildingResponseDto {
    return {
      id: building.id,
      name: building.name,
      address: building.address,
      city: building.city,
      floorCount: building.floorCount,
      svgMapData: building.svgMapData || undefined,
      amenities: (building.amenities as string[]) || [],
      isActive: building.isActive,
      createdAt: building.createdAt,
      updatedAt: building.updatedAt,
    };
  }
}
