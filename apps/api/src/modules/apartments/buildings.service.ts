import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma, buildings } from '@prisma/client';
import {
  CreateBuildingDto,
  UpdateBuildingDto,
  BuildingResponseDto,
  BuildingStatsResponseDto,
  BuildingMetersResponseDto,
  MeterInfoDto,
} from './dto/building.dto';
import { DEFAULT_PAGINATION_LIMIT } from '../../common/constants/defaults';
import { BuildingsSvgService } from './buildings-svg.service';

@Injectable()
export class BuildingsService {
  private readonly logger = new Logger(BuildingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly buildingsSvgService: BuildingsSvgService,
  ) {}

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

    if (dto.svgMapData) {
      await this.buildingsSvgService.syncApartmentsFromSvg(
        building.id,
        dto.svgMapData,
        dto.floorCount,
      );
    }

    return this.toResponseDto(building);
  }

  async findAll(
    page = 1,
    limit = DEFAULT_PAGINATION_LIMIT,
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
      data: buildings.map((b) => ({
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

    await this.buildingsSvgService.syncApartmentsFromSvg(id, svgMapData, building.floor_count);

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
   * Get building policies for the current user's apartment building
   * Based on their active contract
   */
  async getMyBuildingPolicies(userId: string): Promise<{
    buildingId: string;
    buildingName: string;
    policy: any | null;
  }> {
    // Find user's active contract to get their building
    const contract = await this.prisma.contracts.findFirst({
      where: {
        tenant_id: userId,
        status: 'active',
      },
      include: {
        apartments: {
          include: {
            buildings: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!contract) {
      throw new NotFoundException('No active contract found. You must have an active rental contract to view building policies.');
    }

    const buildingId = contract.apartments.buildings.id;
    const buildingName = contract.apartments.buildings.name;

    // Get the current active policy for this building (effective_to IS NULL = current policy)
    const policy = await this.prisma.building_policies.findFirst({
      where: {
        building_id: buildingId,
        effective_to: null,
      },
      orderBy: { effective_from: 'desc' },
    });

    if (!policy) {
      return {
        buildingId,
        buildingName,
        policy: null,
      };
    }

    // Map to frontend-friendly format
    return {
      buildingId,
      buildingName,
      policy: {
        id: policy.id,
        buildingId: policy.building_id,
        
        // Basic occupancy
        defaultMaxResidents: policy.default_max_residents,
        accessCardLimitDefault: policy.access_card_limit_default,
        petAllowed: policy.pet_allowed,
        petLimitDefault: policy.pet_limit_default,
        petRules: policy.pet_rules,
        
        // Quiet hours
        quietHoursStart: policy.quiet_hours_start,
        quietHoursEnd: policy.quiet_hours_end,
        noiseComplaintProcess: policy.noise_complaint_process,
        
        // Amenities - Pool
        poolAvailable: policy.pool_available,
        poolHours: policy.pool_hours,
        poolFeePerMonth: policy.pool_fee_per_month ? Number(policy.pool_fee_per_month) : null,
        
        // Amenities - Gym
        gymAvailable: policy.gym_available,
        gymHours: policy.gym_hours,
        gymFeePerMonth: policy.gym_fee_per_month ? Number(policy.gym_fee_per_month) : null,
        gymBookingRequired: policy.gym_booking_required,
        
        // Amenities - Sports
        sportsCourtAvailable: policy.sports_court_available,
        sportsCourtHours: policy.sports_court_hours,
        sportsCourtBookingRules: policy.sports_court_booking_rules,
        
        // Guest policies
        guestRegistrationRequired: policy.guest_registration_required,
        guestParkingRules: policy.guest_parking_rules,
        visitorHours: policy.visitor_hours,
        
        // Parking fees
        motorcycleParkingFee: policy.motorcycle_parking_fee ? Number(policy.motorcycle_parking_fee) : null,
        carParkingFee: policy.car_parking_fee ? Number(policy.car_parking_fee) : null,
        
        // Renovation
        renovationApprovalRequired: policy.renovation_approval_required,
        renovationAllowedHours: policy.renovation_allowed_hours,
        renovationApprovalProcess: policy.renovation_approval_process,
        renovationDeposit: policy.renovation_deposit ? Number(policy.renovation_deposit) : null,
        
        // Access cards
        accessCardReplacementFee: policy.access_card_replacement_fee ? Number(policy.access_card_replacement_fee) : null,
        accessCardReplacementProcess: policy.access_card_replacement_process,
        
        // Package pickup
        packagePickupLocation: policy.package_pickup_location,
        packagePickupHours: policy.package_pickup_hours,
        packageHoldingDays: policy.package_holding_days,
        
        // Emergency
        emergencyContacts: policy.emergency_contacts,
        managementOfficeHours: policy.management_office_hours,
        security24hPhone: policy.security_24h_phone,
        
        // Billing
        defaultBillingCycle: policy.default_billing_cycle,
        paymentDueDay: policy.payment_due_day,
        lateFeeRatePercent: policy.late_fee_rate_percent ? Number(policy.late_fee_rate_percent) : null,
        lateFeeGraceDays: policy.late_fee_grace_days,
        
        // Trash
        trashCollectionDays: policy.trash_collection_days,
        trashCollectionTime: policy.trash_collection_time,
        trashFeePerMonth: policy.trash_fee_per_month ? Number(policy.trash_fee_per_month) : null,
        
        // Move in/out
        moveAllowedHours: policy.move_allowed_hours,
        moveElevatorBookingRequired: policy.move_elevator_booking_required,
        moveDeposit: policy.move_deposit ? Number(policy.move_deposit) : null,
        
        // Meta
        effectiveFrom: policy.effective_from.toISOString(),
        effectiveTo: policy.effective_to?.toISOString() || null,
        isCurrent: policy.effective_to === null,
        createdBy: policy.created_by,
        createdAt: policy.created_at.toISOString(),
      },
    };
  }

  private toResponseDto(building: buildings): BuildingResponseDto {
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
