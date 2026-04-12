import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Prisma, IncidentStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DEFAULT_PAGINATION_LIMIT } from '../../common/constants/defaults';
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

  private readonly TECHNICIAN_CACHE_KEY = 'technicians:list';

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: IncidentsGateway,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async create(
    dto: CreateIncidentDto,
    actorId: string,
    actorRole: UserRole,
  ): Promise<IncidentResponseDto> {
    // Verify apartment exists
    const apartment = await this.prisma.apartments.findUnique({
      where: { id: dto.apartmentId },
      include: { buildings: true },
    });

    if (!apartment) {
      throw new NotFoundException('Apartment not found');
    }

    // If reporter is a resident, verify they have an active contract for this apartment
    if (actorRole === UserRole.resident) {
      const activeContract = await this.prisma.contracts.findFirst({
        where: {
          tenant_id: actorId,
          apartment_id: dto.apartmentId,
          status: 'active',
        },
      });

      if (!activeContract) {
        throw new ForbiddenException(
          'You can only report incidents for apartments where you have an active lease',
        );
      }
    }

    const incident = await this.prisma.incidents.create({
      data: {
        apartment_id: dto.apartmentId,
        reported_by: actorId,
        category: dto.category,
        title: dto.title,
        description: dto.description,
        priority: dto.priority,
        status: IncidentStatus.open,
        image_urls: dto.imageUrls ?? [],
        updated_at: new Date(),
      },
      include: {
        apartments: {
          include: { buildings: true },
        },
        users_incidents_reported_byTousers: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
        users_incidents_assigned_toTousers: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
        _count: {
          select: { incident_comments: true },
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
      apartmentId: incident.apartment_id,
      buildingId: apartment.buildings.id,
      status: incident.status,
      title: incident.title,
      assignedTo: incident.assigned_to ?? undefined,
      updatedAt: incident.updated_at.toISOString(),
    });

    return this.toResponseDto(incident);
  }

  async findAll(
    filters: IncidentFiltersDto,
    page = 1,
    limit = DEFAULT_PAGINATION_LIMIT,
    userId?: string,
    userRole?: UserRole,
  ): Promise<{ data: IncidentResponseDto[]; total: number; pages: number }> {
    const where: Prisma.incidentsWhereInput = {};

    // Residents can only see their own reported incidents
    if (userRole === UserRole.resident && userId) {
      where.reported_by = userId;
    }

    // Technicians can see their assigned incidents
    if (userRole === UserRole.technician && userId) {
      where.assigned_to = userId;
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
      where.apartment_id = filters.apartmentId;
    }

    if (filters.buildingId) {
      where.apartments = { building_id: filters.buildingId };
    }

    if (filters.assignedToId) {
      where.assigned_to = filters.assignedToId;
    }

    if (filters.reportedById) {
      where.reported_by = filters.reportedById;
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [incidents, total] = await Promise.all([
      this.prisma.incidents.findMany({
        where,
        include: {
          apartments: {
            include: { buildings: true },
          },
          users_incidents_reported_byTousers: {
            select: { id: true, first_name: true, last_name: true, email: true },
          },
          users_incidents_assigned_toTousers: {
            select: { id: true, first_name: true, last_name: true, email: true },
          },
          _count: {
            select: { incident_comments: true },
          },
        },
        orderBy: [
          { priority: 'desc' }, // Urgent/high priority first
          { created_at: 'desc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.incidents.count({ where }),
    ]);

    return {
      data: incidents.map((i: any) => this.toResponseDto(i)),
      total,
      pages: Math.ceil(total / limit),
    };
  }

  async findOne(
    id: string,
    userId?: string,
    userRole?: UserRole,
  ): Promise<IncidentResponseDto> {
    const incident = await this.prisma.incidents.findUnique({
      where: { id },
      include: {
        apartments: {
          include: { buildings: true },
        },
        users_incidents_reported_byTousers: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
        users_incidents_assigned_toTousers: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
        incident_comments: {
          include: {
            users: {
              select: { id: true, first_name: true, last_name: true, email: true, role: true },
            },
          },
          orderBy: { created_at: 'asc' },
        },
        _count: {
          select: { incident_comments: true },
        },
      },
    });

    if (!incident) {
      throw new NotFoundException('Incident not found');
    }

    // Access control
    if (userRole === UserRole.resident && incident.reported_by !== userId) {
      throw new ForbiddenException('You can only view your own incidents');
    }

    if (userRole === UserRole.technician && incident.assigned_to !== userId) {
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
    const incident = await this.prisma.incidents.findUnique({
      where: { id },
    });

    if (!incident) {
      throw new NotFoundException('Incident not found');
    }

    // Only admin can update all fields; residents can only update their own open incidents
    if (actorRole === UserRole.resident) {
      if (incident.reported_by !== actorId) {
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

    const updated = await this.prisma.incidents.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        category: dto.category,
        priority: dto.priority,
        image_urls: dto.imageUrls,
      },
      include: {
        apartments: {
          include: { buildings: true },
        },
        users_incidents_reported_byTousers: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
        users_incidents_assigned_toTousers: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
        _count: {
          select: { incident_comments: true },
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

    const incident = await this.prisma.incidents.findUnique({
      where: { id },
    });

    if (!incident) {
      throw new NotFoundException('Incident not found');
    }

    // Verify technician exists and has technician role (multi-role RBAC)
    const technicianAssignment = await this.prisma.user_role_assignments.findUnique({
      where: {
        user_id_role: {
          user_id: dto.technicianId,
          role: UserRole.technician,
        },
      },
      include: { users: { select: { is_active: true } } },
    });

    if (!technicianAssignment || !technicianAssignment.users.is_active) {
      throw new BadRequestException('Invalid technician');
    }

    const updated = await this.prisma.incidents.update({
      where: { id },
      data: {
        assigned_to: dto.technicianId,
        status: IncidentStatus.assigned,
      },
      include: {
        apartments: {
          include: { buildings: true },
        },
        users_incidents_reported_byTousers: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
        users_incidents_assigned_toTousers: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
        _count: {
          select: { incident_comments: true },
        },
      },
    });

    this.logger.log({
      event: 'incident_assigned',
      actorId,
      incidentId: id,
      technicianId: dto.technicianId,
    });

    // Invalidate technician workload cache
    await this.cacheManager.del(this.TECHNICIAN_CACHE_KEY);

    // Emit WebSocket event
    this.gateway.emitIncidentAssigned({
      incidentId: updated.id,
      apartmentId: updated.apartment_id,
      buildingId: updated.apartments.building_id,
      status: updated.status,
      title: updated.title,
      assignedTo: updated.assigned_to ?? undefined,
      updatedAt: updated.updated_at.toISOString(),
    });

    return this.toResponseDto(updated);
  }

  async updateStatus(
    id: string,
    dto: UpdateIncidentStatusDto,
    actorId: string,
    actorRole: UserRole,
  ): Promise<IncidentResponseDto> {
    const incident = await this.prisma.incidents.findUnique({
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
      incident.assigned_to,
    );

    const updateData: Prisma.incidentsUpdateInput = {
      status: dto.status,
    };

    // Set resolved_at when moving to resolved state
    if (dto.status === IncidentStatus.resolved) {
      updateData.resolved_at = new Date();
      updateData.resolution_notes = dto.resolutionNotes;
    }

    // Clear resolved_at if reopening
    if (dto.status === IncidentStatus.open || dto.status === IncidentStatus.in_progress) {
      updateData.resolved_at = null;
      updateData.resolution_notes = null;
    }

    // Add resolution note as a comment if provided
    if (dto.resolutionNotes) {
      await this.prisma.incident_comments.create({
        data: {
          incident_id: id,
          author_id: actorId,
          content: `Status changed to ${dto.status}: ${dto.resolutionNotes}`,
          is_internal: false,
        },
      });
    }

    const updated = await this.prisma.incidents.update({
      where: { id },
      data: updateData,
      include: {
        apartments: {
          include: { buildings: true },
        },
        users_incidents_reported_byTousers: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
        users_incidents_assigned_toTousers: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
        _count: {
          select: { incident_comments: true },
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
      apartmentId: updated.apartment_id,
      buildingId: updated.apartments.building_id,
      status: updated.status,
      title: updated.title,
      assignedTo: updated.assigned_to ?? undefined,
      updatedAt: updated.updated_at.toISOString(),
    };

    if (dto.status === IncidentStatus.resolved || dto.status === IncidentStatus.closed) {
      this.gateway.emitIncidentResolved(payload);
    } else {
      this.gateway.emitIncidentUpdated(payload);
    }

    // Invalidate technician workload cache on status change
    if (updated.assigned_to) {
      await this.cacheManager.del(this.TECHNICIAN_CACHE_KEY);
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

    const incident = await this.prisma.incidents.findUnique({
      where: { id },
    });

    if (!incident) {
      throw new NotFoundException('Incident not found');
    }

    await this.prisma.incidents.delete({
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
    limit = DEFAULT_PAGINATION_LIMIT,
  ): Promise<{ data: IncidentResponseDto[]; total: number; pages: number }> {
    const where: Prisma.incidentsWhereInput = {};

    if (userRole === UserRole.resident) {
      where.reported_by = userId;
    } else if (userRole === UserRole.technician) {
      where.assigned_to = userId;
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
      this.prisma.incidents.findMany({
        where,
        include: {
          apartments: {
            include: { buildings: true },
          },
          users_incidents_reported_byTousers: {
            select: { id: true, first_name: true, last_name: true, email: true },
          },
          users_incidents_assigned_toTousers: {
            select: { id: true, first_name: true, last_name: true, email: true },
          },
          _count: {
            select: { incident_comments: true },
          },
        },
        orderBy: [{ priority: 'desc' }, { created_at: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.incidents.count({ where }),
    ]);

    return {
      data: incidents.map((i: any) => this.toResponseDto(i)),
      total,
      pages: Math.ceil(total / limit),
    };
  }

  private toResponseDto(incident: any): IncidentResponseDto {
    return {
      id: incident.id,
      apartmentId: incident.apartment_id,
      apartment: incident.apartments
        ? {
            id: incident.apartments.id,
            unit_number: incident.apartments.unit_number,
            building: incident.apartments.buildings
              ? {
                  id: incident.apartments.buildings.id,
                  name: incident.apartments.buildings.name,
                }
              : undefined,
          }
        : undefined,
      reportedById: incident.reported_by,
      reportedBy: incident.users_incidents_reported_byTousers
        ? {
            id: incident.users_incidents_reported_byTousers.id,
            firstName: incident.users_incidents_reported_byTousers.first_name,
            lastName: incident.users_incidents_reported_byTousers.last_name,
            email: incident.users_incidents_reported_byTousers.email,
          }
        : undefined,
      assignedToId: incident.assigned_to,
      assignedTo: incident.users_incidents_assigned_toTousers
        ? {
            id: incident.users_incidents_assigned_toTousers.id,
            firstName: incident.users_incidents_assigned_toTousers.first_name,
            lastName: incident.users_incidents_assigned_toTousers.last_name,
            email: incident.users_incidents_assigned_toTousers.email,
          }
        : undefined,
      category: incident.category,
      title: incident.title,
      description: incident.description,
      priority: incident.priority,
      status: incident.status,
      imageUrls: incident.image_urls ?? [],
      resolved_at: incident.resolved_at,
      resolutionNotes: incident.resolution_notes,
      created_at: incident.created_at,
      updatedAt: incident.updated_at,
      commentsCount: incident._count?.incident_comments ?? 0,
    };
  }
}
