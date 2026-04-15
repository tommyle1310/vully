import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AccessCardsService } from '../access-cards/access-cards.service';
import {
  AccessCardRequestQueryDto,
  AccessCardRequestResponseDto,
  AccessCardRequestStatusDto,
  ApproveAccessCardRequestDto,
  CreateAccessCardRequestDto,
  RejectAccessCardRequestDto,
} from '../dto/access-card-request.dto';

const ACCESS_CARD_REQUEST_STATUS = {
  pending: 'pending',
  approved: 'approved',
  rejected: 'rejected',
} as const;

type AccessCardRequestRecord = {
  id: string;
  apartment_id: string;
  requested_by: string;
  card_type: 'building' | 'parking';
  reason: string;
  status: string;
  reviewed_by: string | null;
  reviewed_at: Date | null;
  review_note: string | null;
  issued_card_id: string | null;
  created_at: Date;
  updated_at: Date;
  apartments?: {
    id: string;
    unit_number: string;
    buildings?: { name: string };
  };
  requester?: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string | null;
  };
  reviewer?: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string | null;
  } | null;
  issued_access_card?: {
    id: string;
    card_number: string;
  } | null;
};

@Injectable()
export class AccessCardRequestsService {
  private readonly logger = new Logger(AccessCardRequestsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly accessCardsService: AccessCardsService,
  ) {}

  async create(
    apartmentId: string,
    dto: CreateAccessCardRequestDto,
    requesterId: string,
  ): Promise<AccessCardRequestResponseDto> {
    const apartment = await this.prisma.apartments.findUnique({
      where: { id: apartmentId },
      select: { id: true },
    });

    if (!apartment) {
      throw new NotFoundException('Apartment not found');
    }

    const request = await this.prisma.access_card_requests.create({
      data: {
        apartment_id: apartmentId,
        requested_by: requesterId,
        card_type: dto.cardType,
        reason: dto.reason,
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
        requester: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
        reviewer: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
        issued_access_card: {
          select: { id: true, card_number: true },
        },
      },
    });

    this.logger.log({
      event: 'access_card_request_created',
      requestId: request.id,
      apartmentId,
      requesterId,
      cardType: dto.cardType,
    });

    return this.toResponseDto(request as AccessCardRequestRecord);
  }

  async findAll(
    query: AccessCardRequestQueryDto,
  ): Promise<{ data: AccessCardRequestResponseDto[]; total: number }> {
    const where = query.status ? { status: query.status } : undefined;

    const requests = await this.prisma.access_card_requests.findMany({
      where,
      include: {
        apartments: {
          select: {
            id: true,
            unit_number: true,
            buildings: { select: { name: true } },
          },
        },
        requester: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
        reviewer: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
        issued_access_card: {
          select: { id: true, card_number: true },
        },
      },
      orderBy: [{ status: 'asc' }, { created_at: 'desc' }],
    });

    return {
      data: requests.map((request) =>
        this.toResponseDto(request as AccessCardRequestRecord),
      ),
      total: requests.length,
    };
  }

  async approve(
    requestId: string,
    dto: ApproveAccessCardRequestDto,
    reviewerId: string,
  ): Promise<AccessCardRequestResponseDto> {
    const request = await this.prisma.access_card_requests.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Access card request not found');
    }

    if (request.status !== ACCESS_CARD_REQUEST_STATUS.pending) {
      throw new BadRequestException('Only pending requests can be approved');
    }

    const issuedCard = await this.accessCardsService.create(
      {
        apartmentId: request.apartment_id,
        holderId: request.requested_by,
        cardType: request.card_type,
        accessZones: dto.accessZones,
        floorAccess: dto.floorAccess,
        expiresAt: dto.expiresAt,
        notes: dto.cardNotes,
      },
      reviewerId,
    );

    await this.prisma.access_card_requests.update({
      where: { id: requestId },
      data: {
        status: ACCESS_CARD_REQUEST_STATUS.approved,
        reviewed_by: reviewerId,
        reviewed_at: new Date(),
        review_note: dto.reviewNote,
        issued_card_id: issuedCard.id,
        updated_at: new Date(),
      },
    });

    this.logger.log({
      event: 'access_card_request_approved',
      requestId,
      reviewerId,
      issuedCardId: issuedCard.id,
    });

    return this.findOne(requestId);
  }

  async reject(
    requestId: string,
    dto: RejectAccessCardRequestDto,
    reviewerId: string,
  ): Promise<AccessCardRequestResponseDto> {
    const request = await this.prisma.access_card_requests.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Access card request not found');
    }

    if (request.status !== ACCESS_CARD_REQUEST_STATUS.pending) {
      throw new BadRequestException('Only pending requests can be rejected');
    }

    await this.prisma.access_card_requests.update({
      where: { id: requestId },
      data: {
        status: ACCESS_CARD_REQUEST_STATUS.rejected,
        reviewed_by: reviewerId,
        reviewed_at: new Date(),
        review_note: dto.reviewNote,
        updated_at: new Date(),
      },
    });

    this.logger.log({
      event: 'access_card_request_rejected',
      requestId,
      reviewerId,
    });

    return this.findOne(requestId);
  }

  private async findOne(id: string): Promise<AccessCardRequestResponseDto> {
    const request = await this.prisma.access_card_requests.findUnique({
      where: { id },
      include: {
        apartments: {
          select: {
            id: true,
            unit_number: true,
            buildings: { select: { name: true } },
          },
        },
        requester: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
        reviewer: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
        issued_access_card: {
          select: { id: true, card_number: true },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Access card request not found');
    }

    return this.toResponseDto(request as AccessCardRequestRecord);
  }

  private toResponseDto(
    request: AccessCardRequestRecord,
  ): AccessCardRequestResponseDto {
    return {
      id: request.id,
      apartmentId: request.apartment_id,
      requestedBy: request.requested_by,
      cardType: request.card_type,
      reason: request.reason,
      status: request.status as AccessCardRequestStatusDto,
      reviewedBy: request.reviewed_by,
      reviewedAt: request.reviewed_at?.toISOString() ?? null,
      reviewNote: request.review_note,
      issuedCardId: request.issued_card_id,
      apartment: request.apartments
        ? {
            id: request.apartments.id,
            unitNumber: request.apartments.unit_number,
            buildingName: request.apartments.buildings?.name,
          }
        : undefined,
      requester: request.requester
        ? {
            id: request.requester.id,
            firstName: request.requester.first_name,
            lastName: request.requester.last_name,
            email: request.requester.email ?? undefined,
          }
        : undefined,
      reviewer: request.reviewer
        ? {
            id: request.reviewer.id,
            firstName: request.reviewer.first_name,
            lastName: request.reviewer.last_name,
            email: request.reviewer.email ?? undefined,
          }
        : null,
      issuedCard: request.issued_access_card
        ? {
            id: request.issued_access_card.id,
            cardNumber: request.issued_access_card.card_number,
          }
        : null,
      createdAt: request.created_at.toISOString(),
      updatedAt: request.updated_at.toISOString(),
    };
  }
}
