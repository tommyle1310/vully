import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateIncidentCommentDto,
  UpdateIncidentCommentDto,
  IncidentCommentResponseDto,
} from './dto';

@Injectable()
export class IncidentCommentsService {
  private readonly logger = new Logger(IncidentCommentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(
    incidentId: string,
    dto: CreateIncidentCommentDto,
    actorId: string,
    actorRole: UserRole,
  ): Promise<IncidentCommentResponseDto> {
    // Verify incident exists
    const incident = await this.prisma.incident.findUnique({
      where: { id: incidentId },
    });

    if (!incident) {
      throw new NotFoundException('Incident not found');
    }

    // Check access: residents can only comment on their own incidents
    if (actorRole === UserRole.resident && incident.reportedById !== actorId) {
      throw new ForbiddenException('You can only comment on your own incidents');
    }

    // Check access: technicians can only comment on assigned incidents
    if (actorRole === UserRole.technician && incident.assignedToId !== actorId) {
      throw new ForbiddenException(
        'You can only comment on incidents assigned to you',
      );
    }

    // Internal comments can only be made by admin or technician
    const isInternal =
      dto.isInternal && (actorRole === UserRole.admin || actorRole === UserRole.technician);

    const comment = await this.prisma.incidentComment.create({
      data: {
        incidentId,
        authorId: actorId,
        content: dto.content,
        isInternal,
      },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true },
        },
      },
    });

    this.logger.log({
      event: 'incident_comment_created',
      actorId,
      incidentId,
      commentId: comment.id,
      isInternal,
    });

    return this.toResponseDto(comment);
  }

  async findAll(
    incidentId: string,
    actorId: string,
    actorRole: UserRole,
  ): Promise<IncidentCommentResponseDto[]> {
    // Verify incident exists and user has access
    const incident = await this.prisma.incident.findUnique({
      where: { id: incidentId },
    });

    if (!incident) {
      throw new NotFoundException('Incident not found');
    }

    // Check access
    if (actorRole === UserRole.resident && incident.reportedById !== actorId) {
      throw new ForbiddenException('You can only view comments on your own incidents');
    }

    if (actorRole === UserRole.technician && incident.assignedToId !== actorId) {
      throw new ForbiddenException(
        'You can only view comments on incidents assigned to you',
      );
    }

    const whereClause: any = { incidentId };

    // Residents cannot see internal comments
    if (actorRole === UserRole.resident) {
      whereClause.isInternal = false;
    }

    const comments = await this.prisma.incidentComment.findMany({
      where: whereClause,
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return comments.map((c) => this.toResponseDto(c));
  }

  async update(
    commentId: string,
    dto: UpdateIncidentCommentDto,
    actorId: string,
    actorRole: UserRole,
  ): Promise<IncidentCommentResponseDto> {
    const comment = await this.prisma.incidentComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Only author or admin can update
    if (actorRole !== UserRole.admin && comment.authorId !== actorId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    // Determine isInternal: admin/technician can toggle, residents always false
    let isInternal = comment.isInternal;
    if (dto.isInternal !== undefined) {
      if (actorRole === UserRole.admin || actorRole === UserRole.technician) {
        isInternal = dto.isInternal;
      }
    }

    const updated = await this.prisma.incidentComment.update({
      where: { id: commentId },
      data: {
        content: dto.content ?? comment.content,
        isInternal,
      },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true },
        },
      },
    });

    this.logger.log({
      event: 'incident_comment_updated',
      actorId,
      commentId,
    });

    return this.toResponseDto(updated);
  }

  async delete(
    commentId: string,
    actorId: string,
    actorRole: UserRole,
  ): Promise<void> {
    const comment = await this.prisma.incidentComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Only author or admin can delete
    if (actorRole !== UserRole.admin && comment.authorId !== actorId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.prisma.incidentComment.delete({
      where: { id: commentId },
    });

    this.logger.log({
      event: 'incident_comment_deleted',
      actorId,
      commentId,
    });
  }

  private toResponseDto(comment: any): IncidentCommentResponseDto {
    return {
      id: comment.id,
      incidentId: comment.incidentId,
      authorId: comment.authorId,
      author: comment.author
        ? {
            id: comment.author.id,
            firstName: comment.author.firstName,
            lastName: comment.author.lastName,
            role: comment.author.role,
          }
        : undefined,
      content: comment.content,
      isInternal: comment.isInternal,
      createdAt: comment.createdAt,
    };
  }
}
