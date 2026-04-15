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
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { UserRole } from '@vully/shared-types';
import { BuildingAssignmentsService } from './building-assignments.service';
import {
  CreateBuildingAssignmentDto,
  UpdateBuildingAssignmentDto,
  BuildingAssignmentResponseDto,
} from './dto/building-assignment.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { BuildingScopedGuard } from '../../common/guards/building-scoped.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { BuildingScoped } from '../../common/decorators/building-scoped.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from './interfaces/auth.interface';

/**
 * Building Assignments Controller
 * 
 * Manages user-building assignments for building-scoped RBAC.
 * 
 * Only admin and building_manager can manage assignments.
 * Building managers can only manage their own assigned buildings.
 */
@ApiTags('Building Assignments')
@ApiBearerAuth()
@Controller('api/v1/users/:userId/building-assignments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BuildingAssignmentsController {
  constructor(private readonly service: BuildingAssignmentsService) {}

  /**
   * Get all building assignments for a user
   */
  @Get()
  @Roles(UserRole.admin, UserRole.building_manager)
  @ApiOperation({ summary: 'Get user building assignments' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'List of building assignments' })
  async getAssignments(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<{ data: BuildingAssignmentResponseDto[] }> {
    const assignments = await this.service.getByUserId(userId);
    return { data: assignments };
  }

  /**
   * Assign user to a building
   */
  @Post()
  @Roles(UserRole.admin, UserRole.building_manager)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Assign user to a building' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 201, description: 'Assignment created' })
  @ApiResponse({ status: 409, description: 'User already assigned to this building' })
  async create(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: CreateBuildingAssignmentDto,
    @CurrentUser() actor: AuthUser,
  ): Promise<{ data: BuildingAssignmentResponseDto }> {
    const assignment = await this.service.create(userId, dto, actor.id);
    return { data: assignment };
  }

  /**
   * Update building assignment role
   */
  @Patch(':buildingId')
  @Roles(UserRole.admin, UserRole.building_manager)
  @ApiOperation({ summary: 'Update building assignment role' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiParam({ name: 'buildingId', description: 'Building ID' })
  @ApiResponse({ status: 200, description: 'Assignment updated' })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  async update(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Body() dto: UpdateBuildingAssignmentDto,
    @CurrentUser() actor: AuthUser,
  ): Promise<{ data: BuildingAssignmentResponseDto }> {
    const assignment = await this.service.update(userId, buildingId, dto, actor.id);
    return { data: assignment };
  }

  /**
   * Remove user from building
   */
  @Delete(':buildingId')
  @Roles(UserRole.admin, UserRole.building_manager)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove user from building' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiParam({ name: 'buildingId', description: 'Building ID' })
  @ApiResponse({ status: 204, description: 'Assignment deleted' })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  async delete(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
  ): Promise<void> {
    await this.service.delete(userId, buildingId);
  }
}

/**
 * Buildings Staff Controller
 * 
 * Get staff assigned to a specific building.
 */
@ApiTags('Building Staff')
@ApiBearerAuth()
@Controller('api/v1/buildings/:buildingId/staff')
@UseGuards(JwtAuthGuard, RolesGuard, BuildingScopedGuard)
export class BuildingStaffController {
  constructor(private readonly service: BuildingAssignmentsService) {}

  /**
   * Get all staff assigned to a building
   */
  @Get()
  @BuildingScoped()
  @Roles(UserRole.admin, UserRole.building_manager)
  @ApiOperation({ summary: 'Get building staff list' })
  @ApiParam({ name: 'buildingId', description: 'Building ID' })
  @ApiQuery({ name: 'role', required: false, enum: UserRole })
  @ApiResponse({ status: 200, description: 'List of assigned staff' })
  async getStaff(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Query('role') role?: UserRole,
  ): Promise<{ data: BuildingAssignmentResponseDto[] }> {
    const staff = await this.service.getByBuildingId(buildingId, role);
    return { data: staff };
  }
}
