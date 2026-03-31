import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma, IncidentStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { IncidentsGateway } from './incidents.gateway';
import {
  CreateIncidentDto,
  UpdateIncidentDto,
  AssignTechnicianDto,
  UpdateIncidentStatusDto,
  IncidentFiltersDto,
  IncidentResponseDto,
} from './dto';

// Valid status transitions as per spec
const STATUS_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  open: ['assigned', 'closed'], // Can be assigned or closed by admin
  assigned: ['in_progress', 'open'], // Tech starts work or reassign
  in_progress: ['pending_review', 'resolved'], // Tech requests review or resolves
  pending_review: ['in_progress', 'resolved', 'closed'], // Admin can reopen, resolve, or close
  resolved: ['closed', 'open'], // Can close or reopen if issue persists
  closed: ['open'], // Can be reopened
};

@Injectable()
export class IncidentsService {
  private readonly logger = new Logger(IncidentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: IncidentsGateway,
  ) {}

  async create(
    dto: CreateIncidentDto,
    actorId: string,
    actorRole: UserRole,
  ): Promise<IncidentResponseDto> {
    // Verify apartment exists
    const apartment = await this.prisma.apartment.findUnique({
      where: { id: dto.apartmentId },
      include: { building: true },
    });

    if (!apartment) {
      throw new NotFoundException('Apartment not found');
    }

    // If reporter is a resident, verify they have an active contract for this apartment
    if (actorRole === UserRole.resident) {
      const activeContract = await this.prisma.contract.findFirst({
        where: {
          tenantId: actorId,
          apartmentId: dto.apartmentId,
          status: 'active',
        },
      });

      if (!activeContract) {
        throw new ForbiddenException(
          'You can only report incidents for apartments where you have an active lease',
        );
      }
    }

    const incident = await this.prisma.incident.create({
      data: {
        apartmentId: dto.apartmentId,
        reportedById: actorId,
        category: dto.category,
        title: dto.title,
        description: dto.description,
        priority: dto.priority,
        status: IncidentStatus.open,
        imageUrls: dto.imageUrls ?? [],
      },
      include: {
        apartment: {
          include: { building: true },
        },
        reportedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        _count: {
          select: { comments: true },
        },
      },
    });

    this.logger.log({
      event: 'incident_created',
      actorId,
      incidentId: incident.id,
      category: dto.category,
      priority: dto.priority,
    });

    // Emit WebSocket event (use apartment from earlier fetch)
    this.gateway.emitIncidentCreated({
      incidentId: incident.id,
      apartmentId: incident.apartmentId,
      buildingId: apartment.buildingId,
      status: incident.status,
      title: incident.title,
      assignedTo: incident.assignedToId ?? undefined,
      updatedAt: incident.updatedAt.toISOString(),
    });

    return this.toResponseDto(incident);
  }

  async findAll(
    filters: IncidentFiltersDto,
    page = 1,
    limit = 20,
    userId?: string,
    userRole?: UserRole,
  ): Promise<{ data: IncidentResponseDto[]; total: number; pages: number }> {
    const where: Prisma.IncidentWhereInput = {};

    // Residents can only see their own reported incidents
    if (userRole === UserRole.resident && userId) {
      where.reportedById = userId;
    }

    // Technicians can see their assigned incidents
    if (userRole === UserRole.technician && userId) {
      where.assignedToId = userId;
    }

    // Apply filters
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        where.status = { in: filters.status };
      } else {
        where.status = filters.status;
      }
    }

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.priority) {
      where.priority = filters.priority;
    }

    if (filters.apartmentId) {
      where.apartmentId = filters.apartmentId;
    }

    if (filters.buildingId) {
      where.apartment = { buildingId: filters.buildingId };
    }

    if (filters.assignedToId) {
      where.assignedToId = filters.assignedToId;
    }

    if (filters.reportedById) {
      where.reportedById = filters.reportedById;
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [incidents, total] = await Promise.all([
      this.prisma.incident.findMany({
        where,
        include: {
          apartment: {
            include: { building: true },
          },
          reportedBy: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          assignedTo: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          _count: {
            select: { comments: true },
          },
        },
        orderBy: [
          { priority: 'desc' }, // Urgent/high priority first
          { createdAt: 'desc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.incident.count({ where }),
    ]);

    return {
      data: incidents.map((i) => this.toResponseDto(i)),
      total,
      pages: Math.ceil(total / limit),
    };
  }

  async findOne(
    id: string,
    userId?: string,
    userRole?: UserRole,
  ): Promise<IncidentResponseDto> {
    const incident = await this.prisma.incident.findUnique({
      where: { id },
      include: {
        apartment: {
          include: { building: true },
        },
        reportedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        comments: {
          include: {
            author: {
              select: { id: true, firstName: true, lastName: true, email: true, role: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: { comments: true },
        },
      },
    });

    if (!incident) {
      throw new NotFoundException('Incident not found');
    }

    // Access control
    if (userRole === UserRole.resident && incident.reportedById !== userId) {
      throw new ForbiddenException('You can only view your own incidents');
    }

    if (userRole === UserRole.technician && incident.assignedToId !== userId) {
      throw new ForbiddenException('You can only view incidents assigned to you');
    }

    return this.toResponseDto(incident);
  }

  async update(
    id: string,
    dto: UpdateIncidentDto,
    actorId: string,
    actorRole: UserRole,
  ): Promise<IncidentResponseDto> {
    const incident = await this.prisma.incident.findUnique({
      where: { id },
    });

    if (!incident) {
      throw new NotFoundException('Incident not found');
    }

    // Only admin can update all fields; residents can only update their own open incidents
    if (actorRole === UserRole.resident) {
      if (incident.reportedById !== actorId) {
        throw new ForbiddenException('You can only update your own incidents');
      }
      if (incident.status !== IncidentStatus.open) {
        throw new ForbiddenException(
          'You can only update incidents that are still open',
        );
      }
    }

    // Technicians cannot update incident details (only status via separate endpoint)
    if (actorRole === UserRole.technician) {
      throw new ForbiddenException('Technicians cannot update incident details');
    }

    const updated = await this.prisma.incident.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        category: dto.category,
        priority: dto.priority,
        imageUrls: dto.imageUrls,
      },
      include: {
        apartment: {
          include: { building: true },
        },
        reportedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        _count: {
          select: { comments: true },
        },
      },
    });

    this.logger.log({
      event: 'incident_updated',
      actorId,
      incidentId: id,
      changes: dto,
    });

    return this.toResponseDto(updated);
  }

  async assignTechnician(
    id: string,
    dto: AssignTechnicianDto,
    actorId: string,
    actorRole: UserRole,
  ): Promise<IncidentResponseDto> {
    // Only admin can assign technicians
    if (actorRole !== UserRole.admin) {
      throw new ForbiddenException('Only administrators can assign technicians');
    }

    const incident = await this.prisma.incident.findUnique({
      where: { id },
    });

    if (!incident) {
      throw new NotFoundException('Incident not found');
    }

    // Verify technician exists and has technician role
    const technician = await this.prisma.user.findUnique({
      where: { id: dto.technicianId },
    });

    if (!technician || technician.role !== UserRole.technician) {
      throw new BadRequestException('Invalid technician');
    }

    const updated = await this.prisma.incident.update({
      where: { id },
      data: {
        assignedToId: dto.technicianId,
        status: IncidentStatus.assigned,
      },
      include: {
        apartment: {
          include: { building: true },
        },
        reportedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        _count: {
          select: { comments: true },
        },
      },
    });

    this.logger.log({
      event: 'incident_assigned',
      actorId,
      incidentId: id,
      technicianId: dto.technicianId,
    });

    // Emit WebSocket event
    this.gateway.emitIncidentAssigned({
      incidentId: updated.id,
      apartmentId: updated.apartmentId,
      buildingId: updated.apartment.buildingId,
      status: updated.status,
      title: updated.title,
      assignedTo: updated.assignedToId ?? undefined,
      updatedAt: updated.updatedAt.toISOString(),
    });

    return this.toResponseDto(updated);
  }

  async updateStatus(
    id: string,
    dto: UpdateIncidentStatusDto,
    actorId: string,
    actorRole: UserRole,
  ): Promise<IncidentResponseDto> {
    const incident = await this.prisma.incident.findUnique({
      where: { id },
    });

    if (!incident) {
      throw new NotFoundException('Incident not found');
    }

    // Validate status transition
    const allowedTransitions = STATUS_TRANSITIONS[incident.status];
    if (!allowedTransitions.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition from ${incident.status} to ${dto.status}`,
      );
    }

    // Check role-based permissions for status changes
    this.validateStatusChangePermission(
      incident.status,
      dto.status,
      actorRole,
      actorId,
      incident.assignedToId,
    );

    const updateData: Prisma.IncidentUpdateInput = {
      status: dto.status,
    };

    // Set resolvedAt when moving to resolved state
    if (dto.status === IncidentStatus.resolved) {
      updateData.resolvedAt = new Date();
      updateData.resolutionNotes = dto.resolutionNotes;
    }

    // Clear resolvedAt if reopening
    if (dto.status === IncidentStatus.open || dto.status === IncidentStatus.in_progress) {
      updateData.resolvedAt = null;
      updateData.resolutionNotes = null;
    }

    // Add resolution note as a comment if provided
    if (dto.resolutionNotes) {
      await this.prisma.incidentComment.create({
        data: {
          incidentId: id,
          authorId: actorId,
          content: `Status changed to ${dto.status}: ${dto.resolutionNotes}`,
          isInternal: false,
        },
      });
    }

    const updated = await this.prisma.incident.update({
      where: { id },
      data: updateData,
      include: {
        apartment: {
          include: { building: true },
        },
        reportedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        _count: {
          select: { comments: true },
        },
      },
    });

    this.logger.log({
      event: 'incident_status_changed',
      actorId,
      incidentId: id,
      fromStatus: incident.status,
      toStatus: dto.status,
    });

    // Emit WebSocket event based on status
    const payload = {
      incidentId: updated.id,
      apartmentId: updated.apartmentId,
      buildingId: updated.apartment.buildingId,
      status: updated.status,
      title: updated.title,
      assignedTo: updated.assignedToId ?? undefined,
      updatedAt: updated.updatedAt.toISOString(),
    };

    if (dto.status === IncidentStatus.resolved || dto.status === IncidentStatus.closed) {
      this.gateway.emitIncidentResolved(payload);
    } else {
      this.gateway.emitIncidentUpdated(payload);
    }

    return this.toResponseDto(updated);
  }

  private validateStatusChangePermission(
    currentStatus: IncidentStatus,
    newStatus: IncidentStatus,
    actorRole: UserRole,
    actorId: string,
    assignedToId: string | null,
  ): void {
    // Admin can do any valid transition
    if (actorRole === UserRole.admin) {
      return;
    }

    // Technician can only update incidents assigned to them
    if (actorRole === UserRole.technician) {
      if (assignedToId !== actorId) {
        throw new ForbiddenException(
          'You can only update status for incidents assigned to you',
        );
      }

      // Technicians can: assigned->in_progress, in_progress->resolved/pending_review
      const technicianAllowed: Record<IncidentStatus, IncidentStatus[]> = {
        assigned: ['in_progress'],
        in_progress: ['pending_review', 'resolved'],
        open: [],
        pending_review: [],
        resolved: [],
        closed: [],
      };

      if (!technicianAllowed[currentStatus]?.includes(newStatus)) {
        throw new ForbiddenException(
          `Technicians cannot change status from ${currentStatus} to ${newStatus}`,
        );
      }
      return;
    }

    // Residents cannot change status
    throw new ForbiddenException('Residents cannot change incident status');
  }

  async delete(id: string, actorId: string, actorRole: UserRole): Promise<void> {
    // Only admin can delete incidents
    if (actorRole !== UserRole.admin) {
      throw new ForbiddenException('Only administrators can delete incidents');
    }

    const incident = await this.prisma.incident.findUnique({
      where: { id },
    });

    if (!incident) {
      throw new NotFoundException('Incident not found');
    }

    await this.prisma.incident.delete({
      where: { id },
    });

    this.logger.log({
      event: 'incident_deleted',
      actorId,
      incidentId: id,
    });
  }

  async getMyIncidents(
    userId: string,
    userRole: UserRole,
    filters: IncidentFiltersDto,
    page = 1,
    limit = 20,
  ): Promise<{ data: IncidentResponseDto[]; total: number; pages: number }> {
    const where: Prisma.IncidentWhereInput = {};

    if (userRole === UserRole.resident) {
      where.reportedById = userId;
    } else if (userRole === UserRole.technician) {
      where.assignedToId = userId;
    }

    // Apply additional filters
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        where.status = { in: filters.status };
      } else {
        where.status = filters.status;
      }
    }

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.priority) {
      where.priority = filters.priority;
    }

    const [incidents, total] = await Promise.all([
      this.prisma.incident.findMany({
        where,
        include: {
          apartment: {
            include: { building: true },
          },
          reportedBy: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          assignedTo: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          _count: {
            select: { comments: true },
          },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.incident.count({ where }),
    ]);

    return {
      data: incidents.map((i) => this.toResponseDto(i)),
      total,
      pages: Math.ceil(total / limit),
    };
  }

  private toResponseDto(incident: any): IncidentResponseDto {
    return {
      id: incident.id,
      apartmentId: incident.apartmentId,
      apartment: incident.apartment
        ? {
            id: incident.apartment.id,
            unitNumber: incident.apartment.unitNumber,
            building: incident.apartment.building
              ? {
                  id: incident.apartment.building.id,
                  name: incident.apartment.building.name,
                }
              : undefined,
          }
        : undefined,
      reportedById: incident.reportedById,
      reportedBy: incident.reportedBy,
      assignedToId: incident.assignedToId,
      assignedTo: incident.assignedTo,
      category: incident.category,
      title: incident.title,
      description: incident.description,
      priority: incident.priority,
      status: incident.status,
      imageUrls: incident.imageUrls ?? [],
      resolvedAt: incident.resolvedAt,
      resolutionNotes: incident.resolutionNotes,
      createdAt: incident.createdAt,
      updatedAt: incident.updatedAt,
      commentsCount: incident._count?.comments ?? 0,
    };
  }
}
