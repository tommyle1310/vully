import { IsString, IsNotEmpty, IsOptional, IsUUID, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChatQueryDto {
  @ApiProperty({ description: 'User query/question', example: 'What are the payment terms?' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(1000)
  query: string;

  @ApiPropertyOptional({ description: 'Apartment ID for context' })
  @IsOptional()
  @IsUUID()
  apartmentId?: string;

  @ApiPropertyOptional({ description: 'Building ID for context' })
  @IsOptional()
  @IsUUID()
  buildingId?: string;
}

export class CreateDocumentDto {
  @ApiProperty({ description: 'Document title' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({ description: 'Document content' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ 
    description: 'Document category',
    example: 'building-rules',
    enum: ['building-rules', 'payment-policies', 'maintenance-procedures', 'faq'],
  })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}
