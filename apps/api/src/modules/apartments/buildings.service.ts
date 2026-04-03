import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  CreateBuildingDto,
  UpdateBuildingDto,
  BuildingResponseDto,
  BuildingStatsResponseDto,
  BuildingMetersResponseDto,
  MeterInfoDto,
} from './dto/building.dto';

@Injectable()
export class BuildingsService {
  private readonly logger = new Logger(BuildingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBuildingDto): Promise<BuildingResponseDto> {
    const building = await this.prisma.buildings.create({
      data: {
        name: dto.name,
        address: dto.address,
        city: dto.city,
        floor_count: dto.floorCount,
        floor_heights: dto.floorHeights ?? Prisma.JsonNull,
        svg_map_data: dto.svgMapData,
        amenities: dto.amenities || [],
        updated_at: new Date(),
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
    const where = includeInactive ? {} : { is_active: true };

    const [buildings, total] = await Promise.all([
      this.prisma.buildings.findMany({
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
      this.prisma.buildings.count({ where }),
    ]);

    return {
      data: buildings.map((b: any) => ({
        ...this.toResponseDto(b),
        apartmentCount: b._count.apartments,
      })),
      total,
    };
  }

  async findOne(id: string): Promise<BuildingResponseDto> {
    const building = await this.prisma.buildings.findUnique({
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
    const building = await this.prisma.buildings.findUnique({ where: { id } });

    if (!building) {
      throw new NotFoundException('Building not found');
    }

    const updated = await this.prisma.buildings.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.address && { address: dto.address }),
        ...(dto.city && { city: dto.city }),
        ...(dto.floorCount && { floor_count: dto.floorCount }),
        ...(dto.floorHeights !== undefined && { floor_heights: dto.floorHeights }),
        ...(dto.svgMapData !== undefined && { svg_map_data: dto.svgMapData }),
        ...(dto.amenities && { amenities: dto.amenities }),
        ...(dto.isActive !== undefined && { is_active: dto.isActive }),
      },
    });

    this.logger.log({
      event: 'building_updated',
      buildingId: id,
    });

    return this.toResponseDto(updated);
  }

  async updateSvgMap(id: string, svgMapData: string): Promise<BuildingResponseDto> {
    const building = await this.prisma.buildings.findUnique({ where: { id } });

    if (!building) {
      throw new NotFoundException('Building not found');
    }

    const updated = await this.prisma.buildings.update({
      where: { id },
      data: { svg_map_data: svgMapData },
    });

    // Auto-sync apartments from SVG floor plan
    await this.syncApartmentsFromSvg(id, svgMapData, building.floor_count);

    this.logger.log({
      event: 'building_svg_updated',
      buildingId: id,
    });

    return this.toResponseDto(updated);
  }

  async getStats(id: string): Promise<BuildingStatsResponseDto> {
    const building = await this.prisma.buildings.findUnique({
      where: { id },
    });

    if (!building) {
      throw new NotFoundException('Building not found');
    }

    // Group apartments by status
    const counts = await this.prisma.apartments.groupBy({
      by: ['status'],
      where: { building_id: id },
      _count: { id: true },
    });

    const statusMap: Record<string, number> = {};
    for (const c of counts) {
      statusMap[c.status] = c._count.id;
    }

    const totalApartments = Object.values(statusMap).reduce((a, b) => a + b, 0);
    const occupied = statusMap['occupied'] || 0;
    const vacant = statusMap['vacant'] || 0;
    const maintenance = statusMap['maintenance'] || 0;
    const reserved = statusMap['reserved'] || 0;
    const occupancyRate = totalApartments > 0 ? Math.round((occupied / totalApartments) * 100) : 0;

    return {
      totalApartments,
      occupied,
      vacant,
      maintenance,
      reserved,
      occupancyRate,
    };
  }

  async getMeters(id: string): Promise<BuildingMetersResponseDto> {
    const building = await this.prisma.buildings.findUnique({
      where: { id },
    });

    if (!building) {
      throw new NotFoundException('Building not found');
    }

    const apartments = await this.prisma.apartments.findMany({
      where: { building_id: id },
      select: {
        id: true,
        unit_number: true,
        electric_meter_id: true,
        water_meter_id: true,
        gas_meter_id: true,
      },
      orderBy: { unit_number: 'asc' },
    });

    const meters: MeterInfoDto[] = apartments.map((apt) => ({
      apartmentId: apt.id,
      unitNumber: apt.unit_number,
      electricMeterId: apt.electric_meter_id,
      waterMeterId: apt.water_meter_id,
      gasMeterId: apt.gas_meter_id,
    }));

    // Find duplicate meter IDs
    const allMeterIds = apartments.flatMap((apt) => [
      apt.electric_meter_id,
      apt.water_meter_id,
      apt.gas_meter_id,
    ]).filter((id): id is string => Boolean(id));

    const meterIdCounts = new Map<string, number>();
    for (const meterId of allMeterIds) {
      meterIdCounts.set(meterId, (meterIdCounts.get(meterId) || 0) + 1);
    }

    const duplicates = Array.from(meterIdCounts.entries())
      .filter(([, count]) => count > 1)
      .map(([id]) => id);

    return { meters, duplicates };
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
        const unit_number = `${floor}${unitIndex}`; // e.g., "101", "102", "201", "202"

        const bedroomCount = this.getBedroomCount(template.type);
        const bathroomCount = this.getBathroomCount(template.type);

        await this.prisma.apartments.upsert({
          where: {
            building_id_unit_number: {
              building_id: buildingId,
              unit_number: unit_number,
            },
          },
          create: {
            building_id: buildingId,
            unit_number: unit_number,
            floor_index: floor,
            gross_area: template.areaSqm > 0 ? template.areaSqm : null,
            bedroom_count: bedroomCount,
            bathroom_count: bathroomCount,
            svg_element_id: template.id || null,
            features: {
              apartmentType: template.type,
              apartmentName: template.name,
            } as Prisma.InputJsonValue,
            status: 'vacant',
            updated_at: new Date(),
          },
          update: {
            // Only update layout/metadata — do NOT overwrite manually-set fields
            // (bedroom_count, bathroom_count, gross_area, net_area, status, etc.)
            floor_index: floor,
            svg_element_id: template.id || null,
            features: {
              apartmentType: template.type,
              apartmentName: template.name,
            } as Prisma.InputJsonValue,
            updated_at: new Date(),
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
    floor_count: number;
    floor_heights: unknown;
    svg_map_data: string | null;
    amenities: unknown;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
  }): BuildingResponseDto {
    return {
      id: building.id,
      name: building.name,
      address: building.address,
      city: building.city,
      floorCount: building.floor_count,
      floorHeights: building.floor_heights as Record<string, number> | undefined,
      svgMapData: building.svg_map_data || undefined,
      amenities: (building.amenities as string[]) || [],
      isActive: building.is_active,
      created_at: building.created_at,
      updatedAt: building.updated_at,
    };
  }
}
