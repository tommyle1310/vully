import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  CreateAccessCardDto,
  UpdateAccessCardDto,
  AccessCardResponseDto,
  AccessCardListResponseDto,
  AccessCardStatsDto,
  AccessCardQueryDto,
} from './dto/access-card.dto';
import { AccessCardsHelpersService } from './access-cards-helpers.service';
import { toAccessCardResponseDto } from './access-cards.mapper';

@Injectable()
export class AccessCardsService {
  private readonly logger = new Logger(AccessCardsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly helpers: AccessCardsHelpersService,
  ) {}

  // =====================
  // List & Find
  // =====================

  async findAllByApartment(
    apartmentId: string,
    query?: AccessCardQueryDto,
  ): Promise<AccessCardListResponseDto> {
    const apartment = await this.helpers.getApartmentWithPolicy(apartmentId);

    const where: Prisma.access_cardsWhereInput = { apartment_id: apartmentId };
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

    const limit = this.helpers.getEffectiveLimit(apartment);

    return {
      data: cards.map((card) => toAccessCardResponseDto(card, apartment)),
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

    return toAccessCardResponseDto(card);
  }

  async getStats(apartmentId: string): Promise<AccessCardStatsDto> {
    const apartment = await this.helpers.getApartmentWithPolicy(apartmentId);

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

    const limit = this.helpers.getEffectiveLimit(apartment);

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
    const apartment = await this.helpers.getApartmentWithPolicy(dto.apartmentId);

    // Auto-generate card number if not provided
    let cardNumber = dto.cardNumber;
    if (!cardNumber) {
      cardNumber = await this.helpers.generateCardNumber(dto.cardType);
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
    await this.helpers.validateCardLimit(dto.apartmentId, dto.cardType);

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
    await this.helpers.createAuditLog(userId, 'access_card.created', card.id, null, {
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

    return toAccessCardResponseDto(card);
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

    return toAccessCardResponseDto(card);
  }
}
