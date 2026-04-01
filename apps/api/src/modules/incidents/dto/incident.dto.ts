import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsUUID,
  IsOptional,
  IsArray,
  MaxLength,
  MinLength,
  IsUrl,
  ArrayMaxSize,
} from 'class-validator';
import { IncidentCategory, IncidentStatus, IncidentPriority } from '@prisma/client';

// =============================================================================
// CREATE INCIDENT DTO
// =============================================================================

export class CreateIncidentDto {
  @ApiProperty({ description: 'Incident title', maxLength: 255 })
  @IsString()
  @MinLength(5)
  @MaxLength(255)
  title: string;

  @ApiProperty({ description: 'Detailed description of the incident' })
  @IsString()
  @MinLength(10)
  description: string;

  @ApiProperty({ enum: IncidentCategory, description: 'Incident category' })
  @IsEnum(IncidentCategory)
  category: IncidentCategory;

  @ApiPropertyOptional({ enum: IncidentPriority, description: 'Priority level' })
  @IsOptional()
  @IsEnum(IncidentPriority)
  priority?: IncidentPriority;

  @ApiProperty({ description: 'Apartment ID' })
  @IsUUID()
  apartmentId: string;

  @ApiPropertyOptional({ description: 'Image URLs (max 5)', type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsUrl({}, { each: true })
  imageUrls?: string[];
}

// =============================================================================
// UPDATE INCIDENT DTO
// =============================================================================

export class UpdateIncidentDto extends PartialType(CreateIncidentDto) {
  @ApiPropertyOptional({ enum: IncidentStatus, description: 'New status' })
  @IsOptional()
  @IsEnum(IncidentStatus)
  status?: IncidentStatus;

  @ApiPropertyOptional({ description: 'Technician ID to assign' })
  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @ApiPropertyOptional({ description: 'Resolution notes (when resolving)' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  resolutionNotes?: string;
}

// =============================================================================
// ASSIGN TECHNICIAN DTO
// =============================================================================

export class AssignTechnicianDto {
  @ApiProperty({ description: 'Technician user ID' })
  @IsUUID()
  technicianId: string;
}

// =============================================================================
// UPDATE STATUS DTO
// =============================================================================

export class UpdateIncidentStatusDto {
  @ApiProperty({ enum: IncidentStatus, description: 'New status' })
  @IsEnum(IncidentStatus)
  status: IncidentStatus;

  @ApiPropertyOptional({ description: 'Resolution notes (required when resolving)' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  resolutionNotes?: string;
}

// =============================================================================
// FILTERS DTO
// =============================================================================

export class IncidentFiltersDto {
  @ApiPropertyOptional({ description: 'Filter by apartment ID' })
  @IsOptional()
  @IsUUID()
  apartmentId?: string;

  @ApiPropertyOptional({ enum: IncidentStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(IncidentStatus)
  status?: IncidentStatus;

  @ApiPropertyOptional({ enum: IncidentCategory, description: 'Filter by category' })
  @IsOptional()
  @IsEnum(IncidentCategory)
  category?: IncidentCategory;

  @ApiPropertyOptional({ enum: IncidentPriority, description: 'Filter by priority' })
  @IsOptional()
  @IsEnum(IncidentPriority)
  priority?: IncidentPriority;

  @ApiPropertyOptional({ description: 'Filter by assigned technician ID' })
  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @ApiPropertyOptional({ description: 'Filter by reporter ID' })
  @IsOptional()
  @IsUUID()
  reportedById?: string;

  @ApiPropertyOptional({ description: 'Filter by building ID' })
  @IsOptional()
  @IsUUID()
  buildingId?: string;

  @ApiPropertyOptional({ description: 'Search in title and description' })
  @IsOptional()
  @IsString()
  search?: string;
}

// =============================================================================
// RESPONSE DTO
// =============================================================================

export class IncidentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  apartmentId: string;

  @ApiProperty()
  reportedById: string;

  @ApiPropertyOptional()
  assignedToId?: string;

  @ApiProperty({ enum: IncidentCategory })
  category: IncidentCategory;

  @ApiProperty({ enum: IncidentPriority })
  priority: IncidentPriority;

  @ApiProperty({ enum: IncidentStatus })
  status: IncidentStatus;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ type: [String] })
  imageUrls: string[];

  @ApiPropertyOptional()
  resolved_at?: Date;

  @ApiPropertyOptional()
  resolutionNotes?: string;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  apartment?: {
    id: string;
    unit_number: string;
    building?: {
      id: string;
      name: string;
    };
  };

  @ApiPropertyOptional()
  reportedBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };

  @ApiPropertyOptional()
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };

  @ApiPropertyOptional()
  commentsCount?: number;
}
