import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../common/prisma/prisma.service';

// Mock bcrypt
jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: jest.Mocked<PrismaService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@vully.vn',
    passwordHash: 'hashedPassword',
    role: 'admin',
    firstName: 'Test',
    lastName: 'User',
    phone: null,
    profileData: {},
    is_active: true,
    created_at: new Date(),
    updatedAt: new Date(),
  };

  const mockRefreshToken = {
    id: 'token-id',
    userId: mockUser.id,
    tokenHash: 'hashedToken',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    ipAddress: '127.0.0.1',
    userAgent: 'jest',
    isRevoked: false,
    created_at: new Date(),
    user: mockUser,
  };

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        findUnique: jest.fn(),
      },
      refreshToken: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    const mockJwtService = {
      signAsync: jest.fn().mockResolvedValue('mocked-jwt-token'),
    };

    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        const config: Record<string, unknown> = {
          'jwt.secret': 'test-secret',
          'jwt.accessExpiresIn': '15m',
          'jwt.refreshExpiresInDays': 7,
        };
        return config[key] ?? defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get(PrismaService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should return user if credentials are valid', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test@vully.vn', 'password');

      expect(result).toEqual(mockUser);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@vully.vn' },
      });
    });

    it('should return null if user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.validateUser('invalid@vully.vn', 'password');

      expect(result).toBeNull();
    });

    it('should return null if user is inactive', async () => {
      prismaService.user.findUnique.mockResolvedValue({ ...mockUser, isActive: false });

      const result = await service.validateUser('test@vully.vn', 'password');

      expect(result).toBeNull();
    });

    it('should return null if password is invalid', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser('test@vully.vn', 'wrongpassword');

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should return tokens and user data on successful login', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      prismaService.refreshToken.create.mockResolvedValue(mockRefreshToken);

      const result = await service.login(
        { email: 'test@vully.vn', password: 'password' },
        '127.0.0.1',
        'jest-agent',
      );

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe(mockUser.email);
      expect(jwtService.signAsync).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException on invalid credentials', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login(
          { email: 'invalid@vully.vn', password: 'password' },
          '127.0.0.1',
          'jest-agent',
        ),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('should return new tokens on valid refresh token', async () => {
      prismaService.refreshToken.findUnique.mockResolvedValue(mockRefreshToken);
      prismaService.refreshToken.update.mockResolvedValue({ ...mockRefreshToken, isRevoked: true });
      prismaService.refreshToken.create.mockResolvedValue(mockRefreshToken);

      const result = await service.refresh('valid-refresh-token', '127.0.0.1');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(prismaService.refreshToken.update).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException on revoked token', async () => {
      prismaService.refreshToken.findUnique.mockResolvedValue({
        ...mockRefreshToken,
        isRevoked: true,
      });

      await expect(service.refresh('revoked-token', '127.0.0.1')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException on expired token', async () => {
      prismaService.refreshToken.findUnique.mockResolvedValue({
        ...mockRefreshToken,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(service.refresh('expired-token', '127.0.0.1')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException on inactive user', async () => {
      prismaService.refreshToken.findUnique.mockResolvedValue({
        ...mockRefreshToken,
        user: { ...mockUser, isActive: false },
      });

      await expect(service.refresh('inactive-user-token', '127.0.0.1')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('should revoke the refresh token', async () => {
      prismaService.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      await service.logout('some-refresh-token');

      expect(prismaService.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { tokenHash: expect.any(String) },
        data: { isRevoked: true },
      });
    });
  });

  describe('logoutAllDevices', () => {
    it('should revoke all refresh tokens for user', async () => {
      prismaService.refreshToken.updateMany.mockResolvedValue({ count: 3 });

      await service.logoutAllDevices(mockUser.id);

      expect(prismaService.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: mockUser.id, isRevoked: false },
        data: { isRevoked: true },
      });
    });
  });
});
