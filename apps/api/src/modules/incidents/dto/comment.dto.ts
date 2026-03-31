import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, MaxLength, MinLength } from 'class-validator';

// =============================================================================
// CREATE COMMENT DTO
// =============================================================================

export class CreateIncidentCommentDto {
  @ApiProperty({ description: 'Comment content', maxLength: 2000 })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content: string;

  @ApiPropertyOptional({
    description: 'Internal comment (visible only to admin/technician)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
}

// =============================================================================
// UPDATE COMMENT DTO
// =============================================================================

export class UpdateIncidentCommentDto {
  @ApiPropertyOptional({ description: 'Updated comment content', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content?: string;

  @ApiPropertyOptional({
    description: 'Internal comment (visible only to admin/technician)',
  })
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
}

// =============================================================================
// RESPONSE DTO
// =============================================================================

export class IncidentCommentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  incidentId: string;

  @ApiProperty()
  authorId: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  isInternal: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  author?: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}
