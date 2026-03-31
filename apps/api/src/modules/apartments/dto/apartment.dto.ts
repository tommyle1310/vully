import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsOptional,
  IsUUID,
  IsEnum,
  IsNumber,
  Min,
  MaxLength,
  IsObject,
} from 'class-validator';

export class CreateApartmentDto {
  @ApiProperty({ description: 'Building ID' })
  @IsUUID()
  buildingId: string;

  @ApiProperty({ example: 'A-1201' })
  @IsString()
  @MaxLength(20)
  unitNumber: string;

  @ApiProperty({ example: 12 })
  @IsInt()
  @Min(1)
  floor: number;

  @ApiPropertyOptional({ example: 75.5 })
  @IsOptional()
  @IsNumber()
  areaSqm?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(0)
  bedroomCount?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  bathroomCount?: number;

  @ApiPropertyOptional({ description: 'Additional features as JSON' })
  @IsOptional()
  @IsObject()
  features?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'SVG element ID for map highlighting' })
  @IsOptional()
  @IsString()
  svgElementId?: string;
}

export class UpdateApartmentDto extends PartialType(CreateApartmentDto) {
  @ApiPropertyOptional({
    enum: ['vacant', 'occupied', 'maintenance', 'reserved'],
    description: 'Apartment status',
  })
  @IsOptional()
  @IsEnum(['vacant', 'occupied', 'maintenance', 'reserved'])
  status?: 'vacant' | 'occupied' | 'maintenance' | 'reserved';
}

export class ApartmentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  buildingId!: string;

  @ApiProperty()
  unitNumber!: string;

  @ApiProperty()
  floor!: number;

  @ApiProperty({ enum: ['vacant', 'occupied', 'maintenance', 'reserved'] })
  status!: string;

  @ApiPropertyOptional()
  areaSqm?: number;

  @ApiProperty()
  bedroomCount!: number;

  @ApiProperty()
  bathroomCount!: number;

  @ApiProperty()
  features!: Record<string, unknown>;

  @ApiPropertyOptional()
  svgElementId?: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiPropertyOptional({ description: 'Building info (when included)' })
  building?: {
    id: string;
    name: string;
    address: string;
  };
}

export class ApartmentFiltersDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  buildingId?: string;

  @ApiPropertyOptional({ enum: ['vacant', 'occupied', 'maintenance', 'reserved'] })
  @IsOptional()
  @IsEnum(['vacant', 'occupied', 'maintenance', 'reserved'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  floor?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  minBedrooms?: number;
}
