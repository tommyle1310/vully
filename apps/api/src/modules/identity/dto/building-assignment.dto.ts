import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsEnum, IsOptional } from 'class-validator';
import { UserRole } from '@vully/shared-types';

/**
 * Create Building Assignment DTO
 */
export class CreateBuildingAssignmentDto {
  @ApiProperty({ description: 'Building ID to assign' })
  @IsUUID()
  buildingId: string;

  @ApiProperty({ description: 'Role for this building', enum: UserRole })
  @IsEnum(UserRole)
  role: UserRole;
}

/**
 * Update Building Assignment DTO
 */
export class UpdateBuildingAssignmentDto {
  @ApiPropertyOptional({ description: 'Updated role for this building', enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

/**
 * Building Assignment Response DTO
 */
export class BuildingAssignmentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  user_id: string;

  @ApiProperty()
  building_id: string;

  @ApiProperty({ enum: UserRole })
  role: UserRole;

  @ApiProperty()
  assigned_at: Date;

  @ApiPropertyOptional()
  assigned_by?: string;

  @ApiPropertyOptional()
  building_name?: string;

  @ApiPropertyOptional()
  building_address?: string;

  @ApiPropertyOptional({ description: 'User details (included when querying by building)' })
  user?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}
