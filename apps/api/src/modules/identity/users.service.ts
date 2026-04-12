import {
  Injectable,
  Inject,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Prisma, UserRole as UserRoleEnum } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DEFAULT_PAGINATION_LIMIT } from '../../common/constants/defaults';
import { CreateUserDto, UpdateUserDto, UserResponseDto, UpdateProfileDto, UpdateTechnicianProfileDto, TechnicianListItemDto } from './dto/user.dto';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly SALT_ROUNDS = 12;
  private readonly TECHNICIAN_CACHE_KEY = 'technicians:list';
  private readonly TECHNICIAN_CACHE_TTL = 120_000; // 2 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async create(dto: CreateUserDto, actorId: string): Promise<UserResponseDto> {
    // Check if email already exists
    const existing = await this.prisma.users.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    // Validate roles (max 3)
    const roles = dto.roles || [UserRoleEnum.resident];
    if (roles.length === 0 || roles.length > 3) {
      throw new BadRequestException('User must have 1-3 roles');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    // Create user with role assignments in a transaction
    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.users.create({
        data: {
          email: dto.email,
          password_hash: passwordHash,
          first_name: dto.firstName,
          last_name: dto.lastName,
          role: roles[0], // Keep for backward compatibility
          phone: dto.phone,
          profile_data: (dto.profileData || {}) as Prisma.InputJsonValue,
          updated_at: new Date(),
        },
      });

      // Create role assignments
      await tx.user_role_assignments.createMany({
        data: roles.map((role) => ({
          user_id: newUser.id,
          role,
        })),
      });

      return tx.users.findUnique({
        where: { id: newUser.id },
        include: { user_role_assignments: true },
      });
    });

    // Audit log
    this.logger.log({
      event: 'user_created',
      actorId,
      targetUserId: user!.id,
      roles: roles,
      timestamp: new Date().toISOString(),
    });

    return this.toResponseDto(user!);
  }

  async findAll(page = 1, limit = DEFAULT_PAGINATION_LIMIT): Promise<{ data: UserResponseDto[]; total: number }> {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.users.findMany({
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: { user_role_assignments: true },
      }),
      this.prisma.users.count(),
    ]);

    return {
      data: users.map((u) => this.toResponseDto(u)),
      total,
    };
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.prisma.users.findUnique({
      where: { id },
      include: { user_role_assignments: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toResponseDto(user);
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    actorId: string,
    actorRoles: UserRoleEnum[],
  ): Promise<UserResponseDto> {
    const user = await this.prisma.users.findUnique({
      where: { id },
      include: { user_role_assignments: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isAdmin = actorRoles.includes(UserRoleEnum.admin);

    // Prevent non-admins from changing roles
    if (dto.roles && !isAdmin) {
      throw new ForbiddenException('Only admins can change user roles');
    }

    // Validate roles (1-3)
    if (dto.roles && (dto.roles.length === 0 || dto.roles.length > 3)) {
      throw new BadRequestException('User must have 1-3 roles');
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {};

    if (dto.email) updateData.email = dto.email;
    if (dto.firstName) updateData.first_name = dto.firstName;
    if (dto.lastName) updateData.last_name = dto.lastName;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.profileData) updateData.profile_data = dto.profileData;
    if (dto.isActive !== undefined) updateData.is_active = dto.isActive;

    // Hash new password if provided
    if (dto.password) {
      updateData.password_hash = await bcrypt.hash(dto.password, this.SALT_ROUNDS);
    }

    // Update user and roles in transaction
    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedUser = await tx.users.update({
        where: { id },
        data: updateData,
      });

      // Update roles if provided
      if (dto.roles) {
        // Delete old role assignments
        await tx.user_role_assignments.deleteMany({
          where: { user_id: id },
        });

        // Create new role assignments
        await tx.user_role_assignments.createMany({
          data: dto.roles.map((role) => ({
            user_id: id,
            role,
          })),
        });

        // Update primary role for backward compatibility
        await tx.users.update({
          where: { id },
          data: { role: dto.roles[0] },
        });
      }

      return tx.users.findUnique({
        where: { id },
        include: { user_role_assignments: true },
      });
    });

    // Audit log for role change
    if (dto.roles) {
      const oldRoles = user.user_role_assignments.map((ra: { role: UserRoleEnum }) => ra.role);
      this.logger.log({
        event: 'roles_changed',
        actorId,
        targetUserId: id,
        oldRoles,
        newRoles: dto.roles,
        timestamp: new Date().toISOString(),
      });
    }

    // If user was deactivated, invalidate all sessions
    if (dto.isActive === false && user.is_active === true) {
      await this.authService.logoutAllDevices(id);

      this.logger.log({
        event: 'user_deactivated',
        actorId,
        targetUserId: id,
        timestamp: new Date().toISOString(),
      });
    }

    return this.toResponseDto(updated!);
  }

  /**
   * Assign a role to a user (max 3 roles total)
   */
  async assignRole(
    userId: string,
    role: UserRoleEnum,
    actorId: string,
  ): Promise<UserResponseDto> {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      include: { user_role_assignments: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user already has this role
    const hasRole = user.user_role_assignments.some((ra: { role: UserRoleEnum }) => ra.role === role);
    if (hasRole) {
      throw new ConflictException('User already has this role');
    }

    // Check max roles limit
    if (user.user_role_assignments.length >= 3) {
      throw new BadRequestException('User cannot have more than 3 roles');
    }

    await this.prisma.user_role_assignments.create({
      data: {
        user_id: userId,
        role,
      },
    });

    this.logger.log({
      event: 'role_assigned',
      actorId,
      targetUserId: userId,
      role,
      timestamp: new Date().toISOString(),
    });

    return this.findOne(userId);
  }

  /**
   * Revoke a role from a user (must have at least 1 role remaining)
   */
  async revokeRole(
    userId: string,
    role: UserRoleEnum,
    actorId: string,
  ): Promise<UserResponseDto> {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      include: { user_role_assignments: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Ensure user has at least 2 roles before revoking
    if (user.user_role_assignments.length <= 1) {
      throw new BadRequestException('User must have at least 1 role');
    }

    // Check if user has this role
    const hasRole = user.user_role_assignments.some((ra: { role: UserRoleEnum }) => ra.role === role);
    if (!hasRole) {
      throw new NotFoundException('User does not have this role');
    }

    await this.prisma.user_role_assignments.deleteMany({
      where: {
        user_id: userId,
        role,
      },
    });

    // Update primary role if needed
    if (user.role === role) {
      const remainingRoles = user.user_role_assignments
        .filter((ra: { role: UserRoleEnum }) => ra.role !== role)
        .map((ra: { role: UserRoleEnum }) => ra.role);
      
      if (remainingRoles.length > 0) {
        await this.prisma.users.update({
          where: { id: userId },
          data: { role: remainingRoles[0] },
        });
      }
    }

    this.logger.log({
      event: 'role_revoked',
      actorId,
      targetUserId: userId,
      role,
      timestamp: new Date().toISOString(),
    });

    return this.findOne(userId);
  }

  /**
   * Get all roles for a user
   */
  async getUserRoles(userId: string): Promise<UserRoleEnum[]> {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      include: { user_role_assignments: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user.user_role_assignments.map((ra: { role: UserRoleEnum }) => ra.role);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      throw new ForbiddenException('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

    await this.prisma.users.update({
      where: { id: userId },
      data: { password_hash: passwordHash },
    });

    // Invalidate all other sessions
    await this.authService.logoutAllDevices(userId);

    this.logger.log({
      event: 'password_changed',
      userId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Update user's own profile (non-admin fields only)
   */
  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserResponseDto> {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      include: { user_role_assignments: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Merge profileData with existing data
    const existingProfileData = (user.profile_data as Record<string, unknown>) || {};
    const mergedProfileData = dto.profileData
      ? { ...existingProfileData, ...dto.profileData }
      : existingProfileData;

    const updated = await this.prisma.users.update({
      where: { id: userId },
      data: {
        ...(dto.firstName && { first_name: dto.firstName }),
        ...(dto.lastName && { last_name: dto.lastName }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.profileData && { profile_data: mergedProfileData as any }),
        updated_at: new Date(),
      },
      include: { user_role_assignments: true },
    });

    this.logger.log({
      event: 'profile_updated',
      userId,
      fields: Object.keys(dto),
    });

    return this.toResponseDto(updated);
  }

  /**
   * List all technicians with incident workload counts
   */
  async listTechnicians(): Promise<TechnicianListItemDto[]> {
    const cached = await this.cacheManager.get<TechnicianListItemDto[]>(this.TECHNICIAN_CACHE_KEY);
    if (cached) return cached;

    // Get all users with technician role
    const technicianAssignments = await this.prisma.user_role_assignments.findMany({
      where: { role: UserRoleEnum.technician },
      select: { user_id: true },
    });
    const technicianIds = technicianAssignments.map((a) => a.user_id);

    if (technicianIds.length === 0) return [];

    const technicians = await this.prisma.users.findMany({
      where: { id: { in: technicianIds }, is_active: true },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        profile_data: true,
      },
    });

    // Aggregate incident counts per technician in one query
    const workloadCounts = await this.prisma.incidents.groupBy({
      by: ['assigned_to', 'status'],
      where: {
        assigned_to: { in: technicianIds },
        status: { in: ['assigned', 'in_progress', 'pending_review'] },
      },
      _count: { id: true },
    });

    // Build workload map
    const workloadMap = new Map<string, { assigned: number; inProgress: number; pendingReview: number }>();
    for (const row of workloadCounts) {
      if (!row.assigned_to) continue;
      const current = workloadMap.get(row.assigned_to) || { assigned: 0, inProgress: 0, pendingReview: 0 };
      if (row.status === 'assigned') current.assigned = row._count.id;
      if (row.status === 'in_progress') current.inProgress = row._count.id;
      if (row.status === 'pending_review') current.pendingReview = row._count.id;
      workloadMap.set(row.assigned_to, current);
    }

    const result: TechnicianListItemDto[] = technicians.map((tech) => {
      const wl = workloadMap.get(tech.id) || { assigned: 0, inProgress: 0, pendingReview: 0 };
      const profileData = (tech.profile_data as Record<string, unknown>) || {};
      return {
        id: tech.id,
        firstName: tech.first_name,
        lastName: tech.last_name,
        email: tech.email,
        profileData: {
          avatarUrl: profileData.avatarUrl as string | undefined,
          specialties: profileData.specialties as string[] | undefined,
          availabilityStatus: (profileData.availabilityStatus as string) || 'available',
        },
        workload: {
          ...wl,
          total: wl.assigned + wl.inProgress + wl.pendingReview,
        },
      };
    });

    await this.cacheManager.set(this.TECHNICIAN_CACHE_KEY, result, this.TECHNICIAN_CACHE_TTL);
    return result;
  }

  /**
   * Invalidate the technician list cache
   */
  async invalidateTechnicianCache(): Promise<void> {
    await this.cacheManager.del(this.TECHNICIAN_CACHE_KEY);
  }

  /**
   * Update technician-specific profile fields (admin or self)
   */
  async updateTechnicianProfile(
    userId: string,
    dto: UpdateTechnicianProfileDto,
    actorId: string,
    actorRoles: UserRoleEnum[],
  ): Promise<UserResponseDto> {
    const isAdmin = actorRoles.includes(UserRoleEnum.admin);
    const isSelf = actorId === userId;

    if (!isAdmin && !isSelf) {
      throw new ForbiddenException('Can only update your own technician profile');
    }

    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      include: { user_role_assignments: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify user has technician role
    const hasTechRole = user.user_role_assignments.some((ra) => ra.role === UserRoleEnum.technician);
    if (!hasTechRole) {
      throw new ForbiddenException('User does not have the technician role');
    }

    // Merge into existing profile_data
    const existingProfileData = (user.profile_data as Record<string, unknown>) || {};
    const mergedProfileData = {
      ...existingProfileData,
      ...(dto.specialties !== undefined && { specialties: dto.specialties }),
      ...(dto.availabilityStatus !== undefined && { availabilityStatus: dto.availabilityStatus }),
      ...(dto.shiftPreferences !== undefined && { shiftPreferences: dto.shiftPreferences }),
    };

    const updated = await this.prisma.users.update({
      where: { id: userId },
      data: {
        profile_data: mergedProfileData as Prisma.InputJsonValue,
        updated_at: new Date(),
      },
      include: { user_role_assignments: true },
    });

    // Invalidate technician cache since profile changed
    await this.invalidateTechnicianCache();

    this.logger.log({
      event: 'technician_profile_updated',
      actorId,
      targetUserId: userId,
      fields: Object.keys(dto),
    });

    return this.toResponseDto(updated);
  }

  private toResponseDto(user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: UserRoleEnum;
    phone: string | null;
    profile_data?: unknown;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
    user_role_assignments?: Array<{ role: UserRoleEnum }>;
  }): UserResponseDto {
    // Extract roles from user_role_assignments, fallback to legacy role field
    const roles = user.user_role_assignments
      ? user.user_role_assignments.map((ra) => ra.role)
      : [user.role];

    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role, // DEPRECATED: For backward compatibility
      roles: roles,
      phone: user.phone || undefined,
      profileData: (user.profile_data as Record<string, unknown> | undefined) || undefined,
      isActive: user.is_active,
      created_at: user.created_at,
      updatedAt: user.updated_at,
    };
  }
}
