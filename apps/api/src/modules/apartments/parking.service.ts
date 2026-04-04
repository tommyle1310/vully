import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma, ParkingSlotStatus } from '@prisma/client';
import {
  CreateParkingZoneDto,
  UpdateParkingZoneDto,
  ParkingZoneResponseDto,
  CreateParkingSlotsDto,
  UpdateParkingSlotDto,
  ParkingSlotResponseDto,
  ParkingStatsDto,
} from './dto/parking.dto';

@Injectable()
export class ParkingService {
  private readonly logger = new Logger(ParkingService.name);

  constructor(private readonly prisma: PrismaService) {}

  // =====================
  // Zone Operations
  // =====================

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

    return zones.map((zone) => this.toZoneResponseDto(zone));
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

    return this.toZoneResponseDto(zone);
  }

  async createZone(
    buildingId: string,
    dto: CreateParkingZoneDto,
  ): Promise<ParkingZoneResponseDto> {
    await this.verifyBuilding(buildingId);

    // Check for duplicate code in building
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

    return this.toZoneResponseDto(zone);
  }

  async updateZone(
    buildingId: string,
    zoneId: string,
    dto: UpdateParkingZoneDto,
  ): Promise<ParkingZoneResponseDto> {
    await this.verifyZone(buildingId, zoneId);

    // Check for duplicate code if changing
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

    return this.toZoneResponseDto(zone);
  }

  // =====================
  // Slot Operations
  // =====================

  async findAllSlots(
    buildingId: string,
    zoneId: string,
  ): Promise<ParkingSlotResponseDto[]> {
    const zone = await this.verifyZone(buildingId, zoneId);

    const slots = await this.prisma.parking_slots.findMany({
      where: { zone_id: zoneId },
      orderBy: { slot_number: 'asc' },
      include: {
        apartments: {
          select: { id: true, apartment_code: true },
        },
        parking_zones: {
          select: { fee_per_month: true },
        },
      },
    });

    return slots.map((slot) => this.toSlotResponseDto(slot));
  }

  async bulkCreateSlots(
    buildingId: string,
    zoneId: string,
    dto: CreateParkingSlotsDto,
  ): Promise<ParkingSlotResponseDto[]> {
    const zone = await this.verifyZone(buildingId, zoneId);

    // Get current max slot number
    const maxSlot = await this.prisma.parking_slots.findFirst({
      where: { zone_id: zoneId },
      orderBy: { slot_number: 'desc' },
    });

    const startNum = dto.startNumber ?? (maxSlot ? parseInt(maxSlot.slot_number) + 1 : 1);

    // Create slots
    const slotsData = Array.from({ length: dto.count }, (_, i) => {
      const slotNum = (startNum + i).toString().padStart(3, '0');
      return {
        zone_id: zoneId,
        slot_number: slotNum,
        full_code: `${zone.code}-${slotNum}`,
        status: 'available' as ParkingSlotStatus,
        updated_at: new Date(),
      };
    });

    await this.prisma.parking_slots.createMany({
      data: slotsData,
      skipDuplicates: true,
    });

    this.logger.log({
      event: 'parking_slots_created',
      buildingId,
      zoneId,
      count: dto.count,
      startNumber: startNum,
    });

    // Return created slots
    return this.findAllSlots(buildingId, zoneId);
  }

  async assignSlot(
    buildingId: string,
    zoneId: string,
    slotId: string,
    apartmentId: string,
  ): Promise<ParkingSlotResponseDto> {
    // Verify slot belongs to zone and building
    const slot = await this.prisma.parking_slots.findFirst({
      where: {
        id: slotId,
        zone_id: zoneId,
        parking_zones: {
          building_id: buildingId,
        },
      },
      include: {
        parking_zones: true,
      },
    });

    if (!slot) {
      throw new NotFoundException('Parking slot not found');
    }

    // Check slot is available
    if (slot.status !== 'available') {
      throw new BadRequestException(
        `Slot is not available (current status: ${slot.status})`,
      );
    }

    // Verify apartment exists and belongs to same building
    const apartment = await this.prisma.apartments.findFirst({
      where: {
        id: apartmentId,
        building_id: buildingId,
      },
    });

    if (!apartment) {
      throw new NotFoundException('Apartment not found in this building');
    }

    // Assign slot
    const updatedSlot = await this.prisma.parking_slots.update({
      where: { id: slotId },
      data: {
        assigned_apt_id: apartmentId,
        assigned_at: new Date(),
        status: 'assigned',
        updated_at: new Date(),
      },
      include: {
        apartments: {
          select: { id: true, apartment_code: true },
        },
        parking_zones: {
          select: { fee_per_month: true },
        },
      },
    });

    this.logger.log({
      event: 'parking_slot_assigned',
      buildingId,
      zoneId,
      slotId,
      apartmentId,
      slotCode: updatedSlot.full_code,
    });

    return this.toSlotResponseDto(updatedSlot);
  }

  async unassignSlot(
    buildingId: string,
    zoneId: string,
    slotId: string,
  ): Promise<ParkingSlotResponseDto> {
    // Verify slot belongs to zone and building
    const slot = await this.prisma.parking_slots.findFirst({
      where: {
        id: slotId,
        zone_id: zoneId,
        parking_zones: {
          building_id: buildingId,
        },
      },
    });

    if (!slot) {
      throw new NotFoundException('Parking slot not found');
    }

    if (slot.status !== 'assigned') {
      throw new BadRequestException('Slot is not currently assigned');
    }

    const previousAptId = slot.assigned_apt_id;

    // Unassign slot
    const updatedSlot = await this.prisma.parking_slots.update({
      where: { id: slotId },
      data: {
        assigned_apt_id: null,
        assigned_at: null,
        status: 'available',
        updated_at: new Date(),
      },
      include: {
        apartments: {
          select: { id: true, apartment_code: true },
        },
        parking_zones: {
          select: { fee_per_month: true },
        },
      },
    });

    this.logger.log({
      event: 'parking_slot_unassigned',
      buildingId,
      zoneId,
      slotId,
      previousApartmentId: previousAptId,
      slotCode: updatedSlot.full_code,
    });

    return this.toSlotResponseDto(updatedSlot);
  }

  async updateSlot(
    buildingId: string,
    zoneId: string,
    slotId: string,
    dto: UpdateParkingSlotDto,
  ): Promise<ParkingSlotResponseDto> {
    // Verify slot exists
    const slot = await this.prisma.parking_slots.findFirst({
      where: {
        id: slotId,
        zone_id: zoneId,
        parking_zones: {
          building_id: buildingId,
        },
      },
    });

    if (!slot) {
      throw new NotFoundException('Parking slot not found');
    }

    const updatedSlot = await this.prisma.parking_slots.update({
      where: { id: slotId },
      data: {
        status: dto.status,
        fee_override:
          dto.feeOverride !== undefined
            ? dto.feeOverride
              ? new Prisma.Decimal(dto.feeOverride)
              : null
            : undefined,
        notes: dto.notes,
        updated_at: new Date(),
      },
      include: {
        apartments: {
          select: { id: true, apartment_code: true },
        },
        parking_zones: {
          select: { fee_per_month: true },
        },
      },
    });

    this.logger.log({
      event: 'parking_slot_updated',
      buildingId,
      zoneId,
      slotId,
    });

    return this.toSlotResponseDto(updatedSlot);
  }

  // =====================
  // Stats
  // =====================

  async getStats(buildingId: string): Promise<ParkingStatsDto> {
    await this.verifyBuilding(buildingId);

    const [zones, slots] = await Promise.all([
      this.prisma.parking_zones.findMany({
        where: { building_id: buildingId },
        select: { id: true, slot_type: true },
      }),
      this.prisma.parking_slots.findMany({
        where: {
          parking_zones: { building_id: buildingId },
        },
        select: {
          status: true,
          parking_zones: { select: { slot_type: true } },
        },
      }),
    ]);

    const statusCounts = {
      available: 0,
      assigned: 0,
      reserved: 0,
      maintenance: 0,
    };

    const byType = {
      car: { total: 0, available: 0, assigned: 0 },
      motorcycle: { total: 0, available: 0, assigned: 0 },
      bicycle: { total: 0, available: 0, assigned: 0 },
    };

    for (const slot of slots) {
      statusCounts[slot.status]++;
      const type = slot.parking_zones.slot_type;
      byType[type].total++;
      if (slot.status === 'available') byType[type].available++;
      if (slot.status === 'assigned') byType[type].assigned++;
    }

    return {
      totalZones: zones.length,
      totalSlots: slots.length,
      availableSlots: statusCounts.available,
      assignedSlots: statusCounts.assigned,
      reservedSlots: statusCounts.reserved,
      maintenanceSlots: statusCounts.maintenance,
      byType,
    };
  }

  // =====================
  // Apartment Parking Info
  // =====================

  async getApartmentSlots(apartmentId: string): Promise<ParkingSlotResponseDto[]> {
    const slots = await this.prisma.parking_slots.findMany({
      where: { assigned_apt_id: apartmentId },
      include: {
        apartments: {
          select: { id: true, apartment_code: true },
        },
        parking_zones: {
          select: { fee_per_month: true, name: true, code: true },
        },
      },
    });

    return slots.map((slot) => this.toSlotResponseDto(slot));
  }

  // =====================
  // Helper Methods
  // =====================

  private async verifyBuilding(buildingId: string): Promise<void> {
    const building = await this.prisma.buildings.findUnique({
      where: { id: buildingId },
    });

    if (!building) {
      throw new NotFoundException('Building not found');
    }
  }

  private async verifyZone(buildingId: string, zoneId: string) {
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

  private toZoneResponseDto(zone: any): ParkingZoneResponseDto {
    const slots = zone.parking_slots || [];
    const availableCount = slots.filter((s: any) => s.status === 'available').length;
    const assignedCount = slots.filter((s: any) => s.status === 'assigned').length;

    return {
      id: zone.id,
      buildingId: zone.building_id,
      name: zone.name,
      code: zone.code,
      slotType: zone.slot_type,
      totalSlots: zone.total_slots,
      feePerMonth: zone.fee_per_month?.toNumber() ?? null,
      isActive: zone.is_active,
      createdAt: zone.created_at.toISOString(),
      availableSlots: availableCount,
      assignedSlots: assignedCount,
    };
  }

  private toSlotResponseDto(slot: any): ParkingSlotResponseDto {
    const zoneFee = slot.parking_zones?.fee_per_month?.toNumber() ?? null;
    const overrideFee = slot.fee_override?.toNumber() ?? null;

    return {
      id: slot.id,
      zoneId: slot.zone_id,
      slotNumber: slot.slot_number,
      fullCode: slot.full_code,
      assignedAptId: slot.assigned_apt_id,
      assignedAptCode: slot.apartments?.apartment_code ?? null,
      assignedAt: slot.assigned_at?.toISOString() ?? null,
      feeOverride: overrideFee,
      status: slot.status,
      notes: slot.notes,
      createdAt: slot.created_at.toISOString(),
      updatedAt: slot.updated_at.toISOString(),
      effectiveFee: overrideFee ?? zoneFee,
    };
  }
}
