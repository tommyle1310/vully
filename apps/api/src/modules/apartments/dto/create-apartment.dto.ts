import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsOptional,
  IsUUID,
  IsEnum,
  IsNumber,
  IsBoolean,
  Min,
  MaxLength,
  IsObject,
} from 'class-validator';
import { UNIT_TYPES, ORIENTATIONS } from './apartment-constants';

// Cross-field validations (enforced in service layer, not DTO decorators):
// - netArea must be <= grossArea when both are provided
// - floorIndex must be < building.floorCount (requires building lookup)
export class CreateApartmentDto {
  @ApiProperty({ description: 'Building ID' })
  @IsUUID()
  buildingId: string;

  @ApiProperty({ example: 'A-1201' })
  @IsString()
  @MaxLength(20)
  unit_number: string;

  @ApiProperty({ example: 12, description: 'Zero-based floor index for 3D positioning' })
  @IsInt()
  @Min(0)
  floorIndex: number;

  // --- Spatial ---
  @ApiPropertyOptional({ example: 'A-12.05', description: 'Human-readable apartment code' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  apartmentCode?: string;

  @ApiPropertyOptional({ example: '12A', description: 'Display name for the floor' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  floorLabel?: string;

  @ApiPropertyOptional({ enum: UNIT_TYPES, description: 'Unit type classification' })
  @IsOptional()
  @IsEnum(UNIT_TYPES)
  unitType?: typeof UNIT_TYPES[number];

  @ApiPropertyOptional({ example: 65.5, description: 'Net area (thông thủy) in m²' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  netArea?: number;

  @ApiPropertyOptional({ example: 75.5, description: 'Gross area (tim tường) in m²' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  grossArea?: number;

  @ApiPropertyOptional({ example: 3.2, description: 'Ceiling height in meters' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  ceilingHeight?: number;

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

  @ApiPropertyOptional({ description: 'Raw SVG path data for programmatic floor plans' })
  @IsOptional()
  @IsString()
  svgPathData?: string;

  @ApiPropertyOptional({ description: 'Centroid X in SVG space' })
  @IsOptional()
  @IsNumber()
  centroidX?: number;

  @ApiPropertyOptional({ description: 'Centroid Y in SVG space' })
  @IsOptional()
  @IsNumber()
  centroidY?: number;

  @ApiPropertyOptional({ enum: ORIENTATIONS, description: 'Main facing direction' })
  @IsOptional()
  @IsEnum(ORIENTATIONS)
  orientation?: typeof ORIENTATIONS[number];

  @ApiPropertyOptional({ enum: ORIENTATIONS, description: 'Balcony facing direction' })
  @IsOptional()
  @IsEnum(ORIENTATIONS)
  balconyDirection?: typeof ORIENTATIONS[number];

  @ApiPropertyOptional({ description: 'Whether this is a corner unit' })
  @IsOptional()
  @IsBoolean()
  isCornerUnit?: boolean;
}
