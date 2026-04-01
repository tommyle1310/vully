import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsNumber,
  IsOptional,
  IsDateString,
  Min,
  Matches,
} from 'class-validator';

export class CreateMeterReadingDto {
  @ApiProperty({ description: 'Apartment ID' })
  @IsUUID()
  apartmentId: string;

  @ApiProperty({ description: 'Utility type ID (electric, water, gas)' })
  @IsUUID()
  utilityTypeId: string;

  @ApiProperty({ example: 1250.5, description: 'Current meter value' })
  @IsNumber()
  @Min(0)
  currentValue: number;

  @ApiPropertyOptional({ example: 1200, description: 'Previous meter value (auto-filled if exists)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  previousValue?: number;

  @ApiProperty({ example: '2026-03', description: 'Billing period in YYYY-MM format' })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'Billing period must be in YYYY-MM format' })
  billingPeriod: string;

  @ApiProperty({ example: '2026-03-25', description: 'Date when reading was taken' })
  @IsDateString()
  readingDate: string;

  @ApiPropertyOptional({ description: 'URL to proof image (if uploaded)' })
  @IsOptional()
  @IsString()
  imageProofUrl?: string;
}

export class UpdateMeterReadingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  currentValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  readingDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageProofUrl?: string;
}

export class MeterReadingFiltersDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  apartmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  utilityTypeId?: string;

  @ApiPropertyOptional({ example: '2026-03' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/)
  billingPeriod?: string;
}

export class MeterReadingResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  apartmentId: string;

  @ApiProperty()
  utilityTypeId: string;

  @ApiProperty()
  currentValue: number;

  @ApiPropertyOptional()
  previousValue?: number;

  @ApiProperty()
  usage: number; // currentValue - previousValue

  @ApiProperty()
  billingPeriod: string;

  @ApiProperty()
  readingDate: Date;

  @ApiPropertyOptional()
  recordedById?: string;

  @ApiPropertyOptional()
  imageProofUrl?: string;

  @ApiProperty()
  created_at: Date;

  // Nested relations
  @ApiPropertyOptional()
  apartment?: {
    id: string;
    unit_number: string;
    buildings: {
      id: string;
      name: string;
    };
  };

  @ApiPropertyOptional()
  utilityType?: {
    id: string;
    code: string;
    name: string;
    unit: string;
  };

  @ApiPropertyOptional()
  recordedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}
