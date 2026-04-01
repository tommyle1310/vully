import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  IsBoolean,
  IsObject,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { UserRole } from '@vully/shared-types';

export class CreateUserDto {
  @ApiProperty({ example: 'user@vully.vn' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'Nguyen' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Van A' })
  @IsString()
  lastName: string;

  @ApiPropertyOptional({ example: 'resident', enum: ['admin', 'technician', 'resident'], deprecated: true })
  @IsOptional()
  @IsEnum(['admin', 'technician', 'resident'])
  role?: UserRole; // DEPRECATED: Use roles array instead

  @ApiPropertyOptional({
    description: 'User roles (1-3 roles allowed)',
    example: ['resident'],
    enum: ['admin', 'technician', 'resident'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(['admin', 'technician', 'resident'], { each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  roles?: UserRole[];

  @ApiPropertyOptional({ example: '+84901234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Additional profile data as JSON' })
  @IsOptional()
  @IsObject()
  profileData?: Record<string, unknown>;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional({ description: 'Deactivate user account' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty({ enum: ['admin', 'technician', 'resident'], deprecated: true })
  role: UserRole; // DEPRECATED: Use roles array instead

  @ApiProperty({
    description: 'User roles (1-3 roles)',
    enum: ['admin', 'technician', 'resident'],
    type: [String],
  })
  roles: UserRole[];

  @ApiPropertyOptional()
  phone?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class ChangePasswordDto {
  @ApiProperty({ description: 'Current password' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ description: 'New password', minLength: 8 })
  @IsString()
  @MinLength(8)
  newPassword: string;
}

export class ResetPasswordRequestDto {
  @ApiProperty({ example: 'user@vully.vn' })
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Password reset token' })
  @IsString()
  token: string;

  @ApiProperty({ description: 'New password', minLength: 8 })
  @IsString()
  @MinLength(8)
  newPassword: string;
}

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'Nguyen' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Van A' })
  @IsString()
  lastName: string;

  @ApiPropertyOptional({ example: '+84901234567' })
  @IsOptional()
  @IsString()
  phone?: string;
}
