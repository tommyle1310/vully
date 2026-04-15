import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UtilityTypesService } from './utility-types.service';
import {
  CreateUtilityTypeDto,
  UpdateUtilityTypeDto,
  UtilityTypeResponseDto,
} from '../dto/utility-type.dto';
import { JwtAuthGuard } from '../../identity/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@ApiTags('Utility Types')
@Controller('utility-types')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UtilityTypesController {
  constructor(private readonly utilityTypesService: UtilityTypesService) {}

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create a new utility type (admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Utility type created',
    type: UtilityTypeResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Utility type code already exists' })
  async create(
    @Body() dto: CreateUtilityTypeDto,
  ): Promise<{ data: UtilityTypeResponseDto }> {
    const utilityType = await this.utilityTypesService.create(dto);
    return { data: utilityType };
  }

  @Get()
  @Roles('admin', 'technician', 'resident')
  @ApiOperation({ summary: 'List all utility types' })
  @ApiResponse({ status: 200, description: 'Utility types list' })
  async findAll(): Promise<{ data: UtilityTypeResponseDto[] }> {
    const utilityTypes = await this.utilityTypesService.findAll();
    return { data: utilityTypes };
  }

  @Get(':id')
  @Roles('admin', 'technician', 'resident')
  @ApiOperation({ summary: 'Get utility type by ID' })
  @ApiResponse({
    status: 200,
    description: 'Utility type details',
    type: UtilityTypeResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Utility type not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ data: UtilityTypeResponseDto }> {
    const utilityType = await this.utilityTypesService.findOne(id);
    return { data: utilityType };
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update utility type (admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Utility type updated',
    type: UtilityTypeResponseDto,
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUtilityTypeDto,
  ): Promise<{ data: UtilityTypeResponseDto }> {
    const utilityType = await this.utilityTypesService.update(id, dto);
    return { data: utilityType };
  }

  @Post('seed')
  @Roles('admin')
  @ApiOperation({ summary: 'Seed default utility types (electric, water, gas)' })
  @ApiResponse({ status: 201, description: 'Default utility types seeded' })
  async seed(): Promise<{ data: UtilityTypeResponseDto[] }> {
    const utilityTypes = await this.utilityTypesService.seedDefaults();
    return { data: utilityTypes };
  }
}
