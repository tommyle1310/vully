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
        grossArea: dto.grossArea,
        bedroomCount: dto.bedroomCount,
        bathroomCount: dto.bathroomCount,
      },
    });

    const apartment = await this.prisma.apartment.create({
      data: {
        buildingId: dto.buildingId,
        unitNumber: dto.unitNumber,
        floorIndex: dto.floorIndex,
        apartmentCode: dto.apartmentCode ?? null,
        floorLabel: dto.floorLabel ?? null,
        unitType: dto.unitType ?? null,
        netArea: dto.netArea !== undefined ? dto.netArea : null,
        grossArea: dto.grossArea !== undefined ? dto.grossArea : null,
        ceilingHeight: dto.ceilingHeight !== undefined ? dto.ceilingHeight : null,
        bedroomCount: dto.bedroomCount ?? 1,
        bathroomCount: dto.bathroomCount ?? 1,
        features: (dto.features || {}) as Prisma.InputJsonValue,
        svgElementId: dto.svgElementId ?? null,
        svgPathData: dto.svgPathData ?? null,
        centroidX: dto.centroidX !== undefined ? dto.centroidX : null,
        centroidY: dto.centroidY !== undefined ? dto.centroidY : null,
        orientation: dto.orientation ?? null,
        balconyDirection: dto.balconyDirection ?? null,
        isCornerUnit: dto.isCornerUnit ?? false,
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
        grossArea: apartment.grossArea,
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
    if (filters.floor) where.floorIndex = filters.floor;
    if (filters.minBedrooms) where.bedroomCount = { gte: filters.minBedrooms };
    if (filters.unitType) where.unitType = filters.unitType;
    if (filters.orientation) where.orientation = filters.orientation;
    if (filters.ownerId) where.ownerId = filters.ownerId;

    const [apartments, total] = await Promise.all([
      this.prisma.apartment.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ buildingId: 'asc' }, { floorIndex: 'asc' }, { unitNumber: 'asc' }],
        include: {
          building: {
            select: { id: true, name: true, address: true },
          },
        },
      }),
      this.prisma.apartment.count({ where }),
    ]);

    return {
      data: apartments.map((a) => this.toResponseDto(a)),
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
        grossArea: dto.grossArea,
        bedroomCount: dto.bedroomCount,
        bathroomCount: dto.bathroomCount,
      },
    });

    const updateData: Prisma.ApartmentUpdateInput = {};

    // Spatial
    if (dto.unitNumber !== undefined) updateData.unitNumber = dto.unitNumber;
    if (dto.floorIndex !== undefined) updateData.floorIndex = dto.floorIndex;
    if (dto.apartmentCode !== undefined) updateData.apartmentCode = dto.apartmentCode;
    if (dto.floorLabel !== undefined) updateData.floorLabel = dto.floorLabel;
    if (dto.unitType !== undefined) updateData.unitType = dto.unitType;
    if (dto.netArea !== undefined) updateData.netArea = dto.netArea;
    if (dto.grossArea !== undefined) updateData.grossArea = dto.grossArea;
    if (dto.ceilingHeight !== undefined) updateData.ceilingHeight = dto.ceilingHeight;
    if (dto.bedroomCount !== undefined) updateData.bedroomCount = dto.bedroomCount;
    if (dto.bathroomCount !== undefined) updateData.bathroomCount = dto.bathroomCount;
    if (dto.features !== undefined) updateData.features = dto.features as Prisma.InputJsonValue;
    if (dto.svgElementId !== undefined) updateData.svgElementId = dto.svgElementId;
    if (dto.svgPathData !== undefined) updateData.svgPathData = dto.svgPathData;
    if (dto.centroidX !== undefined) updateData.centroidX = dto.centroidX;
    if (dto.centroidY !== undefined) updateData.centroidY = dto.centroidY;
    if (dto.orientation !== undefined) updateData.orientation = dto.orientation;
    if (dto.balconyDirection !== undefined) updateData.balconyDirection = dto.balconyDirection;
    if (dto.isCornerUnit !== undefined) updateData.isCornerUnit = dto.isCornerUnit;
    if (dto.status !== undefined) updateData.status = dto.status;

    // Ownership & Legal
    if (dto.ownerId !== undefined) updateData.owner = dto.ownerId ? { connect: { id: dto.ownerId } } : { disconnect: true };
    if (dto.ownershipType !== undefined) updateData.ownershipType = dto.ownershipType;
    if (dto.pinkBookId !== undefined) updateData.pinkBookId = dto.pinkBookId;
    if (dto.handoverDate !== undefined) updateData.handoverDate = dto.handoverDate ? new Date(dto.handoverDate) : null;
    if (dto.warrantyExpiryDate !== undefined) updateData.warrantyExpiryDate = dto.warrantyExpiryDate ? new Date(dto.warrantyExpiryDate) : null;
    if (dto.isRented !== undefined) updateData.isRented = dto.isRented;
    if (dto.vatRate !== undefined) updateData.vatRate = dto.vatRate;

    // Occupancy
    if (dto.maxResidents !== undefined) updateData.maxResidents = dto.maxResidents;
    if (dto.currentResidentCount !== undefined) updateData.currentResidentCount = dto.currentResidentCount;
    if (dto.petAllowed !== undefined) updateData.petAllowed = dto.petAllowed;
    if (dto.petLimit !== undefined) updateData.petLimit = dto.petLimit;
    if (dto.accessCardLimit !== undefined) updateData.accessCardLimit = dto.accessCardLimit;
    if (dto.intercomCode !== undefined) updateData.intercomCode = dto.intercomCode;

    // Utility & Technical
    if (dto.electricMeterId !== undefined) updateData.electricMeterId = dto.electricMeterId;
    if (dto.waterMeterId !== undefined) updateData.waterMeterId = dto.waterMeterId;
    if (dto.gasMeterId !== undefined) updateData.gasMeterId = dto.gasMeterId;
    if (dto.powerCapacity !== undefined) updateData.powerCapacity = dto.powerCapacity;
    if (dto.acUnitCount !== undefined) updateData.acUnitCount = dto.acUnitCount;
    if (dto.fireDetectorId !== undefined) updateData.fireDetectorId = dto.fireDetectorId;
    if (dto.sprinklerCount !== undefined) updateData.sprinklerCount = dto.sprinklerCount;
    if (dto.internetTerminalLoc !== undefined) updateData.internetTerminalLoc = dto.internetTerminalLoc;

    // Parking & Assets
    if (dto.assignedCarSlot !== undefined) updateData.assignedCarSlot = dto.assignedCarSlot;
    if (dto.assignedMotoSlot !== undefined) updateData.assignedMotoSlot = dto.assignedMotoSlot;
    if (dto.mailboxNumber !== undefined) updateData.mailboxNumber = dto.mailboxNumber;
    if (dto.storageUnitId !== undefined) updateData.storageUnitId = dto.storageUnitId;

    // Billing Config
    if (dto.mgmtFeeConfigId !== undefined) updateData.mgmtFeeConfig = dto.mgmtFeeConfigId ? { connect: { id: dto.mgmtFeeConfigId } } : { disconnect: true };
    if (dto.billingStartDate !== undefined) updateData.billingStartDate = dto.billingStartDate ? new Date(dto.billingStartDate) : null;
    if (dto.billingCycle !== undefined) updateData.billingCycle = dto.billingCycle;
    if (dto.bankAccountVirtual !== undefined) updateData.bankAccountVirtual = dto.bankAccountVirtual;
    if (dto.lateFeeWaived !== undefined) updateData.lateFeeWaived = dto.lateFeeWaived;

    // System Logic
    if (dto.parentUnitId !== undefined) updateData.parentUnit = dto.parentUnitId ? { connect: { id: dto.parentUnitId } } : { disconnect: true };
    if (dto.isMerged !== undefined) updateData.isMerged = dto.isMerged;
    if (dto.syncStatus !== undefined) updateData.syncStatus = dto.syncStatus;
    if (dto.portalAccessEnabled !== undefined) updateData.portalAccessEnabled = dto.portalAccessEnabled;
    if (dto.technicalDrawingUrl !== undefined) updateData.technicalDrawingUrl = dto.technicalDrawingUrl;
    if (dto.notesAdmin !== undefined) updateData.notesAdmin = dto.notesAdmin;

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
  toResponseDto(apartment: Record<string, unknown>, options?: { includeAdminFields?: boolean }): ApartmentResponseDto {
    const building = apartment.building as { id: string; name: string; address: string } | undefined;
    const toNum = (v: unknown) => (v != null ? Number(v) : null);
    const toStr = (v: unknown) => (v != null ? String(v) : null);
    const toDate = (v: unknown) => (v instanceof Date ? v.toISOString().split('T')[0] : v != null ? String(v) : null);

    const result: ApartmentResponseDto = {
      id: apartment.id as string,
      buildingId: apartment.buildingId as string,
      unitNumber: apartment.unitNumber as string,
      floorIndex: apartment.floorIndex as number,
      status: apartment.status as string,
      apartmentCode: toStr(apartment.apartmentCode),
      floorLabel: toStr(apartment.floorLabel),
      unitType: toStr(apartment.unitType),
      netArea: toNum(apartment.netArea),
      grossArea: toNum(apartment.grossArea),
      ceilingHeight: toNum(apartment.ceilingHeight),
      bedroomCount: apartment.bedroomCount as number,
      bathroomCount: apartment.bathroomCount as number,
      features: (apartment.features as Record<string, unknown>) || {},
      svgElementId: toStr(apartment.svgElementId),
      svgPathData: toStr(apartment.svgPathData),
      centroidX: toNum(apartment.centroidX),
      centroidY: toNum(apartment.centroidY),
      orientation: toStr(apartment.orientation),
      balconyDirection: toStr(apartment.balconyDirection),
      isCornerUnit: apartment.isCornerUnit as boolean,
      // Ownership
      ownerId: toStr(apartment.ownerId),
      ownershipType: toStr(apartment.ownershipType),
      handoverDate: toDate(apartment.handoverDate),
      warrantyExpiryDate: toDate(apartment.warrantyExpiryDate),
      isRented: apartment.isRented as boolean,
      vatRate: toNum(apartment.vatRate),
      // Occupancy
      maxResidents: apartment.maxResidents as number | null,
      currentResidentCount: apartment.currentResidentCount as number,
      petAllowed: apartment.petAllowed as boolean | null,
      petLimit: apartment.petLimit as number | null,
      accessCardLimit: apartment.accessCardLimit as number | null,
      intercomCode: toStr(apartment.intercomCode),
      // Utility & Technical
      electricMeterId: toStr(apartment.electricMeterId),
      waterMeterId: toStr(apartment.waterMeterId),
      gasMeterId: toStr(apartment.gasMeterId),
      powerCapacity: apartment.powerCapacity as number | null,
      acUnitCount: apartment.acUnitCount as number | null,
      fireDetectorId: toStr(apartment.fireDetectorId),
      sprinklerCount: apartment.sprinklerCount as number | null,
      internetTerminalLoc: toStr(apartment.internetTerminalLoc),
      // Parking & Assets
      assignedCarSlot: toStr(apartment.assignedCarSlot),
      assignedMotoSlot: toStr(apartment.assignedMotoSlot),
      mailboxNumber: toStr(apartment.mailboxNumber),
      storageUnitId: toStr(apartment.storageUnitId),
      // Billing Config
      mgmtFeeConfigId: toStr(apartment.mgmtFeeConfigId),
      billingStartDate: toDate(apartment.billingStartDate),
      billingCycle: (apartment.billingCycle as string) || 'monthly',
      bankAccountVirtual: toStr(apartment.bankAccountVirtual),
      lateFeeWaived: apartment.lateFeeWaived as boolean,
      // System Logic
      parentUnitId: toStr(apartment.parentUnitId),
      isMerged: apartment.isMerged as boolean,
      syncStatus: (apartment.syncStatus as string) || 'disconnected',
      portalAccessEnabled: apartment.portalAccessEnabled as boolean,
      technicalDrawingUrl: toStr(apartment.technicalDrawingUrl),
      // Meta
      createdAt: apartment.createdAt as Date,
      updatedAt: apartment.updatedAt as Date,
      building,
    };

    // Admin-only fields: pinkBookId and notesAdmin excluded by default
    // Only include when explicitly requested (admin role check done in controller)

    return result;
  }
}
