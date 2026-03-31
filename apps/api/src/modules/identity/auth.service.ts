import { Injectable, UnauthorizedException, ConflictException, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LoginDto, LoginResponseDto, RefreshResponseDto } from './dto/login.dto';
import { RegisterDto, UserResponseDto, ResetPasswordRequestDto, ResetPasswordDto } from './dto/user.dto';
import { randomBytes, createHash } from 'crypto';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.isActive) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async register(dto: RegisterDto): Promise<UserResponseDto> {
    // Check if email already exists
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: 'resident', // Public registration always creates resident
        phone: dto.phone,
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
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      phone: user.phone || undefined,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
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

    // Generate tokens
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
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
      expiresIn: this.configService.get<number>('jwt.accessExpiresIn', 900), // 15 min
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  async refresh(refreshToken: string, ip: string): Promise<RefreshResponseDto> {
    const tokenHash = this.hashToken(refreshToken);

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (
      !storedToken ||
      storedToken.isRevoked ||
      storedToken.expiresAt < new Date() ||
      !storedToken.user.isActive
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Revoke old token (token rotation)
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true },
    });

    // Generate new tokens
    const payload: JwtPayload = {
      sub: storedToken.user.id,
      email: storedToken.user.email,
      role: storedToken.user.role,
    };

    const newAccessToken = await this.generateAccessToken(payload);
    const newRefreshToken = await this.generateRefreshToken(
      storedToken.user.id,
      ip,
      storedToken.userAgent || '',
    );

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: this.configService.get<number>('jwt.accessExpiresIn', 900),
    };
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);

    await this.prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { isRevoked: true },
    });
  }

  async logoutAllDevices(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
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

    await this.prisma.refreshToken.create({
      data: {
        tokenHash,
        userId,
        expiresAt,
        ipAddress: ip,
        userAgent,
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
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    // Always return success message to prevent email enumeration
    const successMessage = 'If an account with that email exists, a password reset link has been sent.';

    if (!user || !user.isActive) {
      return { message: successMessage };
    }

    // Invalidate any existing reset tokens for this user
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, isUsed: false },
      data: { isUsed: true },
    });

    // Generate a new reset token
    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
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

    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (
      !resetToken ||
      resetToken.isUsed ||
      resetToken.expiresAt < new Date() ||
      !resetToken.user.isActive
    ) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(dto.newPassword, 12);

    // Update user password and mark token as used
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { isUsed: true },
      }),
      // Revoke all refresh tokens (force logout all devices)
      this.prisma.refreshToken.updateMany({
        where: { userId: resetToken.userId, isRevoked: false },
        data: { isRevoked: true },
      }),
    ]);

    this.logger.log({
      event: 'password_reset_completed',
      userId: resetToken.userId,
      timestamp: new Date().toISOString(),
    });

    return { message: 'Password has been reset successfully. Please log in with your new password.' };
  }
}
