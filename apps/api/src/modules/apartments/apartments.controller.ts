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
import { ApartmentsService } from './apartments.service';
import {
  CreateApartmentDto,
  UpdateApartmentDto,
  ApartmentResponseDto,
  ApartmentFiltersDto,
} from './dto/apartment.dto';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

interface AuthUser {
  id: string;
  email: string;
  role: string;
}

@ApiTags('Apartments')
@Controller('apartments')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ApartmentsController {
  constructor(private readonly apartmentsService: ApartmentsService) {}

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create a new apartment (admin only)' })
  @ApiResponse({ status: 201, description: 'Apartment created', type: ApartmentResponseDto })
  async create(@Body() dto: CreateApartmentDto): Promise<{ data: ApartmentResponseDto }> {
    const apartment = await this.apartmentsService.create(dto);
    return { data: apartment };
  }

  @Get()
  @Roles('admin', 'technician', 'resident')
  @ApiOperation({ summary: 'List apartments' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'buildingId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, isArray: true, enum: ['vacant', 'occupied', 'maintenance', 'reserved'] })
  @ApiQuery({ name: 'unitType', required: false, isArray: true, enum: ['studio', 'one_bedroom', 'two_bedroom', 'three_bedroom', 'duplex', 'penthouse', 'shophouse'] })
  @ApiQuery({ name: 'minBedrooms', required: false, type: Number })
  @ApiQuery({ name: 'maxBedrooms', required: false, type: Number })
  @ApiQuery({ name: 'minFloor', required: false, type: Number })
  @ApiQuery({ name: 'maxFloor', required: false, type: Number })
  @ApiQuery({ name: 'minArea', required: false, type: Number })
  @ApiQuery({ name: 'maxArea', required: false, type: Number })
  @ApiQuery({ name: 'orientation', required: false, enum: ['north', 'south', 'east', 'west', 'northeast', 'northwest', 'southeast', 'southwest'] })
  @ApiQuery({ name: 'ownerId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Apartments list' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('buildingId') buildingId?: string,
    @Query('status') status?: string | string[],
    @Query('unitType') unitType?: string | string[],
    @Query('minBedrooms') minBedrooms?: string,
    @Query('maxBedrooms') maxBedrooms?: string,
    @Query('minFloor') minFloor?: string,
    @Query('maxFloor') maxFloor?: string,
    @Query('minArea') minArea?: string,
    @Query('maxArea') maxArea?: string,
    @Query('orientation') orientation?: string,
    @Query('ownerId') ownerId?: string,
    @Query('search') search?: string,
    @CurrentUser() user?: AuthUser,
  ): Promise<{
    data: ApartmentResponseDto[];
    meta: { total: number; page: number; limit: number };
  }> {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '20', 10);

    // Residents can only see their own apartment
    if (user?.role === 'resident') {
      const apartment = await this.apartmentsService.findByResident(user.id);
      return {
        data: apartment ? [apartment] : [],
        meta: {
          total: apartment ? 1 : 0,
          page: 1,
          limit: limitNum,
        },
      };
    }

    // Normalize status and unitType to arrays for consistent handling
    const normalizeToArray = (value: string | string[] | undefined): string[] | undefined => {
      if (!value) return undefined;
      return Array.isArray(value) ? value : [value];
    };

    const filters: ApartmentFiltersDto = {
      buildingId,
      status: normalizeToArray(status),
      unitType: normalizeToArray(unitType),
      minBedrooms: minBedrooms ? parseInt(minBedrooms, 10) : undefined,
      maxBedrooms: maxBedrooms ? parseInt(maxBedrooms, 10) : undefined,
      minFloor: minFloor ? parseInt(minFloor, 10) : undefined,
      maxFloor: maxFloor ? parseInt(maxFloor, 10) : undefined,
      minArea: minArea ? parseFloat(minArea) : undefined,
      maxArea: maxArea ? parseFloat(maxArea) : undefined,
      orientation: orientation as ApartmentFiltersDto['orientation'],
      ownerId,
      search,
    };

    const result = await this.apartmentsService.findAll(filters, pageNum, limitNum);

    return {
      data: result.data,
      meta: {
        total: result.total,
        page: pageNum,
        limit: limitNum,
      },
    };
  }

  @Get('my')
  @Roles('resident')
  @ApiOperation({ summary: 'Get current resident\'s apartment' })
  @ApiResponse({ status: 200, description: 'Resident\'s apartment' })
  async findMyApartment(
    @CurrentUser() user: AuthUser,
  ): Promise<{ data: ApartmentResponseDto | null }> {
    const apartment = await this.apartmentsService.findByResident(user.id);
    return { data: apartment };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get apartment by ID' })
  @ApiResponse({ status: 200, description: 'Apartment details', type: ApartmentResponseDto })
  @ApiResponse({ status: 404, description: 'Apartment not found' })
  @ApiResponse({ status: 403, description: 'Access denied (residents only see their own)' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<{ data: ApartmentResponseDto }> {
    let apartments: ApartmentResponseDto;

    if (user.role === 'resident') {
      apartments = await this.apartmentsService.findOneForResident(id, user.id);
    } else {
      apartments = await this.apartmentsService.findOne(id);
    }

    return { data: apartments };
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update apartment (admin only)' })
  @ApiResponse({ status: 200, description: 'Apartment updated', type: ApartmentResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateApartmentDto,
  ): Promise<{ data: ApartmentResponseDto }> {
    const apartment = await this.apartmentsService.update(id, dto);
    return { data: apartment };
  }

  @Patch(':id/status')
  @Roles('admin', 'technician')
  @ApiOperation({ summary: 'Update apartment status' })
  @ApiResponse({ status: 200, description: 'Status updated', type: ApartmentResponseDto })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: 'vacant' | 'occupied' | 'maintenance' | 'reserved',
  ): Promise<{ data: ApartmentResponseDto }> {
    const apartment = await this.apartmentsService.updateStatus(id, status);
    return { data: apartment };
  }
}
