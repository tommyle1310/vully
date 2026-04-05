import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  CreateParkingZoneDto,
  UpdateParkingZoneDto,
  ParkingZoneResponseDto,
} from './dto/parking.dto';
import { toZoneResponseDto } from './parking.mapper';

@Injectable()
export class ParkingZonesService {
  private readonly logger = new Logger(ParkingZonesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAllZones(buildingId: string): Promise<ParkingZoneResponseDto[]> {
    await this.verifyBuilding(buildingId);

    const zones = await this.prisma.parking_zones.findMany({
      where: { building_id: buildingId },
      orderBy: { code: 'asc' },
      include: {
        _count: {
          select: { parking_slots: true },
        },
        parking_slots: {
          select: { status: true },
        },
      },
    });

    return zones.map((zone) => toZoneResponseDto(zone));
  }

  async findOneZone(
    buildingId: string,
    zoneId: string,
  ): Promise<ParkingZoneResponseDto> {
    const zone = await this.prisma.parking_zones.findFirst({
      where: {
        id: zoneId,
        building_id: buildingId,
      },
      include: {
        parking_slots: {
          select: { status: true },
        },
      },
    });

    if (!zone) {
      throw new NotFoundException('Parking zone not found');
    }

    return toZoneResponseDto(zone);
  }

  async createZone(
    buildingId: string,
    dto: CreateParkingZoneDto,
  ): Promise<ParkingZoneResponseDto> {
    await this.verifyBuilding(buildingId);

    const existingZone = await this.prisma.parking_zones.findFirst({
      where: {
        building_id: buildingId,
        code: dto.code,
      },
    });

    if (existingZone) {
      throw new ConflictException(`Zone code '${dto.code}' already exists`);
    }

    const zone = await this.prisma.parking_zones.create({
      data: {
        building_id: buildingId,
        name: dto.name,
        code: dto.code,
        slot_type: dto.slotType,
        total_slots: dto.totalSlots,
        fee_per_month: dto.feePerMonth
          ? new Prisma.Decimal(dto.feePerMonth)
          : null,
        is_active: true,
      },
    });

    this.logger.log({
      event: 'parking_zone_created',
      buildingId,
      zoneId: zone.id,
      code: zone.code,
      slotType: zone.slot_type,
      totalSlots: zone.total_slots,
    });

    return toZoneResponseDto(zone);
  }

  async updateZone(
    buildingId: string,
    zoneId: string,
    dto: UpdateParkingZoneDto,
  ): Promise<ParkingZoneResponseDto> {
    await this.verifyZone(buildingId, zoneId);

    if (dto.code) {
      const existingZone = await this.prisma.parking_zones.findFirst({
        where: {
          building_id: buildingId,
          code: dto.code,
          id: { not: zoneId },
        },
      });

      if (existingZone) {
        throw new ConflictException(`Zone code '${dto.code}' already exists`);
      }
    }

    const zone = await this.prisma.parking_zones.update({
      where: { id: zoneId },
      data: {
        name: dto.name,
        code: dto.code,
        slot_type: dto.slotType,
        total_slots: dto.totalSlots,
        fee_per_month:
          dto.feePerMonth !== undefined
            ? dto.feePerMonth
              ? new Prisma.Decimal(dto.feePerMonth)
              : null
            : undefined,
        is_active: dto.isActive,
      },
      include: {
        parking_slots: {
          select: { status: true },
        },
      },
    });

    this.logger.log({
      event: 'parking_zone_updated',
      buildingId,
      zoneId,
    });

    return toZoneResponseDto(zone);
  }

  async verifyBuilding(buildingId: string): Promise<void> {
    const building = await this.prisma.buildings.findUnique({
      where: { id: buildingId },
    });

    if (!building) {
      throw new NotFoundException('Building not found');
    }
  }

  async verifyZone(buildingId: string, zoneId: string) {
    const zone = await this.prisma.parking_zones.findFirst({
      where: {
        id: zoneId,
        building_id: buildingId,
      },
    });

    if (!zone) {
      throw new NotFoundException('Parking zone not found');
    }

    return zone;
  }
}
