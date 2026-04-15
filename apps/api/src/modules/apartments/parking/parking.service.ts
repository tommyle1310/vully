import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { Prisma, ParkingSlotStatus } from '@prisma/client';
import {
  CreateParkingSlotsDto,
  UpdateParkingSlotDto,
  ParkingSlotResponseDto,
  ParkingStatsDto,
} from '../dto/parking.dto';
import { ParkingZonesService } from './parking-zones.service';
import { toSlotResponseDto } from './parking.mapper';

@Injectable()
export class ParkingService {
  private readonly logger = new Logger(ParkingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly parkingZonesService: ParkingZonesService,
  ) {}

  // =====================
  // Slot Operations
  // =====================

  async findAllSlots(
    buildingId: string,
    zoneId: string,
  ): Promise<ParkingSlotResponseDto[]> {
    await this.parkingZonesService.verifyZone(buildingId, zoneId);

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

    return slots.map((slot) => toSlotResponseDto(slot));
  }

  async bulkCreateSlots(
    buildingId: string,
    zoneId: string,
    dto: CreateParkingSlotsDto,
  ): Promise<ParkingSlotResponseDto[]> {
    const zone = await this.parkingZonesService.verifyZone(buildingId, zoneId);

    const maxSlot = await this.prisma.parking_slots.findFirst({
      where: { zone_id: zoneId },
      orderBy: { slot_number: 'desc' },
    });

    const startNum = dto.startNumber ?? (maxSlot ? parseInt(maxSlot.slot_number) + 1 : 1);

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

    return this.findAllSlots(buildingId, zoneId);
  }

  private async findAndVerifySlot(buildingId: string, zoneId: string, slotId: string) {
    const slot = await this.prisma.parking_slots.findFirst({
      where: {
        id: slotId,
        zone_id: zoneId,
        parking_zones: { building_id: buildingId },
      },
      include: { parking_zones: true },
    });
    if (!slot) {
      throw new NotFoundException('Parking slot not found');
    }
    return slot;
  }

  async assignSlot(
    buildingId: string,
    zoneId: string,
    slotId: string,
    apartmentId: string,
  ): Promise<ParkingSlotResponseDto> {
    const slot = await this.findAndVerifySlot(buildingId, zoneId, slotId);

    if (slot.status !== 'available') {
      throw new BadRequestException(
        `Slot is not available (current status: ${slot.status})`,
      );
    }

    const apartment = await this.prisma.apartments.findFirst({
      where: {
        id: apartmentId,
        building_id: buildingId,
      },
    });

    if (!apartment) {
      throw new NotFoundException('Apartment not found in this building');
    }

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

    return toSlotResponseDto(updatedSlot);
  }

  async unassignSlot(
    buildingId: string,
    zoneId: string,
    slotId: string,
  ): Promise<ParkingSlotResponseDto> {
    const slot = await this.findAndVerifySlot(buildingId, zoneId, slotId);

    if (slot.status !== 'assigned') {
      throw new BadRequestException('Slot is not currently assigned');
    }

    const previousAptId = slot.assigned_apt_id;

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

    return toSlotResponseDto(updatedSlot);
  }

  async updateSlot(
    buildingId: string,
    zoneId: string,
    slotId: string,
    dto: UpdateParkingSlotDto,
  ): Promise<ParkingSlotResponseDto> {
    await this.findAndVerifySlot(buildingId, zoneId, slotId);

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

    return toSlotResponseDto(updatedSlot);
  }

  // =====================
  // Stats
  // =====================

  async getStats(buildingId: string): Promise<ParkingStatsDto> {
    await this.parkingZonesService.verifyBuilding(buildingId);

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

    return slots.map((slot) => toSlotResponseDto(slot));
  }
}
