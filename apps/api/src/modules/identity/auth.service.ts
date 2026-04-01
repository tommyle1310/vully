import { Injectable, UnauthorizedException, ConflictException, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@vully/shared-types';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LoginDto, LoginResponseDto, RefreshResponseDto } from './dto/login.dto';
import { RegisterDto, UserResponseDto, ResetPasswordRequestDto, ResetPasswordDto } from './dto/user.dto';
import { JwtPayload } from './interfaces/auth.interface';
import { randomBytes, createHash } from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.users.findUnique({
      where: { email },
      include: {
        user_role_assignments: true, // Include roles for JWT payload
      },
    });

    if (!user || !user.is_active) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async register(dto: RegisterDto): Promise<UserResponseDto> {
    // Check if email already exists
    const existing = await this.prisma.users.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Create user with default resident role assignment
    const user = await this.prisma.users.create({
      data: {
        email: dto.email,
        password_hash: passwordHash,
        first_name: dto.firstName,
        last_name: dto.lastName,
        role: 'resident', // DEPRECATED field, kept for migration
        phone: dto.phone,
        updated_at: new Date(),
        user_role_assignments: {
          create: {
            role: UserRole.resident, // Default role for public registration
          },
        },
      },
      include: {
        user_role_assignments: true,
      },
    });

    this.logger.log({
      event: 'user_registered',
      userId: user.id,
      email: user.email,
      timestamp: new Date().toISOString(),
    });

    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role as UserRole, // DEPRECATED, will be removed
      roles: user.user_role_assignments.map((ra: { role: string }) => ra.role as UserRole),
      phone: user.phone || undefined,
      isActive: user.is_active,
      created_at: user.created_at,
      updatedAt: user.updated_at,
    };
  }

  async login(dto: LoginDto, ip: string, userAgent: string): Promise<LoginResponseDto> {
    const user = await this.validateUser(dto.email, dto.password);

    if (!user) {
      // Log failed attempt
      this.logger.warn({
        event: 'login_failed',
        email: dto.email,
        ip,
        userAgent,
        timestamp: new Date().toISOString(),
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    // Extract roles from user_role_assignments (multi-role support)
    const roles = user.user_role_assignments.map((ra: { role: string }) => ra.role as UserRole);

    // Generate tokens
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roles, // Array of roles (1-3 roles)
    };

    const accessToken = await this.generateAccessToken(payload);
    const refreshToken = await this.generateRefreshToken(user.id, ip, userAgent);

    // Log successful login
    this.logger.log({
      event: 'login_success',
      userId: user.id,
      ip,
      userAgent,
      timestamp: new Date().toISOString(),
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.configService.get<number>('jwt.accessExpiresIn', 900), // 15 min
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role, // DEPRECATED, kept for backward compatibility
        roles, // New multi-role array
      },
    };
  }

  async refresh(refreshToken: string, ip: string): Promise<RefreshResponseDto> {
    const tokenHash = this.hashToken(refreshToken);

    const storedToken = await this.prisma.refresh_tokens.findUnique({
      where: { token_hash: tokenHash },
      include: {
        users: {
          include: {
            user_role_assignments: true, // Include roles for JWT
          },
        },
      },
    });

    if (
      !storedToken ||
      storedToken.is_revoked ||
      storedToken.expires_at < new Date() ||
      !storedToken.users.is_active
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Revoke old token (token rotation)
    await this.prisma.refresh_tokens.update({
      where: { id: storedToken.id },
      data: { is_revoked: true },
    });

    // Extract roles from user_role_assignments
    const roles = storedToken.users.user_role_assignments.map((ra: { role: string }) => ra.role as UserRole);

    // Generate new tokens
    const payload: JwtPayload = {
      sub: storedToken.users.id,
      email: storedToken.users.email,
      roles, // Multi-role array
    };

    const newAccessToken = await this.generateAccessToken(payload);
    const newRefreshToken = await this.generateRefreshToken(
      storedToken.users.id,
      ip,
      storedToken.user_agent || '',
    );

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: this.configService.get<number>('jwt.accessExpiresIn', 900),
    };
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);

    await this.prisma.refresh_tokens.updateMany({
      where: { token_hash: tokenHash },
      data: { is_revoked: true },
    });
  }

  async logoutAllDevices(userId: string): Promise<void> {
    await this.prisma.refresh_tokens.updateMany({
      where: { user_id: userId, is_revoked: false },
      data: { is_revoked: true },
    });

    this.logger.log({
      event: 'logout_all_devices',
      userId,
      timestamp: new Date().toISOString(),
    });
  }

  private async generateAccessToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('jwt.secret'),
      expiresIn: this.configService.get<string>('jwt.accessExpiresIn', '15m'),
    });
  }

  private async generateRefreshToken(
    userId: string,
    ip: string,
    userAgent: string,
  ): Promise<string> {
    const token = randomBytes(64).toString('hex');
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date();
    expiresAt.setDate(
      expiresAt.getDate() + this.configService.get<number>('jwt.refreshExpiresInDays', 7),
    );

    await this.prisma.refresh_tokens.create({
      data: {
        token_hash: tokenHash,
        user_id: userId,
        expires_at: expiresAt,
        ip_address: ip,
        user_agent: userAgent,
      },
    });

    return token;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Request a password reset. Generates a token and logs it (in production, would send email).
   */
  async forgotPassword(dto: ResetPasswordRequestDto): Promise<{ message: string }> {
    const user = await this.prisma.users.findUnique({
      where: { email: dto.email },
    });

    // Always return success message to prevent email enumeration
    const successMessage = 'If an account with that email exists, a password reset link has been sent.';

    if (!user || !user.is_active) {
      return { message: successMessage };
    }

    // Invalidate any existing reset tokens for this user
    await this.prisma.password_reset_tokens.updateMany({
      where: { user_id: user.id, is_used: false },
      data: { is_used: true },
    });

    // Generate a new reset token
    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

    await this.prisma.password_reset_tokens.create({
      data: {
        user_id: user.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
      },
    });

    // In production, send email. For now, log the token.
    this.logger.log({
      event: 'password_reset_requested',
      userId: user.id,
      email: user.email,
      resetToken: token, // Only log in development!
      resetUrl: `/auth/reset-password?token=${token}`,
      expiresAt: expiresAt.toISOString(),
      timestamp: new Date().toISOString(),
    });

    return { message: successMessage };
  }

  /**
   * Reset password using a valid token.
   */
  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const tokenHash = this.hashToken(dto.token);

    const resetToken = await this.prisma.password_reset_tokens.findUnique({
      where: { token_hash: tokenHash },
      include: { users: true },
    });

    if (
      !resetToken ||
      resetToken.is_used ||
      resetToken.expires_at < new Date() ||
      !resetToken.users.is_active
    ) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(dto.newPassword, 12);

    // Update user password and mark token as used
    await this.prisma.$transaction([
      this.prisma.users.update({
        where: { id: resetToken.user_id },
        data: { password_hash: passwordHash },
      }),
      this.prisma.password_reset_tokens.update({
        where: { id: resetToken.id },
        data: { is_used: true },
      }),
      // Revoke all refresh tokens (force logout all devices)
      this.prisma.refresh_tokens.updateMany({
        where: { user_id: resetToken.user_id, is_revoked: false },
        data: { is_revoked: true },
      }),
    ]);

    this.logger.log({
      event: 'password_reset_completed',
      userId: resetToken.user_id,
      timestamp: new Date().toISOString(),
    });

    return { message: 'Password has been reset successfully. Please log in with your new password.' };
  }
}
