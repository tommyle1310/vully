import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { UserRole } from '@vully/shared-types';

export class LoginDto {
  @ApiProperty({ example: 'admin@vully.vn', description: 'User email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', description: 'User password' })
  @IsString()
  @MinLength(8)
  password: string;
}

export class LoginResponseDto {
  @ApiProperty({ description: 'JWT access token' })
  accessToken: string;

  @ApiProperty({ description: 'Refresh token for obtaining new access tokens' })
  refreshToken: string;

  @ApiProperty({ description: 'Token expiration in seconds' })
  expiresIn: number;

  @ApiProperty({ description: 'User profile data' })
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string; // DEPRECATED
    roles: UserRole[]; // Multi-role support
    avatarUrl?: string; // User profile avatar
  };
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token' })
  @IsString()
  refreshToken: string;
}

export class RefreshResponseDto {
  @ApiProperty({ description: 'New JWT access token' })
  accessToken: string;

  @ApiProperty({ description: 'New refresh token' })
  refreshToken: string;

  @ApiProperty({ description: 'Token expiration in seconds' })
  expiresIn: number;
}
