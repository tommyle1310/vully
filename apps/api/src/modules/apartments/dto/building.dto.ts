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
