import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, MaxLength } from 'class-validator';

export class CreateUtilityTypeDto {
  @ApiProperty({ example: 'electric', description: 'Unique code for utility type' })
  @IsString()
  @MaxLength(50)
  code: string;

  @ApiProperty({ example: 'Electricity', description: 'Display name' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'kWh', description: 'Unit of measurement' })
  @IsString()
  @MaxLength(20)
  unit: string;
}

export class UpdateUtilityTypeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UtilityTypeResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  unit: string;

  @ApiProperty()
  isActive: boolean;
}
