import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsOptional,
  IsBoolean,
  IsArray,
  IsObject,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateBuildingDto {
  @ApiProperty({ example: 'Vully Tower A' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: '123 Nguyen Hue, District 1' })
  @IsString()
  address: string;

  @ApiProperty({ example: 'Ho Chi Minh City' })
  @IsString()
  @MaxLength(100)
  city: string;

  @ApiProperty({ example: 25 })
  @IsInt()
  @Min(1)
  floorCount: number;

  @ApiPropertyOptional({ 
    description: 'Floor heights in meters per floor number', 
    example: { "1": 3.5, "2": 3.2, "3": 3.0 } 
  })
  @IsOptional()
  @IsObject()
  floorHeights?: Record<string, number>;

  @ApiPropertyOptional({ description: 'SVG map data for floor plan' })
  @IsOptional()
  @IsString()
  svgMapData?: string;

  @ApiPropertyOptional({ example: ['gym', 'pool', 'parking'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];
}

export class UpdateBuildingDto extends PartialType(CreateBuildingDto) {
  @ApiPropertyOptional({ description: 'Deactivate building' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class BuildingResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  address: string;

  @ApiProperty()
  city: string;

  @ApiProperty()
  floorCount: number;

  @ApiPropertyOptional({ description: 'Floor heights in meters per floor number' })
  floorHeights?: Record<string, number>;

  @ApiPropertyOptional()
  svgMapData?: string;

  @ApiProperty()
  amenities: string[];

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Number of apartments in building' })
  apartmentCount?: number;
}

export class UpdateSvgMapDto {
  @ApiProperty({ description: 'SVG map data as string' })
  @IsString()
  svgMapData: string;

  @ApiPropertyOptional({ 
    description: 'Floor heights in meters per floor number',
    example: { "1": 3.5, "2": 3.2 }
  })
  @IsOptional()
  @IsObject()
  floorHeights?: Record<string, number>;
}

export class BuildingStatsResponseDto {
  @ApiProperty({ example: 100, description: 'Total apartments in building' })
  totalApartments: number;

  @ApiProperty({ example: 75, description: 'Number of occupied apartments' })
  occupied: number;

  @ApiProperty({ example: 20, description: 'Number of vacant apartments' })
  vacant: number;

  @ApiProperty({ example: 3, description: 'Number of apartments under maintenance' })
  maintenance: number;

  @ApiProperty({ example: 2, description: 'Number of reserved apartments' })
  reserved: number;

  @ApiProperty({ example: 75.0, description: 'Occupancy rate percentage' })
  occupancyRate: number;
}

export class MeterInfoDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  apartmentId: string;

  @ApiProperty({ example: '101' })
  unitNumber: string;

  @ApiPropertyOptional({ example: 'ELEC-001' })
  electricMeterId?: string | null;

  @ApiPropertyOptional({ example: 'WATER-001' })
  waterMeterId?: string | null;

  @ApiPropertyOptional({ example: 'GAS-001' })
  gasMeterId?: string | null;
}

export class BuildingMetersResponseDto {
  @ApiProperty({ type: [MeterInfoDto] })
  meters: MeterInfoDto[];

  @ApiProperty({ example: ['ELEC-001', 'WATER-002'], description: 'Meter IDs that appear more than once' })
  duplicates: string[];
}
