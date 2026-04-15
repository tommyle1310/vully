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
  ApiParam,
} from '@nestjs/swagger';
import { BuildingPoliciesService } from './building-policies.service';
import {
  CreateBuildingPolicyDto,
  UpdateBuildingPolicyDto,
  BuildingPolicyResponseDto,
} from '../dto/building-policy.dto';
import { JwtAuthGuard } from '../../identity/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { BuildingScopedGuard } from '../../../common/guards/building-scoped.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { BuildingScoped } from '../../../common/decorators/building-scoped.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('Building Policies')
@Controller('buildings/:buildingId/policies')
@UseGuards(JwtAuthGuard, RolesGuard, BuildingScopedGuard)
@ApiBearerAuth()
export class BuildingPoliciesController {
  constructor(private readonly policiesService: BuildingPoliciesService) {}

  @Get()
  @BuildingScoped()
  @ApiOperation({ summary: 'List all policies for a building (versioned history)' })
  @ApiParam({ name: 'buildingId', type: String })
  @ApiResponse({ status: 200, description: 'Policies list', type: [BuildingPolicyResponseDto] })
  async findAll(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
  ): Promise<{ data: BuildingPolicyResponseDto[] }> {
    const policies = await this.policiesService.findAll(buildingId);
    return { data: policies };
  }

  @Get('current')
  @BuildingScoped()
  @ApiOperation({ summary: 'Get currently effective policy' })
  @ApiParam({ name: 'buildingId', type: String })
  @ApiResponse({ status: 200, description: 'Current policy', type: BuildingPolicyResponseDto })
  @ApiResponse({ status: 404, description: 'No current policy found' })
  async getCurrent(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
  ): Promise<{ data: BuildingPolicyResponseDto | null }> {
    const policy = await this.policiesService.getCurrentPolicy(buildingId);
    return { data: policy };
  }

  @Get(':policyId')
  @ApiOperation({ summary: 'Get a specific policy by ID' })
  @ApiParam({ name: 'buildingId', type: String })
  @ApiParam({ name: 'policyId', type: String })
  @ApiResponse({ status: 200, description: 'Policy details', type: BuildingPolicyResponseDto })
  async findOne(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Param('policyId', ParseUUIDPipe) policyId: string,
  ): Promise<{ data: BuildingPolicyResponseDto }> {
    const policy = await this.policiesService.findOne(buildingId, policyId);
    return { data: policy };
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create a new policy version (admin only)' })
  @ApiParam({ name: 'buildingId', type: String })
  @ApiResponse({ status: 201, description: 'Policy created', type: BuildingPolicyResponseDto })
  async create(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Body() dto: CreateBuildingPolicyDto,
    @CurrentUser() user: { id: string },
  ): Promise<{ data: BuildingPolicyResponseDto }> {
    const policy = await this.policiesService.create(buildingId, dto, user?.id);
    return { data: policy };
  }

  @Patch(':policyId')
  @Roles('admin')
  @ApiOperation({ summary: 'Update a future policy (admin only)' })
  @ApiParam({ name: 'buildingId', type: String })
  @ApiParam({ name: 'policyId', type: String })
  @ApiResponse({ status: 200, description: 'Policy updated', type: BuildingPolicyResponseDto })
  @ApiResponse({ status: 400, description: 'Cannot update policies already in effect' })
  async update(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Param('policyId', ParseUUIDPipe) policyId: string,
    @Body() dto: UpdateBuildingPolicyDto,
  ): Promise<{ data: BuildingPolicyResponseDto }> {
    const policy = await this.policiesService.update(buildingId, policyId, dto);
    return { data: policy };
  }
}
