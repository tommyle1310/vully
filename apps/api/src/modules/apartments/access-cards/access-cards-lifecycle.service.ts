import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AccessCardStatus } from '@prisma/client';
import {
  DeactivateAccessCardDto,
  DeactivationReason,
  AccessCardResponseDto,
} from '../dto/access-card.dto';
import { AccessCardsHelpersService } from './access-cards-helpers.service';
import { toAccessCardResponseDto } from './access-cards.mapper';

@Injectable()
export class AccessCardsLifecycleService {
  private readonly logger = new Logger(AccessCardsLifecycleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly helpers: AccessCardsHelpersService,
  ) {}

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
    await this.helpers.createAuditLog(
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

    return toAccessCardResponseDto(card);
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
    await this.helpers.validateCardLimit(
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
    await this.helpers.createAuditLog(
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

    return toAccessCardResponseDto(card);
  }

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
}
