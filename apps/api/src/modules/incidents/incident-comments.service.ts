import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { WS_EVENTS, WS_ROOMS, IncidentCommentEventPayload } from '@vully/shared-types';
import {
  CreateIncidentCommentDto,
  UpdateIncidentCommentDto,
  IncidentCommentResponseDto,
} from './dto';
import { IncidentsGateway } from './incidents.gateway';

@Injectable()
export class IncidentCommentsService {
  private readonly logger = new Logger(IncidentCommentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => IncidentsGateway))
    private readonly incidentsGateway: IncidentsGateway,
  ) {}

  async create(
    incidentId: string,
    dto: CreateIncidentCommentDto,
    actorId: string,
    actorRoles: UserRole[],
  ): Promise<IncidentCommentResponseDto> {
    // Verify incident exists
    const incident = await this.prisma.incidents.findUnique({
      where: { id: incidentId },
    });

    if (!incident) {
      throw new NotFoundException('Incident not found');
    }

    // Admin can comment on any incident
    if (actorRoles.includes(UserRole.admin)) {
      // No restrictions for admin
    }
    // Pure residents can only comment on their own incidents
    else if (actorRoles.includes(UserRole.resident) && !actorRoles.includes(UserRole.technician)) {
      if (incident.reported_by !== actorId) {
        throw new ForbiddenException('You can only comment on your own incidents');
      }
    }
    // Technicians (without admin) can only comment on assigned incidents
    else if (actorRoles.includes(UserRole.technician) && !actorRoles.includes(UserRole.admin)) {
      if (incident.assigned_to !== actorId) {
        throw new ForbiddenException(
          'You can only comment on incidents assigned to you',
        );
      }
    }

    // Internal comments can only be made by admin or technician
    const isInternal =
      dto.isInternal && (actorRoles.includes(UserRole.admin) || actorRoles.includes(UserRole.technician));

    const comment = await this.prisma.incident_comments.create({
      data: {
        incident_id: incidentId,
        author_id: actorId,
        content: dto.content,
        is_internal: isInternal,
      },
      include: {
        users: {
          select: { id: true, first_name: true, last_name: true, email: true, role: true },
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

    // Emit WebSocket event for real-time updates
    const commentPayload: IncidentCommentEventPayload = {
      commentId: comment.id,
      incidentId,
      authorId: actorId,
      authorName: comment.users
        ? `${comment.users.first_name} ${comment.users.last_name}`
        : 'Unknown',
      content: comment.content,
      isInternal: isInternal ?? false,
      created_at: comment.created_at.toISOString(),
    };

    // Emit to the incident room - users viewing this incident will receive the update
    this.incidentsGateway.server
      .to(WS_ROOMS.incidents(incidentId))
      .emit(WS_EVENTS.INCIDENT_COMMENT_CREATED, commentPayload);

    // Also emit to the apartment room for broader visibility
    if (incident.apartment_id) {
      this.incidentsGateway.server
        .to(WS_ROOMS.apartments(incident.apartment_id))
        .emit(WS_EVENTS.INCIDENT_COMMENT_CREATED, commentPayload);
    }

    this.logger.log({
      event: 'ws_comment_emitted',
      incidentId,
      commentId: comment.id,
      rooms: [WS_ROOMS.incidents(incidentId), incident.apartment_id ? WS_ROOMS.apartments(incident.apartment_id) : null].filter(Boolean),
    });

    return this.toResponseDto(comment);
  }

  async findAll(
    incidentId: string,
    actorId: string,
    actorRoles: UserRole[],
  ): Promise<IncidentCommentResponseDto[]> {
    // Verify incident exists and user has access
    const incident = await this.prisma.incidents.findUnique({
      where: { id: incidentId },
    });

    if (!incident) {
      throw new NotFoundException('Incident not found');
    }

    // Admin can view all comments
    if (actorRoles.includes(UserRole.admin)) {
      // No restrictions for admin
    }
    // Pure residents can only view comments on their own incidents
    else if (actorRoles.includes(UserRole.resident) && !actorRoles.includes(UserRole.technician)) {
      if (incident.reported_by !== actorId) {
        throw new ForbiddenException('You can only view comments on your own incidents');
      }
    }
    // Technicians (without admin) can only view comments on assigned incidents
    else if (actorRoles.includes(UserRole.technician) && !actorRoles.includes(UserRole.admin)) {
      if (incident.assigned_to !== actorId) {
        throw new ForbiddenException(
          'You can only view comments on incidents assigned to you',
        );
      }
    }

    const whereClause: any = { incident_id: incidentId };

    // Pure residents cannot see internal comments
    if (actorRoles.includes(UserRole.resident) && !actorRoles.includes(UserRole.admin) && !actorRoles.includes(UserRole.technician)) {
      whereClause.is_internal = false;
    }

    const comments = await this.prisma.incident_comments.findMany({
      where: whereClause,
      include: {
        users: {
          select: { id: true, first_name: true, last_name: true, email: true, role: true },
        },
      },
      orderBy: { created_at: 'asc' },
    });

    return comments.map((c) => this.toResponseDto(c));
  }

  async update(
    commentId: string,
    dto: UpdateIncidentCommentDto,
    actorId: string,
    actorRoles: UserRole[],
  ): Promise<IncidentCommentResponseDto> {
    const comment = await this.prisma.incident_comments.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Only author or admin can update
    if (!actorRoles.includes(UserRole.admin) && comment.author_id !== actorId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    // Determine isInternal: admin/technician can toggle, residents always false
    let isInternal = comment.is_internal;
    if (dto.isInternal !== undefined) {
      if (actorRoles.includes(UserRole.admin) || actorRoles.includes(UserRole.technician)) {
        isInternal = dto.isInternal;
      }
    }

    const updated = await this.prisma.incident_comments.update({
      where: { id: commentId },
      data: {
        content: dto.content ?? comment.content,
        is_internal: isInternal,
      },
      include: {
        users: {
          select: { id: true, first_name: true, last_name: true, email: true, role: true },
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
    actorRoles: UserRole[],
  ): Promise<void> {
    const comment = await this.prisma.incident_comments.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Only author or admin can delete
    if (!actorRoles.includes(UserRole.admin) && comment.author_id !== actorId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.prisma.incident_comments.delete({
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
      incidentId: comment.incident_id,
      authorId: comment.author_id,
      author: comment.users
        ? {
            id: comment.users.id,
            firstName: comment.users.first_name,
            lastName: comment.users.last_name,
            role: comment.users.role,
          }
        : undefined,
      content: comment.content,
      isInternal: comment.is_internal,
      created_at: comment.created_at,
    };
  }
}
