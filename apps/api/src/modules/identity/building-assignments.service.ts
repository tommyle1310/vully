import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UserRole } from '@vully/shared-types';
import {
  CreateBuildingAssignmentDto,
  UpdateBuildingAssignmentDto,
  BuildingAssignmentResponseDto,
} from './dto/building-assignment.dto';

/**
 * Building Assignments Service
 * 
 * Manages user-building assignments for building-scoped RBAC.
 * 
 * Examples:
 * - Security guard assigned to Building A with role 'security'
 * - Housekeeping staff assigned to Buildings A & B with role 'housekeeping'
 * - Building manager assigned to entire complex with role 'building_manager'
 */
@Injectable()
export class BuildingAssignmentsService {
  private readonly logger = new Logger(BuildingAssignmentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all building assignments for a user
   */
  async getByUserId(userId: string): Promise<BuildingAssignmentResponseDto[]> {
    const assignments = await this.prisma.user_building_assignments.findMany({
      where: { user_id: userId },
      include: {
        building: {
          select: { name: true, address: true },
        },
      },
      orderBy: { assigned_at: 'desc' },
    });

    return assignments.map((a: { id: string; user_id: string; building_id: string; role: string; assigned_at: Date; assigned_by: string | null; building: { name: string; address: string | null } | null }) => ({
      id: a.id,
      user_id: a.user_id,
      building_id: a.building_id,
      role: a.role as UserRole,
      assigned_at: a.assigned_at,
      assigned_by: a.assigned_by ?? undefined,
      building_name: a.building?.name,
      building_address: a.building?.address ?? undefined,
    }));
  }

  /**
   * Get all users assigned to a building
   */
  async getByBuildingId(
    buildingId: string,
    role?: UserRole,
  ): Promise<BuildingAssignmentResponseDto[]> {
    const assignments = await this.prisma.user_building_assignments.findMany({
      where: {
        building_id: buildingId,
        ...(role && { role }),
      },
      include: {
        user: {
          select: { first_name: true, last_name: true, email: true },
        },
      },
      orderBy: { assigned_at: 'desc' },
    });

    return assignments.map((a: { id: string; user_id: string; building_id: string; role: string; assigned_at: Date; assigned_by: string | null; user: { first_name: string; last_name: string; email: string } | null }) => ({
      id: a.id,
      user_id: a.user_id,
      building_id: a.building_id,
      role: a.role as UserRole,
      assigned_at: a.assigned_at,
      assigned_by: a.assigned_by ?? undefined,
      user: a.user ? {
        first_name: a.user.first_name,
        last_name: a.user.last_name,
        email: a.user.email,
      } : undefined,
    }));
  }

  /**
   * Assign a user to a building with a specific role
   */
  async create(
    userId: string,
    dto: CreateBuildingAssignmentDto,
    assignedBy: string,
  ): Promise<BuildingAssignmentResponseDto> {
    // Verify user exists
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify building exists
    const building = await this.prisma.buildings.findUnique({
      where: { id: dto.buildingId },
      select: { id: true, name: true, address: true },
    });
    if (!building) {
      throw new NotFoundException('Building not found');
    }

    // Check for existing assignment
    const existing = await this.prisma.user_building_assignments.findUnique({
      where: {
        user_id_building_id: {
          user_id: userId,
          building_id: dto.buildingId,
        },
      },
    });
    if (existing) {
      throw new ConflictException('User already assigned to this building');
    }

    // Only allow building-scoped roles
    const scopedRoles: UserRole[] = [
      UserRole.security,
      UserRole.housekeeping,
      UserRole.technician,
      UserRole.building_manager,
      UserRole.accountant,
    ];
    if (!scopedRoles.includes(dto.role)) {
      throw new ForbiddenException(
        `Role '${dto.role}' cannot be assigned at building level`,
      );
    }

    const assignment = await this.prisma.user_building_assignments.create({
      data: {
        user_id: userId,
        building_id: dto.buildingId,
        role: dto.role,
        assigned_by: assignedBy,
      },
    });

    this.logger.log('Created building assignment', {
      userId,
      buildingId: dto.buildingId,
      role: dto.role,
      assignedBy,
    });

    return {
      id: assignment.id,
      user_id: assignment.user_id,
      building_id: assignment.building_id,
      role: assignment.role as UserRole,
      assigned_at: assignment.assigned_at,
      assigned_by: assignment.assigned_by ?? undefined,
      building_name: building.name,
      building_address: building.address ?? undefined,
    };
  }

  /**
   * Update assignment role
   */
  async update(
    userId: string,
    buildingId: string,
    dto: UpdateBuildingAssignmentDto,
    updatedBy: string,
  ): Promise<BuildingAssignmentResponseDto> {
    const assignment = await this.prisma.user_building_assignments.findUnique({
      where: {
        user_id_building_id: {
          user_id: userId,
          building_id: buildingId,
        },
      },
      include: {
        building: {
          select: { name: true, address: true },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    const updated = await this.prisma.user_building_assignments.update({
      where: { id: assignment.id },
      data: {
        ...(dto.role && { role: dto.role }),
      },
    });

    this.logger.log('Updated building assignment', {
      userId,
      buildingId,
      oldRole: assignment.role,
      newRole: dto.role,
      updatedBy,
    });

    return {
      id: updated.id,
      user_id: updated.user_id,
      building_id: updated.building_id,
      role: updated.role as UserRole,
      assigned_at: updated.assigned_at,
      assigned_by: updated.assigned_by ?? undefined,
      building_name: assignment.building?.name,
      building_address: assignment.building?.address ?? undefined,
    };
  }

  /**
   * Remove user from building
   */
  async delete(userId: string, buildingId: string): Promise<void> {
    const assignment = await this.prisma.user_building_assignments.findUnique({
      where: {
        user_id_building_id: {
          user_id: userId,
          building_id: buildingId,
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    await this.prisma.user_building_assignments.delete({
      where: { id: assignment.id },
    });

    this.logger.log('Deleted building assignment', { userId, buildingId });
  }

  /**
   * Check if user is assigned to building
   */
  async isAssigned(
    userId: string,
    buildingId: string,
    role?: UserRole,
  ): Promise<boolean> {
    const assignment = await this.prisma.user_building_assignments.findFirst({
      where: {
        user_id: userId,
        building_id: buildingId,
        ...(role && { role }),
      },
      select: { id: true },
    });

    return !!assignment;
  }

  /**
   * Get all buildings a user has access to
   */
  async getUserBuildings(userId: string): Promise<string[]> {
    const assignments = await this.prisma.user_building_assignments.findMany({
      where: { user_id: userId },
      select: { building_id: true },
    });

    return assignments.map((a: { building_id: string }) => a.building_id);
  }
}
