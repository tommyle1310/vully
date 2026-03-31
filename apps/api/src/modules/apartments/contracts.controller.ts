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
import { ContractsService } from './contracts.service';
import {
  CreateContractDto,
  UpdateContractDto,
  TerminateContractDto,
  ContractResponseDto,
} from './dto/contract.dto';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

interface AuthUser {
  id: string;
  email: string;
  role: string;
}

@ApiTags('Contracts')
@Controller('contracts')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create a new contract (admin only)' })
  @ApiResponse({ status: 201, description: 'Contract created', type: ContractResponseDto })
  @ApiResponse({ status: 409, description: 'Apartment already has active contract' })
  async create(
    @Body() dto: CreateContractDto,
    @CurrentUser() user: AuthUser,
  ): Promise<{ data: ContractResponseDto }> {
    const contract = await this.contractsService.create(dto, user.id);
    return { data: contract };
  }

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'List contracts (admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'apartmentId', required: false, type: String })
  @ApiQuery({ name: 'tenantId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: ['draft', 'active', 'expired', 'terminated'] })
  @ApiResponse({ status: 200, description: 'Contracts list' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('apartmentId') apartmentId?: string,
    @Query('tenantId') tenantId?: string,
    @Query('status') status?: string,
  ): Promise<{
    data: ContractResponseDto[];
    meta: { total: number; page: number; limit: number };
  }> {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '20', 10);

    const result = await this.contractsService.findAll(pageNum, limitNum, {
      apartmentId,
      tenantId,
      status,
    });

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
  @Roles('admin')
  @ApiOperation({ summary: 'Get contract by ID (admin only)' })
  @ApiResponse({ status: 200, description: 'Contract details', type: ContractResponseDto })
  @ApiResponse({ status: 404, description: 'Contract not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ data: ContractResponseDto }> {
    const contract = await this.contractsService.findOne(id);
    return { data: contract };
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update contract (admin only)' })
  @ApiResponse({ status: 200, description: 'Contract updated', type: ContractResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContractDto,
  ): Promise<{ data: ContractResponseDto }> {
    const contract = await this.contractsService.update(id, dto);
    return { data: contract };
  }

  @Post(':id/terminate')
  @Roles('admin')
  @ApiOperation({ summary: 'Terminate contract (admin only)' })
  @ApiResponse({ status: 200, description: 'Contract terminated', type: ContractResponseDto })
  @ApiResponse({ status: 409, description: 'Contract not active' })
  async terminate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TerminateContractDto,
    @CurrentUser() user: AuthUser,
  ): Promise<{ data: ContractResponseDto }> {
    const contract = await this.contractsService.terminate(id, dto, user.id);
    return { data: contract };
  }
}
