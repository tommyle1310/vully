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
  Matches,
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

  @ApiPropertyOptional({ description: 'Additional profile data as JSON' })
  profileData?: Record<string, unknown>;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  created_at: Date;

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

/**
 * DTO for updating own profile (non-admin users)
 * More restricted than UpdateUserDto - can't change roles, email, etc.
 */
export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Nguyen' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Van A' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: '+84901234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Profile data including avatarUrl, citizenId, taxId, etc.',
    example: { avatarUrl: 'https://...', citizenId: '123456789', taxId: 'TX123' },
  })
  @IsOptional()
  @IsObject()
  profileData?: {
    avatarUrl?: string;
    citizenId?: string;
    taxId?: string;
    dateOfBirth?: string;
    address?: string;
    [key: string]: unknown;
  };
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

// =============================================================================
// Technician Profile DTOs
// =============================================================================

const INCIDENT_CATEGORIES = [
  'plumbing', 'electrical', 'hvac', 'structural',
  'appliance', 'pest', 'noise', 'security', 'other',
] as const;

const AVAILABILITY_STATUSES = ['available', 'busy', 'off_duty'] as const;

const DAY_ABBREVIATIONS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

export class ShiftPreferencesDto {
  @ApiPropertyOptional({
    description: 'Preferred working days',
    example: ['mon', 'tue', 'wed', 'thu', 'fri'],
    enum: DAY_ABBREVIATIONS,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(DAY_ABBREVIATIONS, { each: true })
  preferredDays?: string[];

  @ApiPropertyOptional({
    description: 'Preferred working hours (HH:mm-HH:mm)',
    example: '08:00-17:00',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}-\d{2}:\d{2}$/, { message: 'Must be in HH:mm-HH:mm format' })
  preferredHours?: string;
}

export class UpdateTechnicianProfileDto {
  @ApiPropertyOptional({
    description: 'Technician specialties (incident categories)',
    example: ['plumbing', 'electrical'],
    enum: INCIDENT_CATEGORIES,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(INCIDENT_CATEGORIES, { each: true })
  specialties?: string[];

  @ApiPropertyOptional({
    description: 'Availability status',
    example: 'available',
    enum: AVAILABILITY_STATUSES,
  })
  @IsOptional()
  @IsEnum(AVAILABILITY_STATUSES)
  availabilityStatus?: string;

  @ApiPropertyOptional({
    description: 'Shift preferences',
    type: ShiftPreferencesDto,
  })
  @IsOptional()
  @IsObject()
  shiftPreferences?: ShiftPreferencesDto;
}

export class TechnicianListItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  email: string;

  @ApiPropertyOptional()
  profileData?: {
    avatarUrl?: string;
    specialties?: string[];
    availabilityStatus?: string;
  };

  @ApiProperty()
  workload: {
    assigned: number;
    inProgress: number;
    pendingReview: number;
    total: number;
  };
}

export class TechnicianDashboardStatsDto {
  @ApiProperty()
  assignedCount: number;

  @ApiProperty()
  inProgressCount: number;

  @ApiProperty()
  pendingReviewCount: number;

  @ApiProperty()
  resolvedThisMonth: number;

  @ApiProperty()
  avgResolutionHours: number;

  @ApiProperty()
  urgentCount: number;
}
