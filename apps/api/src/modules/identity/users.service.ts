import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, UserRole as UserRoleEnum } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from './dto/user.dto';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly SALT_ROUNDS = 12;

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async create(dto: CreateUserDto, actorId: string): Promise<UserResponseDto> {
    // Check if email already exists
    const existing = await this.prisma.user.findUnique({
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
      const newUser = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: roles[0], // Keep for backward compatibility
          phone: dto.phone,
          profileData: (dto.profileData || {}) as Prisma.InputJsonValue,
        },
      });

      // Create role assignments
      await tx.userRoleAssignment.createMany({
        data: roles.map((role) => ({
          userId: newUser.id,
          role,
        })),
      });

      return tx.user.findUnique({
        where: { id: newUser.id },
        include: { roleAssignments: true },
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

  async findAll(page = 1, limit = 20): Promise<{ data: UserResponseDto[]; total: number }> {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { roleAssignments: true },
      }),
      this.prisma.user.count(),
    ]);

    return {
      data: users.map((u) => this.toResponseDto(u)),
      total,
    };
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { roleAssignments: true },
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
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { roleAssignments: true },
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
    if (dto.firstName) updateData.firstName = dto.firstName;
    if (dto.lastName) updateData.lastName = dto.lastName;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.profileData) updateData.profileData = dto.profileData;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    // Hash new password if provided
    if (dto.password) {
      updateData.passwordHash = await bcrypt.hash(dto.password, this.SALT_ROUNDS);
    }

    // Update user and roles in transaction
    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id },
        data: updateData,
      });

      // Update roles if provided
      if (dto.roles) {
        // Delete old role assignments
        await tx.userRoleAssignment.deleteMany({
          where: { userId: id },
        });

        // Create new role assignments
        await tx.userRoleAssignment.createMany({
          data: dto.roles.map((role) => ({
            userId: id,
            role,
          })),
        });

        // Update primary role for backward compatibility
        await tx.user.update({
          where: { id },
          data: { role: dto.roles[0] },
        });
      }

      return tx.user.findUnique({
        where: { id },
        include: { roleAssignments: true },
      });
    });

    // Audit log for role change
    if (dto.roles) {
      const oldRoles = user.roleAssignments.map((ra) => ra.role);
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
    if (dto.isActive === false && user.isActive === true) {
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
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roleAssignments: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user already has this role
    const hasRole = user.roleAssignments.some((ra) => ra.role === role);
    if (hasRole) {
      throw new ConflictException('User already has this role');
    }

    // Check max roles limit
    if (user.roleAssignments.length >= 3) {
      throw new BadRequestException('User cannot have more than 3 roles');
    }

    await this.prisma.userRoleAssignment.create({
      data: {
        userId,
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
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roleAssignments: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Ensure user has at least 2 roles before revoking
    if (user.roleAssignments.length <= 1) {
      throw new BadRequestException('User must have at least 1 role');
    }

    // Check if user has this role
    const hasRole = user.roleAssignments.some((ra) => ra.role === role);
    if (!hasRole) {
      throw new NotFoundException('User does not have this role');
    }

    await this.prisma.userRoleAssignment.deleteMany({
      where: {
        userId,
        role,
      },
    });

    // Update primary role if needed
    if (user.role === role) {
      const remainingRoles = user.roleAssignments
        .filter((ra) => ra.role !== role)
        .map((ra) => ra.role);
      
      if (remainingRoles.length > 0) {
        await this.prisma.user.update({
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
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roleAssignments: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user.roleAssignments.map((ra) => ra.role);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new ForbiddenException('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // Invalidate all other sessions
    await this.authService.logoutAllDevices(userId);

    this.logger.log({
      event: 'password_changed',
      userId,
      timestamp: new Date().toISOString(),
    });
  }

  private toResponseDto(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    phone: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    roleAssignments?: Array<{ role: UserRoleEnum }>;
  }): UserResponseDto {
    // Extract roles from roleAssignments, fallback to legacy role field
    const roles = user.roleAssignments
      ? user.roleAssignments.map((ra) => ra.role)
      : [user.role as UserRoleEnum];

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role as UserRoleEnum, // DEPRECATED: For backward compatibility
      roles: roles,
      phone: user.phone || undefined,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
