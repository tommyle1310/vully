import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
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

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role || 'resident',
        phone: dto.phone,
        profileData: (dto.profileData || {}) as Prisma.InputJsonValue,
      },
    });

    // Audit log
    this.logger.log({
      event: 'user_created',
      actorId,
      targetUserId: user.id,
      role: user.role,
      timestamp: new Date().toISOString(),
    });

    return this.toResponseDto(user);
  }

  async findAll(page = 1, limit = 20): Promise<{ data: UserResponseDto[]; total: number }> {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ]);

    return {
      data: users.map(this.toResponseDto),
      total,
    };
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
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
    actorRole: string,
  ): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Prevent non-admins from changing roles
    if (dto.role && actorRole !== 'admin') {
      throw new ForbiddenException('Only admins can change user roles');
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {};

    if (dto.email) updateData.email = dto.email;
    if (dto.firstName) updateData.firstName = dto.firstName;
    if (dto.lastName) updateData.lastName = dto.lastName;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.profileData) updateData.profileData = dto.profileData;
    if (dto.role) updateData.role = dto.role;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    // Hash new password if provided
    if (dto.password) {
      updateData.passwordHash = await bcrypt.hash(dto.password, this.SALT_ROUNDS);
    }

    const oldRole = user.role;
    const updated = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    // Audit log for role change
    if (dto.role && dto.role !== oldRole) {
      this.logger.log({
        event: 'role_changed',
        actorId,
        targetUserId: id,
        oldRole,
        newRole: dto.role,
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

    return this.toResponseDto(updated);
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
  }): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role as UserResponseDto['role'],
      phone: user.phone || undefined,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
