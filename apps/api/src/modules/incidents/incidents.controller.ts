import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { IncidentStatus, IncidentCategory, IncidentPriority } from '@prisma/client';
import { IncidentsService } from './incidents.service';
import {
  CreateIncidentDto,
  UpdateIncidentDto,
  AssignTechnicianDto,
  UpdateIncidentStatusDto,
  IncidentFiltersDto,
  IncidentResponseDto,
} from './dto';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/interfaces/auth-user.interface';

@ApiTags('Incidents')
@Controller('incidents')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class IncidentsController {
  constructor(
    private readonly incidentsService: IncidentsService,
  ) {}

  @Post()
  @Roles('admin', 'resident')
  @ApiOperation({ summary: 'Report a new incident' })
  @ApiResponse({ status: 201, description: 'Incident created', type: IncidentResponseDto })
  @ApiResponse({ status: 403, description: 'Residents can only report for their own apartments' })
  @ApiResponse({ status: 404, description: 'Apartment not found' })
  async create(
    @Body() dto: CreateIncidentDto,
    @CurrentUser() user: AuthUser,
  ): Promise<{ data: IncidentResponseDto }> {
    const incident = await this.incidentsService.create(dto, user.id, user.roles);
    return { data: incident };
  }

  @Get()
  @Roles('admin', 'technician', 'resident')
  @ApiOperation({ summary: 'List incidents (filtered by role and query params)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: IncidentStatus })
  @ApiQuery({ name: 'category', required: false, enum: IncidentCategory })
  @ApiQuery({ name: 'priority', required: false, enum: IncidentPriority })
  @ApiQuery({ name: 'apartmentId', required: false, type: String })
  @ApiQuery({ name: 'buildingId', required: false, type: String })
  @ApiQuery({ name: 'assignedToId', required: false, type: String })
  @ApiQuery({ name: 'reportedById', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Incident list' })
  async findAll(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: IncidentStatus,
    @Query('category') category?: IncidentCategory,
    @Query('priority') priority?: IncidentPriority,
    @Query('apartmentId') apartmentId?: string,
    @Query('buildingId') buildingId?: string,
    @Query('assignedToId') assignedToId?: string,
    @Query('reportedById') reportedById?: string,
    @Query('search') search?: string,
  ): Promise<{
    data: IncidentResponseDto[];
    meta: { total: number; page: number; limit: number; pages: number };
  }> {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '20', 10);

    const filters: IncidentFiltersDto = {
      status,
      category,
      priority,
      apartmentId,
      buildingId,
      assignedToId,
      reportedById,
      search,
    };

    const result = await this.incidentsService.findAll(
      filters,
      pageNum,
      limitNum,
      user.id,
      user.roles,
    );

    return {
      data: result.data,
      meta: {
        total: result.total,
        page: pageNum,
        limit: limitNum,
        pages: result.pages,
      },
    };
  }

  @Get('my')
  @Roles('admin', 'technician', 'resident')
  @ApiOperation({ summary: 'Get incidents belonging to current user (reported/assigned)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: IncidentStatus })
  @ApiQuery({ name: 'category', required: false, enum: IncidentCategory })
  @ApiQuery({ name: 'priority', required: false, enum: IncidentPriority })
  @ApiResponse({ status: 200, description: 'My incidents list' })
  async getMyIncidents(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: IncidentStatus,
    @Query('category') category?: IncidentCategory,
    @Query('priority') priority?: IncidentPriority,
  ): Promise<{
    data: IncidentResponseDto[];
    meta: { total: number; page: number; limit: number; pages: number };
  }> {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '20', 10);

    const filters: IncidentFiltersDto = { status, category, priority };

    const result = await this.incidentsService.getMyIncidents(
      user.id,
      user.roles,
      filters,
      pageNum,
      limitNum,
    );

    return {
      data: result.data,
      meta: {
        total: result.total,
        page: pageNum,
        limit: limitNum,
        pages: result.pages,
      },
    };
  }

  @Get(':id')
  @Roles('admin', 'technician', 'resident')
  @ApiOperation({ summary: 'Get incident details with comments' })
  @ApiParam({ name: 'id', type: String, description: 'Incident UUID' })
  @ApiResponse({ status: 200, description: 'Incident details', type: IncidentResponseDto })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Incident not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<{ data: IncidentResponseDto }> {
    const incident = await this.incidentsService.findOne(id, user.id, user.roles);
    return { data: incident };
  }

  @Patch(':id')
  @Roles('admin', 'resident')
  @ApiOperation({ summary: 'Update incident details (admin or owner if open)' })
  @ApiParam({ name: 'id', type: String, description: 'Incident UUID' })
  @ApiResponse({ status: 200, description: 'Incident updated', type: IncidentResponseDto })
  @ApiResponse({ status: 403, description: 'Access denied or incident not open' })
  @ApiResponse({ status: 404, description: 'Incident not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateIncidentDto,
    @CurrentUser() user: AuthUser,
  ): Promise<{ data: IncidentResponseDto }> {
    const incident = await this.incidentsService.update(id, dto, user.id, user.roles);
    return { data: incident };
  }

  @Patch(':id/assign')
  @Roles('admin')
  @ApiOperation({ summary: 'Assign a technician to the incident (admin only)' })
  @ApiParam({ name: 'id', type: String, description: 'Incident UUID' })
  @ApiResponse({ status: 200, description: 'Technician assigned', type: IncidentResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid technician' })
  @ApiResponse({ status: 404, description: 'Incident not found' })
  async assignTechnician(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignTechnicianDto,
    @CurrentUser() user: AuthUser,
  ): Promise<{ data: IncidentResponseDto }> {
    const incident = await this.incidentsService.assignTechnician(
      id,
      dto,
      user.id,
      user.roles,
    );
    return { data: incident };
  }

  @Patch(':id/status')
  @Roles('admin', 'technician')
  @ApiOperation({ summary: 'Update incident status (with workflow validation)' })
  @ApiParam({ name: 'id', type: String, description: 'Incident UUID' })
  @ApiResponse({ status: 200, description: 'Status updated', type: IncidentResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Incident not found' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateIncidentStatusDto,
    @CurrentUser() user: AuthUser,
  ): Promise<{ data: IncidentResponseDto }> {
    const incident = await this.incidentsService.updateStatus(
      id,
      dto,
      user.id,
      user.roles,
    );
    return { data: incident };
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete incident (admin only)' })
  @ApiParam({ name: 'id', type: String, description: 'Incident UUID' })
  @ApiResponse({ status: 204, description: 'Incident deleted' })
  @ApiResponse({ status: 404, description: 'Incident not found' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.incidentsService.delete(id, user.id, user.roles);
  }
}
