import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsOptional,
  IsBoolean,
  IsArray,
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

  @ApiPropertyOptional()
  svgMapData?: string;

  @ApiProperty()
  amenities: string[];

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Number of apartments in building' })
  apartmentCount?: number;
}

export class UpdateSvgMapDto {
  @ApiProperty({ description: 'SVG map data as string' })
  @IsString()
  svgMapData: string;
}
