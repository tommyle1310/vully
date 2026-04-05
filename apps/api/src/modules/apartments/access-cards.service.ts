import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AccessCardType, AccessCardStatus, Prisma } from '@prisma/client';
import {
  CreateAccessCardDto,
  UpdateAccessCardDto,
  DeactivateAccessCardDto,
  DeactivationReason,
  AccessCardResponseDto,
  AccessCardListResponseDto,
  AccessCardStatsDto,
  AccessCardQueryDto,
} from './dto/access-card.dto';

@Injectable()
export class AccessCardsService {
  private readonly logger = new Logger(AccessCardsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // =====================
  // List & Find
  // =====================

  async findAllByApartment(
    apartmentId: string,
    query?: AccessCardQueryDto,
  ): Promise<AccessCardListResponseDto> {
    const apartment = await this.getApartmentWithPolicy(apartmentId);

    const where: Record<string, unknown> = { apartment_id: apartmentId };
    if (query?.status) where.status = query.status;
    if (query?.cardType) where.card_type = query.cardType;

    const [cards, activeCount] = await Promise.all([
      this.prisma.access_cards.findMany({
        where,
        orderBy: [{ status: 'asc' }, { issued_at: 'desc' }],
        include: {
          holder: {
            select: { id: true, first_name: true, last_name: true, email: true },
          },
        },
      }),
      this.prisma.access_cards.count({
        where: {
          apartment_id: apartmentId,
          card_type: 'building',
          status: 'active',
        },
      }),
    ]);

    const limit = this.getEffectiveLimit(apartment);

    return {
      data: cards.map((card) => this.toResponseDto(card, apartment)),
      total: cards.length,
      activeCount,
      limit,
    };
  }

  async findOne(id: string): Promise<AccessCardResponseDto> {
    const card = await this.prisma.access_cards.findUnique({
      where: { id },
      include: {
        apartments: {
          select: {
            id: true,
            unit_number: true,
            buildings: { select: { name: true } },
          },
        },
        holder: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
        deactivated_by_user: {
          select: { id: true, first_name: true, last_name: true },
        },
      },
    });

    if (!card) {
      throw new NotFoundException('Access card not found');
    }

    return this.toResponseDto(card);
  }

  async getStats(apartmentId: string): Promise<AccessCardStatsDto> {
    const apartment = await this.getApartmentWithPolicy(apartmentId);

    const [total, active, lost, deactivated, expired] = await Promise.all([
      this.prisma.access_cards.count({
        where: { apartment_id: apartmentId },
      }),
      this.prisma.access_cards.count({
        where: { apartment_id: apartmentId, card_type: 'building', status: 'active' },
      }),
      this.prisma.access_cards.count({
        where: { apartment_id: apartmentId, status: 'lost' },
      }),
      this.prisma.access_cards.count({
        where: { apartment_id: apartmentId, status: 'deactivated' },
      }),
      this.prisma.access_cards.count({
        where: { apartment_id: apartmentId, status: 'expired' },
      }),
    ]);

    const limit = this.getEffectiveLimit(apartment);

    return {
      total,
      active,
      lost,
      deactivated,
      expired,
      limit,
      available: Math.max(0, limit - active),
    };
  }

  // =====================
  // Create
  // =====================

  async create(
    dto: CreateAccessCardDto,
    userId: string,
  ): Promise<AccessCardResponseDto> {
    // Validate apartment exists
    const apartment = await this.getApartmentWithPolicy(dto.apartmentId);

    // Auto-generate card number if not provided
    let cardNumber = dto.cardNumber;
    if (!cardNumber) {
      cardNumber = await this.generateCardNumber(dto.cardType);
    } else {
      // Check for duplicate card number (only if manually provided)
      const existingCard = await this.prisma.access_cards.findUnique({
        where: { card_number: cardNumber },
      });

      if (existingCard) {
        throw new ConflictException(
          `Card number '${cardNumber}' already exists`,
        );
      }
    }

    // Validate holder if provided
    if (dto.holderId) {
      const holder = await this.prisma.users.findUnique({
        where: { id: dto.holderId },
      });
      if (!holder) {
        throw new NotFoundException('Holder user not found');
      }
    }

    // Enforce card limit for building cards
    await this.validateCardLimit(dto.apartmentId, dto.cardType);

    // Default access zones
    const accessZones = dto.accessZones ?? ['lobby', 'elevator'];

    // Default floor access (all floors in building)
    let floorAccess = dto.floorAccess;
    if (!floorAccess) {
      const floorCount = apartment.buildings?.floor_count ?? 1;
      floorAccess = Array.from({ length: floorCount }, (_, i) => i + 1);
    }

    const card = await this.prisma.access_cards.create({
      data: {
        card_number: cardNumber,
        apartment_id: dto.apartmentId,
        holder_id: dto.holderId,
        card_type: dto.cardType,
        access_zones: accessZones,
        floor_access: floorAccess,
        expires_at: dto.expiresAt ? new Date(dto.expiresAt) : null,
        notes: dto.notes,
        updated_at: new Date(),
      },
      include: {
        apartments: {
          select: {
            id: true,
            unit_number: true,
            buildings: { select: { name: true } },
          },
        },
        holder: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
      },
    });

    // Create audit log
    await this.createAuditLog(userId, 'access_card.created', card.id, null, {
      cardNumber: card.card_number,
      apartmentId: card.apartment_id,
      cardType: card.card_type,
    });

    this.logger.log({
      event: 'access_card_created',
      cardId: card.id,
      cardNumber: card.card_number,
      apartmentId: card.apartment_id,
      cardType: card.card_type,
      userId,
    });

    return this.toResponseDto(card);
  }

  // =====================
  // Update
  // =====================

  async update(
    id: string,
    dto: UpdateAccessCardDto,
  ): Promise<AccessCardResponseDto> {
    const existingCard = await this.prisma.access_cards.findUnique({
      where: { id },
    });

    if (!existingCard) {
      throw new NotFoundException('Access card not found');
    }

    const card = await this.prisma.access_cards.update({
      where: { id },
      data: {
        access_zones: dto.accessZones,
        floor_access: dto.floorAccess,
        expires_at: dto.expiresAt !== undefined
          ? dto.expiresAt
            ? new Date(dto.expiresAt)
            : null
          : undefined,
        notes: dto.notes,
        updated_at: new Date(),
      },
      include: {
        apartments: {
          select: {
            id: true,
            unit_number: true,
            buildings: { select: { name: true } },
          },
        },
        holder: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
      },
    });

    this.logger.log({
      event: 'access_card_updated',
      cardId: card.id,
      cardNumber: card.card_number,
    });

    return this.toResponseDto(card);
  }

  // =====================
  // Deactivate / Reactivate
  // =====================

  async deactivate(
    id: string,
    dto: DeactivateAccessCardDto,
    userId: string,
  ): Promise<AccessCardResponseDto> {
    const existingCard = await this.prisma.access_cards.findUnique({
      where: { id },
      include: { parking_slot: true },
    });

    if (!existingCard) {
      throw new NotFoundException('Access card not found');
    }

    if (existingCard.status !== 'active') {
      throw new BadRequestException(
        `Cannot deactivate card with status '${existingCard.status}'`,
      );
    }

    // Determine new status based on reason
    const newStatus: AccessCardStatus =
      dto.reason === DeactivationReason.lost ? 'lost' : 'deactivated';

    // Build notes with reason
    const deactivationNotes = dto.notes
      ? `${dto.reason}: ${dto.notes}`
      : `Deactivated: ${dto.reason}`;

    // Use transaction to update card and unlink from parking slot if needed
    const card = await this.prisma.$transaction(async (tx) => {
      // Unlink from parking slot if linked
      if (existingCard.parking_slot) {
        await tx.parking_slots.update({
          where: { id: existingCard.parking_slot.id },
          data: {
            access_card_id: null,
            updated_at: new Date(),
          },
        });
      }

      return tx.access_cards.update({
        where: { id },
        data: {
          status: newStatus,
          deactivated_at: new Date(),
          deactivated_by: userId,
          notes: deactivationNotes,
          updated_at: new Date(),
        },
        include: {
          apartments: {
            select: {
              id: true,
              unit_number: true,
              buildings: { select: { name: true } },
            },
          },
          holder: {
            select: { id: true, first_name: true, last_name: true, email: true },
          },
        },
      });
    });

    // Create audit log
    await this.createAuditLog(
      userId,
      'access_card.deactivated',
      card.id,
      { status: existingCard.status },
      { status: newStatus, reason: dto.reason },
    );

    this.logger.log({
      event: 'access_card_deactivated',
      cardId: card.id,
      cardNumber: card.card_number,
      reason: dto.reason,
      newStatus,
      userId,
    });

    return this.toResponseDto(card);
  }

  async reactivate(id: string, userId: string): Promise<AccessCardResponseDto> {
    const existingCard = await this.prisma.access_cards.findUnique({
      where: { id },
    });

    if (!existingCard) {
      throw new NotFoundException('Access card not found');
    }

    if (existingCard.status === 'active') {
      throw new BadRequestException('Card is already active');
    }

    if (existingCard.status === 'expired') {
      throw new BadRequestException(
        'Expired cards cannot be reactivated. Issue a new card.',
      );
    }

    // Check if reactivating would exceed limit
    await this.validateCardLimit(
      existingCard.apartment_id,
      existingCard.card_type,
    );

    const card = await this.prisma.access_cards.update({
      where: { id },
      data: {
        status: 'active',
        deactivated_at: null,
        deactivated_by: null,
        updated_at: new Date(),
      },
      include: {
        apartments: {
          select: {
            id: true,
            unit_number: true,
            buildings: { select: { name: true } },
          },
        },
        holder: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
      },
    });

    // Create audit log
    await this.createAuditLog(
      userId,
      'access_card.reactivated',
      card.id,
      { status: existingCard.status },
      { status: 'active' },
    );

    this.logger.log({
      event: 'access_card_reactivated',
      cardId: card.id,
      cardNumber: card.card_number,
      previousStatus: existingCard.status,
      userId,
    });

    return this.toResponseDto(card);
  }

  // =====================
  // Parking Integration
  // =====================

  async linkParkingCard(
    slotId: string,
    cardId: string,
  ): Promise<void> {
    const card = await this.prisma.access_cards.findUnique({
      where: { id: cardId },
    });

    if (!card) {
      throw new NotFoundException('Access card not found');
    }

    if (card.card_type !== 'parking') {
      throw new BadRequestException('Only parking cards can be linked to slots');
    }

    await this.prisma.parking_slots.update({
      where: { id: slotId },
      data: {
        access_card_id: cardId,
        updated_at: new Date(),
      },
    });

    this.logger.log({
      event: 'parking_card_linked',
      cardId,
      slotId,
    });
  }

  async unlinkParkingCard(slotId: string, userId: string): Promise<void> {
    const slot = await this.prisma.parking_slots.findUnique({
      where: { id: slotId },
      include: { access_card: true },
    });

    if (!slot?.access_card) {
      return; // No card to unlink
    }

    // Deactivate the card and unlink
    await this.prisma.$transaction([
      this.prisma.access_cards.update({
        where: { id: slot.access_card.id },
        data: {
          status: 'deactivated',
          deactivated_at: new Date(),
          deactivated_by: userId,
          notes: 'Deactivated: parking slot unassigned',
          updated_at: new Date(),
        },
      }),
      this.prisma.parking_slots.update({
        where: { id: slotId },
        data: {
          access_card_id: null,
          updated_at: new Date(),
        },
      }),
    ]);

    this.logger.log({
      event: 'parking_card_unlinked',
      cardId: slot.access_card.id,
      slotId,
      userId,
    });
  }

  // =====================
  // Helpers
  // =====================

  private async getApartmentWithPolicy(apartmentId: string) {
    const apartment = await this.prisma.apartments.findUnique({
      where: { id: apartmentId },
      include: {
        buildings: {
          select: {
            id: true,
            name: true,
            floor_count: true,
            building_policies: {
              where: {
                effective_to: null, // Current policy
              },
              take: 1,
            },
          },
        },
      },
    });

    if (!apartment) {
      throw new NotFoundException('Apartment not found');
    }

    return apartment;
  }

  private getEffectiveLimit(apartment: {
    access_card_limit?: number | null;
    access_card_limit_override?: number | null;
    buildings?: {
      building_policies?: Array<{ access_card_limit_default?: number }>;
    };
  }): number {
    // Priority: apartment override > building policy > system default
    const aptOverride = apartment.access_card_limit_override ?? apartment.access_card_limit;
    if (aptOverride !== null && aptOverride !== undefined) {
      return aptOverride;
    }

    const buildingPolicy = apartment.buildings?.building_policies?.[0];
    if (buildingPolicy?.access_card_limit_default) {
      return buildingPolicy.access_card_limit_default;
    }

    return 4; // System default
  }

  async validateCardLimit(
    apartmentId: string,
    cardType: AccessCardType,
  ): Promise<void> {
    // Only building cards count toward limit
    if (cardType !== 'building') return;

    const apartment = await this.getApartmentWithPolicy(apartmentId);
    const effectiveLimit = this.getEffectiveLimit(apartment);

    const activeCount = await this.prisma.access_cards.count({
      where: {
        apartment_id: apartmentId,
        card_type: 'building',
        status: 'active',
      },
    });

    if (activeCount >= effectiveLimit) {
      throw new ConflictException(
        `Card limit reached (${activeCount}/${effectiveLimit}). Deactivate a card first.`,
      );
    }
  }

  /**
   * Auto-generate a unique card number
   * Format: AC-YYYYMM-XXXXX (building) or PC-YYYYMM-XXXXX (parking)
   */
  private async generateCardNumber(cardType: AccessCardType): Promise<string> {
    const prefix = cardType === 'parking' ? 'PC' : 'AC';
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    // Find the highest sequence number for this month
    const latestCard = await this.prisma.access_cards.findFirst({
      where: {
        card_number: {
          startsWith: `${prefix}-${yearMonth}-`,
        },
      },
      orderBy: { card_number: 'desc' },
    });

    let sequence = 1;
    if (latestCard) {
      const parts = latestCard.card_number.split('-');
      if (parts.length === 3) {
        sequence = parseInt(parts[2], 10) + 1;
      }
    }

    return `${prefix}-${yearMonth}-${String(sequence).padStart(5, '0')}`;
  }

  private async createAuditLog(
    userId: string,
    action: string,
    resourceId: string,
    oldValues: Record<string, unknown> | null,
    newValues: Record<string, unknown>,
  ): Promise<void> {
    await this.prisma.audit_logs.create({
      data: {
        actor_id: userId,
        action,
        resource_type: 'access_cards',
        resource_id: resourceId,
        old_values: oldValues === null ? Prisma.JsonNull : (oldValues as Prisma.InputJsonValue),
        new_values: newValues as Prisma.InputJsonValue,
      },
    });
  }

  private toResponseDto(
    card: {
      id: string;
      card_number: string;
      apartment_id: string;
      holder_id: string | null;
      card_type: AccessCardType;
      status: AccessCardStatus;
      access_zones: string[];
      floor_access: number[];
      issued_at: Date;
      expires_at: Date | null;
      deactivated_at: Date | null;
      deactivated_by: string | null;
      notes: string | null;
      created_at: Date;
      updated_at: Date;
      apartments?: {
        id: string;
        unit_number: string;
        buildings?: { name: string };
      };
      holder?: {
        id: string;
        first_name: string;
        last_name: string;
        email?: string;
      } | null;
    },
    apartmentData?: {
      unit_number?: string;
      buildings?: { name?: string };
    },
  ): AccessCardResponseDto {
    return {
      id: card.id,
      cardNumber: card.card_number,
      apartmentId: card.apartment_id,
      apartment: card.apartments
        ? {
            id: card.apartments.id,
            unitNumber: card.apartments.unit_number,
            buildingName: card.apartments.buildings?.name,
          }
        : apartmentData
          ? {
              id: card.apartment_id,
              unitNumber: apartmentData.unit_number ?? '',
              buildingName: apartmentData.buildings?.name,
            }
          : undefined,
      holderId: card.holder_id,
      holder: card.holder
        ? {
            id: card.holder.id,
            firstName: card.holder.first_name,
            lastName: card.holder.last_name,
            email: card.holder.email,
          }
        : null,
      cardType: card.card_type,
      status: card.status,
      accessZones: card.access_zones,
      floorAccess: card.floor_access,
      issuedAt: card.issued_at.toISOString(),
      expiresAt: card.expires_at?.toISOString() ?? null,
      deactivatedAt: card.deactivated_at?.toISOString() ?? null,
      deactivatedBy: card.deactivated_by,
      notes: card.notes,
      createdAt: card.created_at.toISOString(),
      updatedAt: card.updated_at.toISOString(),
    };
  }
}
