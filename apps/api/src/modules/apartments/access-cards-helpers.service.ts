import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AccessCardType, Prisma } from '@prisma/client';

@Injectable()
export class AccessCardsHelpersService {
  constructor(private readonly prisma: PrismaService) {}

  async getApartmentWithPolicy(apartmentId: string) {
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

  getEffectiveLimit(apartment: {
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
  async generateCardNumber(cardType: AccessCardType): Promise<string> {
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

  async createAuditLog(
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
}
