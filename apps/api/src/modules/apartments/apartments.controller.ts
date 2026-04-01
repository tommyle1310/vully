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
  @ApiQuery({ name: 'status', required: false, enum: ['vacant', 'occupied', 'maintenance', 'reserved'] })
  @ApiQuery({ name: 'floor', required: false, type: Number })
  @ApiQuery({ name: 'unitType', required: false, enum: ['studio', 'one_bedroom', 'two_bedroom', 'three_bedroom', 'duplex', 'penthouse', 'shophouse'] })
  @ApiQuery({ name: 'orientation', required: false, enum: ['north', 'south', 'east', 'west', 'northeast', 'northwest', 'southeast', 'southwest'] })
  @ApiQuery({ name: 'ownerId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Apartments list' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('buildingId') buildingId?: string,
    @Query('status') status?: string,
    @Query('floor') floor?: string,
    @Query('unitType') unitType?: string,
    @Query('orientation') orientation?: string,
    @Query('ownerId') ownerId?: string,
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

    const filters: ApartmentFiltersDto = {
      buildingId,
      status: status as ApartmentFiltersDto['status'],
      floor: floor ? parseInt(floor, 10) : undefined,
      unitType: unitType as ApartmentFiltersDto['unitType'],
      orientation: orientation as ApartmentFiltersDto['orientation'],
      ownerId,
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
