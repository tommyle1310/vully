import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';
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
        floorHeights: dto.floorHeights ?? Prisma.JsonNull,
        svgMapData: dto.svgMapData,
        amenities: dto.amenities || [],
      },
    });

    this.logger.log({
      event: 'building_created',
      buildingId: building.id,
      name: building.name,
    });

    // Auto-create apartments from SVG floor plan
    if (dto.svgMapData) {
      await this.syncApartmentsFromSvg(
        building.id,
        dto.svgMapData,
        dto.floorCount,
      );
    }

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
        ...(dto.floorHeights !== undefined && { floorHeights: dto.floorHeights }),
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

    // Auto-sync apartments from SVG floor plan
    await this.syncApartmentsFromSvg(id, svgMapData, building.floorCount);

    this.logger.log({
      event: 'building_svg_updated',
      buildingId: id,
    });

    return this.toResponseDto(updated);
  }

  /**
   * Parse apartment definitions from SVG metadata and upsert apartment records
   * for each floor. The SVG floor plan is treated as a single-floor template
   * that is replicated across all floors of the building.
   */
  private async syncApartmentsFromSvg(
    buildingId: string,
    svgMapData: string,
    floorCount: number,
  ): Promise<void> {
    // Parse apartment data from SVG metadata block
    const apartmentRegex =
      /<apartment\s+id="([^"]*)"\s+type="([^"]*)"\s+name="([^"]*)"\s+label="([^"]*)"\s+area-sqm="([^"]*)"\s*\/>/g;

    const templates: Array<{
      id: string;
      type: string;
      name: string;
      label: string;
      areaSqm: number;
    }> = [];

    let match: RegExpExecArray | null;
    while ((match = apartmentRegex.exec(svgMapData)) !== null) {
      templates.push({
        id: match[1],
        type: match[2],
        name: match[3],
        label: match[4],
        areaSqm: parseFloat(match[5]) || 0,
      });
    }

    if (templates.length === 0) {
      this.logger.debug({
        event: 'svg_sync_no_apartments',
        buildingId,
      });
      return;
    }

    this.logger.log({
      event: 'svg_sync_apartments',
      buildingId,
      templateCount: templates.length,
      floorCount,
    });

    // Upsert apartments for each floor
    for (let floor = 1; floor <= floorCount; floor++) {
      for (let i = 0; i < templates.length; i++) {
        const template = templates[i];
        const unitIndex = String(i + 1).padStart(2, '0');
        const unitNumber = `${floor}${unitIndex}`; // e.g., "101", "102", "201", "202"

        const bedroomCount = this.getBedroomCount(template.type);
        const bathroomCount = this.getBathroomCount(template.type);

        await this.prisma.apartment.upsert({
          where: {
            buildingId_unitNumber: {
              buildingId,
              unitNumber,
            },
          },
          create: {
            buildingId,
            unitNumber,
            floor,
            areaSqm: template.areaSqm > 0 ? template.areaSqm : null,
            bedroomCount,
            bathroomCount,
            svgElementId: template.id || null,
            features: {
              apartmentType: template.type,
              apartmentName: template.name,
            } as Prisma.InputJsonValue,
            status: 'vacant',
          },
          update: {
            floor,
            areaSqm: template.areaSqm > 0 ? template.areaSqm : null,
            bedroomCount,
            bathroomCount,
            svgElementId: template.id || null,
            features: {
              apartmentType: template.type,
              apartmentName: template.name,
            } as Prisma.InputJsonValue,
          },
        });
      }
    }

    this.logger.log({
      event: 'svg_sync_complete',
      buildingId,
      totalApartments: templates.length * floorCount,
    });
  }

  private getBedroomCount(type: string): number {
    const t = type.toLowerCase();
    if (t.includes('studio')) return 0;
    if (t.includes('1')) return 1;
    if (t.includes('2')) return 2;
    if (t.includes('3')) return 3;
    return 1;
  }

  private getBathroomCount(type: string): number {
    const t = type.toLowerCase();
    if (t.includes('3')) return 2;
    return 1;
  }

  private toResponseDto(building: {
    id: string;
    name: string;
    address: string;
    city: string;
    floorCount: number;
    floorHeights: unknown;
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
      floorHeights: building.floorHeights as Record<string, number> | undefined,
      svgMapData: building.svgMapData || undefined,
      amenities: (building.amenities as string[]) || [],
      isActive: building.isActive,
      createdAt: building.createdAt,
      updatedAt: building.updatedAt,
    };
  }
}
