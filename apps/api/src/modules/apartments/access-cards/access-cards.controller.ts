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
  ApiParam,
} from '@nestjs/swagger';
import { AccessCardsService } from './access-cards.service';
import { AccessCardsLifecycleService } from './access-cards-lifecycle.service';
import {
  CreateAccessCardDto,
  UpdateAccessCardDto,
  DeactivateAccessCardDto,
  AccessCardResponseDto,
  AccessCardListResponseDto,
  AccessCardStatsDto,
  AccessCardQueryDto,
} from '../dto/access-card.dto';
import { JwtAuthGuard } from '../../identity/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('Access Cards')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AccessCardsController {
  constructor(
    private readonly accessCardsService: AccessCardsService,
    private readonly lifecycleService: AccessCardsLifecycleService,
  ) {}

  // =====================
  // Apartment-scoped endpoints
  // =====================

  @Get('apartments/:apartmentId/access-cards')
  @ApiOperation({ summary: 'List all access cards for an apartment' })
  @ApiParam({ name: 'apartmentId', type: String })
  @ApiResponse({
    status: 200,
    description: 'Access cards list with limit info',
    type: AccessCardListResponseDto,
  })
  async findAllByApartment(
    @Param('apartmentId', ParseUUIDPipe) apartmentId: string,
    @Query() query: AccessCardQueryDto,
  ): Promise<AccessCardListResponseDto> {
    return this.accessCardsService.findAllByApartment(apartmentId, query);
  }

  @Get('apartments/:apartmentId/access-cards/stats')
  @ApiOperation({ summary: 'Get access card statistics for an apartment' })
  @ApiParam({ name: 'apartmentId', type: String })
  @ApiResponse({
    status: 200,
    description: 'Card statistics',
    type: AccessCardStatsDto,
  })
  async getStats(
    @Param('apartmentId', ParseUUIDPipe) apartmentId: string,
  ): Promise<{ data: AccessCardStatsDto }> {
    const stats = await this.accessCardsService.getStats(apartmentId);
    return { data: stats };
  }

  // =====================
  // Card CRUD endpoints
  // =====================

  @Post('access-cards')
  @Roles('admin')
  @ApiOperation({ summary: 'Issue a new access card (admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Access card created',
    type: AccessCardResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Card number already exists or card limit reached',
  })
  async create(
    @Body() dto: CreateAccessCardDto,
    @CurrentUser('id') userId: string,
  ): Promise<{ data: AccessCardResponseDto }> {
    const card = await this.accessCardsService.create(dto, userId);
    return { data: card };
  }

  @Get('access-cards/:id')
  @ApiOperation({ summary: 'Get access card details' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({
    status: 200,
    description: 'Access card details',
    type: AccessCardResponseDto,
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ data: AccessCardResponseDto }> {
    const card = await this.accessCardsService.findOne(id);
    return { data: card };
  }

  @Patch('access-cards/:id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update access card zones/floor access (admin only)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({
    status: 200,
    description: 'Access card updated',
    type: AccessCardResponseDto,
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAccessCardDto,
  ): Promise<{ data: AccessCardResponseDto }> {
    const card = await this.accessCardsService.update(id, dto);
    return { data: card };
  }

  @Post('access-cards/:id/deactivate')
  @Roles('admin', 'technician')
  @ApiOperation({ summary: 'Deactivate an access card (admin/technician)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({
    status: 200,
    description: 'Access card deactivated',
    type: AccessCardResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Card is not active',
  })
  async deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DeactivateAccessCardDto,
    @CurrentUser('id') userId: string,
  ): Promise<{ data: AccessCardResponseDto }> {
    const card = await this.lifecycleService.deactivate(id, dto, userId);
    return { data: card };
  }

  @Post('access-cards/:id/reactivate')
  @Roles('admin')
  @ApiOperation({ summary: 'Reactivate a lost/deactivated card (admin only)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({
    status: 200,
    description: 'Access card reactivated',
    type: AccessCardResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Card is expired or already active',
  })
  async reactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<{ data: AccessCardResponseDto }> {
    const card = await this.lifecycleService.reactivate(id, userId);
    return { data: card };
  }
}
