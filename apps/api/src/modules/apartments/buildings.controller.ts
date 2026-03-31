import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { BuildingsService } from './buildings.service';
import {
  CreateBuildingDto,
  UpdateBuildingDto,
  BuildingResponseDto,
  UpdateSvgMapDto,
} from './dto/building.dto';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Buildings')
@Controller('buildings')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class BuildingsController {
  constructor(private readonly buildingsService: BuildingsService) {}

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create a new building (admin only)' })
  @ApiResponse({ status: 201, description: 'Building created', type: BuildingResponseDto })
  async create(@Body() dto: CreateBuildingDto): Promise<{ data: BuildingResponseDto }> {
    const building = await this.buildingsService.create(dto);
    return { data: building };
  }

  @Get()
  @ApiOperation({ summary: 'List all buildings' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Buildings list' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('includeInactive') includeInactive?: string,
  ): Promise<{
    data: BuildingResponseDto[];
    meta: { total: number; page: number; limit: number };
  }> {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '20', 10);
    const includeInactiveFlag = includeInactive === 'true';

    const result = await this.buildingsService.findAll(
      pageNum,
      limitNum,
      includeInactiveFlag,
    );

    return {
      data: result.data,
      meta: {
        total: result.total,
        page: pageNum,
        limit: limitNum,
      },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get building by ID' })
  @ApiResponse({ status: 200, description: 'Building details', type: BuildingResponseDto })
  @ApiResponse({ status: 404, description: 'Building not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ data: BuildingResponseDto }> {
    const building = await this.buildingsService.findOne(id);
    return { data: building };
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update building (admin only)' })
  @ApiResponse({ status: 200, description: 'Building updated', type: BuildingResponseDto })
  @ApiResponse({ status: 404, description: 'Building not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBuildingDto,
  ): Promise<{ data: BuildingResponseDto }> {
    const building = await this.buildingsService.update(id, dto);
    return { data: building };
  }

  @Patch(':id/svg-map')
  @Roles('admin')
  @ApiOperation({ summary: 'Update building SVG map (admin only)' })
  @ApiResponse({ status: 200, description: 'SVG map updated', type: BuildingResponseDto })
  async updateSvgMap(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSvgMapDto,
  ): Promise<{ data: BuildingResponseDto }> {
    const building = await this.buildingsService.updateSvgMap(id, dto.svgMapData);
    return { data: building };
  }
}
