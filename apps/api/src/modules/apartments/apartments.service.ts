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
    const building = await this.prisma.buildings.findUnique({
      where: { id: dto.buildingId },
    });

    if (!building) {
      throw new NotFoundException('Building not found');
    }

    this.logger.debug({
      event: 'apartment_create_input',
      dto: {
        grossArea: dto.grossArea,
        bedroomCount: dto.bedroomCount,
        bathroomCount: dto.bathroomCount,
      },
    });

    const apartment = await this.prisma.apartments.create({
      data: {
        building_id: dto.buildingId,
        unit_number: dto.unit_number,
        floor_index: dto.floorIndex,
        apartment_code: dto.apartmentCode ?? null,
        floor_label: dto.floorLabel ?? null,
        unit_type: dto.unitType ?? null,
        net_area: dto.netArea !== undefined ? dto.netArea : null,
        gross_area: dto.grossArea !== undefined ? dto.grossArea : null,
        ceiling_height: dto.ceilingHeight !== undefined ? dto.ceilingHeight : null,
        bedroom_count: dto.bedroomCount ?? 1,
        bathroom_count: dto.bathroomCount ?? 1,
        features: (dto.features || {}) as Prisma.InputJsonValue,
        svg_element_id: dto.svgElementId ?? null,
        svg_path_data: dto.svgPathData ?? null,
        centroid_x: dto.centroidX !== undefined ? dto.centroidX : null,
        centroid_y: dto.centroidY !== undefined ? dto.centroidY : null,
        orientation: dto.orientation ?? null,
        balcony_direction: dto.balconyDirection ?? null,
        is_corner_unit: dto.isCornerUnit ?? false,
        status: 'vacant',
        updated_at: new Date(),
      },
      include: {
        buildings: {
          select: { id: true, name: true, address: true },
        },
      },
    });

    this.logger.log({
      event: 'apartment_created',
      apartmentId: apartment.id,
      buildingId: dto.buildingId,
      unit_number: dto.unit_number,
      storedValues: {
        grossArea: apartment.gross_area,
        bedroomCount: apartment.bedroom_count,
        bathroomCount: apartment.bathroom_count,
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
    if (filters.buildingId) where.building_id = filters.buildingId;
    if (filters.status) where.status = filters.status;
    if (filters.floor) where.floor_index = filters.floor;
    if (filters.minBedrooms) where.bedroom_count = { gte: filters.minBedrooms };
    if (filters.unitType) where.unit_type = filters.unitType;
    if (filters.orientation) where.orientation = filters.orientation;
    if (filters.ownerId) where.owner_id = filters.ownerId;

    const [apartments, total] = await Promise.all([
      this.prisma.apartments.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ building_id: 'asc' }, { floor_index: 'asc' }, { unit_number: 'asc' }],
        include: {
          buildings: {
            select: { id: true, name: true, address: true },
          },
          users: {
            select: { id: true, first_name: true, last_name: true, email: true },
          },
          contracts: {
            where: { status: 'active' },
            take: 1,
            orderBy: { created_at: 'desc' },
            include: {
              users_contracts_tenant_idTousers: {
                select: { id: true, first_name: true, last_name: true, email: true },
              },
            },
          },
        },
      }),
      this.prisma.apartments.count({ where }),
    ]);

    return {
      data: apartments.map((a: any) => this.toResponseDto(a)),
      total,
    };
  }

  async findOne(id: string): Promise<ApartmentResponseDto> {
    const apartment = await this.prisma.apartments.findUnique({
      where: { id },
      include: {
        buildings: {
          select: { id: true, name: true, address: true },
        },
        users: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
        contracts: {
          where: { status: 'active' },
          take: 1,
          orderBy: { created_at: 'desc' },
          include: {
            users_contracts_tenant_idTousers: {
              select: { id: true, first_name: true, last_name: true, email: true },
            },
          },
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
    const contract = await this.prisma.contracts.findFirst({
      where: {
        tenant_id: residentId,
        status: 'active',
      },
      include: {
        apartments: {
          include: {
            buildings: {
              select: { id: true, name: true, address: true },
            },
          },
        },
      },
    });

    if (!contract) {
      return null;
    }

    return this.toResponseDto(contract.apartments);
  }

  async findOneForResident(
    id: string,
    residentId: string,
  ): Promise<ApartmentResponseDto> {
    const apartment = await this.findOne(id);

    // Check if resident has active contract for this apartment
    const contract = await this.prisma.contracts.findFirst({
      where: {
        apartment_id: id,
        tenant_id: residentId,
        status: 'active',
      },
    });

    if (!contract) {
      throw new ForbiddenException('You do not have access to this apartment');
    }

    return apartment;
  }

  async update(id: string, dto: UpdateApartmentDto): Promise<ApartmentResponseDto> {
    const apartment = await this.prisma.apartments.findUnique({ where: { id } });

    if (!apartment) {
      throw new NotFoundException('Apartment not found');
    }

    this.logger.debug({
      event: 'apartment_update_input',
      apartmentId: id,
      dto: {
        grossArea: dto.grossArea,
        bedroomCount: dto.bedroomCount,
        bathroomCount: dto.bathroomCount,
      },
    });

    const updateData: Prisma.apartmentsUpdateInput = {};

    // Spatial
    if (dto.unit_number !== undefined) updateData.unit_number = dto.unit_number;
    if (dto.floorIndex !== undefined) updateData.floor_index = dto.floorIndex;
    if (dto.apartmentCode !== undefined) updateData.apartment_code = dto.apartmentCode;
    if (dto.floorLabel !== undefined) updateData.floor_label = dto.floorLabel;
    if (dto.unitType !== undefined) updateData.unit_type = dto.unitType;
    if (dto.netArea !== undefined) updateData.net_area = dto.netArea;
    if (dto.grossArea !== undefined) updateData.gross_area = dto.grossArea;
    if (dto.ceilingHeight !== undefined) updateData.ceiling_height = dto.ceilingHeight;
    if (dto.bedroomCount !== undefined) updateData.bedroom_count = dto.bedroomCount;
    if (dto.bathroomCount !== undefined) updateData.bathroom_count = dto.bathroomCount;
    if (dto.features !== undefined) updateData.features = dto.features as Prisma.InputJsonValue;
    if (dto.svgElementId !== undefined) updateData.svg_element_id = dto.svgElementId;
    if (dto.svgPathData !== undefined) updateData.svg_path_data = dto.svgPathData;
    if (dto.centroidX !== undefined) updateData.centroid_x = dto.centroidX;
    if (dto.centroidY !== undefined) updateData.centroid_y = dto.centroidY;
    if (dto.orientation !== undefined) updateData.orientation = dto.orientation;
    if (dto.balconyDirection !== undefined) updateData.balcony_direction = dto.balconyDirection;
    if (dto.isCornerUnit !== undefined) updateData.is_corner_unit = dto.isCornerUnit;
    if (dto.status !== undefined) updateData.status = dto.status;

    // Ownership & Legal
    if (dto.ownerId !== undefined) updateData.users = dto.ownerId ? { connect: { id: dto.ownerId } } : { disconnect: true };
    if (dto.ownershipType !== undefined) updateData.ownership_type = dto.ownershipType;
    if (dto.pinkBookId !== undefined) updateData.pink_book_id = dto.pinkBookId;
    if (dto.handoverDate !== undefined) updateData.handover_date = dto.handoverDate ? new Date(dto.handoverDate) : null;
    if (dto.warrantyExpiryDate !== undefined) updateData.warranty_expiry_date = dto.warrantyExpiryDate ? new Date(dto.warrantyExpiryDate) : null;
    if (dto.isRented !== undefined) updateData.is_rented = dto.isRented;
    if (dto.vatRate !== undefined) updateData.vat_rate = dto.vatRate;

    // Occupancy
    if (dto.maxResidents !== undefined) updateData.max_residents = dto.maxResidents;
    if (dto.currentResidentCount !== undefined) updateData.current_resident_count = dto.currentResidentCount;
    if (dto.petAllowed !== undefined) updateData.pet_allowed = dto.petAllowed;
    if (dto.petLimit !== undefined) updateData.pet_limit = dto.petLimit;
    if (dto.accessCardLimit !== undefined) updateData.access_card_limit = dto.accessCardLimit;
    if (dto.intercomCode !== undefined) updateData.intercom_code = dto.intercomCode;

    // Utility & Technical
    if (dto.electricMeterId !== undefined) updateData.electric_meter_id = dto.electricMeterId;
    if (dto.waterMeterId !== undefined) updateData.water_meter_id = dto.waterMeterId;
    if (dto.gasMeterId !== undefined) updateData.gas_meter_id = dto.gasMeterId;
    if (dto.powerCapacity !== undefined) updateData.power_capacity = dto.powerCapacity;
    if (dto.acUnitCount !== undefined) updateData.ac_unit_count = dto.acUnitCount;
    if (dto.fireDetectorId !== undefined) updateData.fire_detector_id = dto.fireDetectorId;
    if (dto.sprinklerCount !== undefined) updateData.sprinkler_count = dto.sprinklerCount;
    if (dto.internetTerminalLoc !== undefined) updateData.internet_terminal_loc = dto.internetTerminalLoc;

    // Parking & Assets
    if (dto.assignedCarSlot !== undefined) updateData.assigned_car_slot = dto.assignedCarSlot;
    if (dto.assignedMotoSlot !== undefined) updateData.assigned_moto_slot = dto.assignedMotoSlot;
    if (dto.mailboxNumber !== undefined) updateData.mailbox_number = dto.mailboxNumber;
    if (dto.storageUnitId !== undefined) updateData.storage_unit_id = dto.storageUnitId;

    // Billing Config
    if (dto.mgmtFeeConfigId !== undefined) updateData.management_fee_configs = dto.mgmtFeeConfigId ? { connect: { id: dto.mgmtFeeConfigId } } : { disconnect: true };
    if (dto.billingStartDate !== undefined) updateData.billing_start_date = dto.billingStartDate ? new Date(dto.billingStartDate) : null;
    if (dto.billingCycle !== undefined) updateData.billing_cycle = dto.billingCycle;
    if (dto.bankAccountVirtual !== undefined) updateData.bank_account_virtual = dto.bankAccountVirtual;
    if (dto.lateFeeWaived !== undefined) updateData.late_fee_waived = dto.lateFeeWaived;

    // System Logic
    if (dto.parentUnitId !== undefined) updateData.apartments = dto.parentUnitId ? { connect: { id: dto.parentUnitId } } : { disconnect: true };
    if (dto.isMerged !== undefined) updateData.is_merged = dto.isMerged;
    if (dto.syncStatus !== undefined) updateData.sync_status = dto.syncStatus;
    if (dto.portalAccessEnabled !== undefined) updateData.portal_access_enabled = dto.portalAccessEnabled;
    if (dto.technicalDrawingUrl !== undefined) updateData.technical_drawing_url = dto.technicalDrawingUrl;
    if (dto.notesAdmin !== undefined) updateData.notes_admin = dto.notesAdmin;

    const updated = await this.prisma.apartments.update({
      where: { id },
      data: updateData,
      include: {
        buildings: {
          select: { id: true, name: true, address: true },
        },
      },
    });

    this.logger.log({
      event: 'apartment_updated',
      apartmentId: id,
      status: dto.status,
    });

    return this.toResponseDto(updated);
  }

  async updateStatus(
    id: string,
    status: 'vacant' | 'occupied' | 'maintenance' | 'reserved',
  ): Promise<ApartmentResponseDto> {
    return this.update(id, { status });
  }

  /**
   * Convert Prisma apartment record to response DTO.
   * Strips admin-only fields (pinkBookId, notesAdmin) — caller must handle role-based exclusion.
   */
  toResponseDto(apartments: Record<string, unknown>, options?: { includeAdminFields?: boolean }): ApartmentResponseDto {
    const building = apartments.buildings as { id: string; name: string; address: string } | undefined;
    const ownerData = apartments.users as { id: string; first_name: string; last_name: string; email: string } | null | undefined;
    const contractsData = apartments.contracts as Array<{
      id: string;
      rent_amount: number | { toNumber: () => number };
      start_date: Date;
      end_date: Date | null;
      status: string;
      users_contracts_tenant_idTousers: { id: string; first_name: string; last_name: string; email: string };
    }> | undefined;

    const toNum = (v: unknown) => (v != null ? Number(v) : null);
    const toStr = (v: unknown) => (v != null ? String(v) : null);
    const toDate = (v: unknown) => (v instanceof Date ? v.toISOString().split('T')[0] : v != null ? String(v) : null);

    // Build owner object if available
    const owner = ownerData ? {
      id: ownerData.id,
      firstName: ownerData.first_name,
      lastName: ownerData.last_name,
      email: ownerData.email,
    } : null;

    // Build activeContract object if available
    let activeContract = null;
    if (contractsData && contractsData.length > 0) {
      const contract = contractsData[0];
      const tenant = contract.users_contracts_tenant_idTousers;
      activeContract = {
        id: contract.id,
        tenant: {
          id: tenant.id,
          firstName: tenant.first_name,
          lastName: tenant.last_name,
          email: tenant.email,
        },
        monthlyRent: typeof contract.rent_amount === 'object' && 'toNumber' in contract.rent_amount 
          ? contract.rent_amount.toNumber() 
          : Number(contract.rent_amount),
        startDate: contract.start_date instanceof Date ? contract.start_date.toISOString().split('T')[0] : String(contract.start_date),
        endDate: contract.end_date ? (contract.end_date instanceof Date ? contract.end_date.toISOString().split('T')[0] : String(contract.end_date)) : null,
        status: contract.status,
      };
    }

    const result: ApartmentResponseDto = {
      id: apartments.id as string,
      buildingId: apartments.building_id as string,
      unit_number: apartments.unit_number as string,
      floorIndex: apartments.floor_index as number,
      status: apartments.status as string,
      apartmentCode: toStr(apartments.apartment_code),
      floorLabel: toStr(apartments.floor_label),
      unitType: toStr(apartments.unit_type),
      netArea: toNum(apartments.net_area),
      grossArea: toNum(apartments.gross_area),
      ceilingHeight: toNum(apartments.ceiling_height),
      bedroomCount: apartments.bedroom_count as number,
      bathroomCount: apartments.bathroom_count as number,
      features: (apartments.features as Record<string, unknown>) || {},
      svgElementId: toStr(apartments.svg_element_id),
      svgPathData: toStr(apartments.svg_path_data),
      centroidX: toNum(apartments.centroid_x),
      centroidY: toNum(apartments.centroid_y),
      orientation: toStr(apartments.orientation),
      balconyDirection: toStr(apartments.balcony_direction),
      isCornerUnit: apartments.is_corner_unit as boolean,
      // Ownership
      ownerId: toStr(apartments.owner_id),
      ownershipType: toStr(apartments.ownership_type),
      handoverDate: toDate(apartments.handover_date),
      warrantyExpiryDate: toDate(apartments.warranty_expiry_date),
      isRented: apartments.is_rented as boolean,
      vatRate: toNum(apartments.vat_rate),
      // Occupancy
      maxResidents: apartments.max_residents as number | null,
      currentResidentCount: apartments.current_resident_count as number,
      petAllowed: apartments.pet_allowed as boolean | null,
      petLimit: apartments.pet_limit as number | null,
      accessCardLimit: apartments.access_card_limit as number | null,
      intercomCode: toStr(apartments.intercom_code),
      // Utility & Technical
      electricMeterId: toStr(apartments.electric_meter_id),
      waterMeterId: toStr(apartments.water_meter_id),
      gasMeterId: toStr(apartments.gas_meter_id),
      powerCapacity: apartments.power_capacity as number | null,
      acUnitCount: apartments.ac_unit_count as number | null,
      fireDetectorId: toStr(apartments.fire_detector_id),
      sprinklerCount: apartments.sprinkler_count as number | null,
      internetTerminalLoc: toStr(apartments.internet_terminal_loc),
      // Parking & Assets
      assignedCarSlot: toStr(apartments.assigned_car_slot),
      assignedMotoSlot: toStr(apartments.assigned_moto_slot),
      mailboxNumber: toStr(apartments.mailbox_number),
      storageUnitId: toStr(apartments.storage_unit_id),
      // Billing Config
      mgmtFeeConfigId: toStr(apartments.mgmt_fee_config_id),
      billingStartDate: toDate(apartments.billing_start_date),
      billingCycle: (apartments.billing_cycle as string) || 'monthly',
      bankAccountVirtual: toStr(apartments.bank_account_virtual),
      lateFeeWaived: apartments.late_fee_waived as boolean,
      // System Logic
      parentUnitId: toStr(apartments.parent_unit_id),
      isMerged: apartments.is_merged as boolean,
      syncStatus: (apartments.sync_status as string) || 'disconnected',
      portalAccessEnabled: apartments.portal_access_enabled as boolean,
      technicalDrawingUrl: toStr(apartments.technical_drawing_url),
      // Meta
      created_at: apartments.created_at as Date,
      updatedAt: apartments.updated_at as Date,
      building,
      // Relations
      owner,
      activeContract,
    };

    // Admin-only fields: pinkBookId and notesAdmin excluded by default
    // Only include when explicitly requested (admin role check done in controller)

    return result;
  }
}
