import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AccessCardRequestsService } from './access-card-requests.service';
import { JwtAuthGuard } from '../../identity/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import {
  AccessCardRequestListResponseDto,
  AccessCardRequestQueryDto,
  AccessCardRequestResponseDto,
  ApproveAccessCardRequestDto,
  CreateAccessCardRequestDto,
  RejectAccessCardRequestDto,
} from '../dto/access-card-request.dto';

@ApiTags('Access Card Requests')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AccessCardRequestsController {
  constructor(private readonly requestsService: AccessCardRequestsService) {}

  @Post('apartments/:apartmentId/access-card-requests')
  @Roles('resident', 'admin')
  @ApiOperation({ summary: 'Create an access card request for an apartment' })
  @ApiParam({ name: 'apartmentId', type: String })
  @ApiResponse({
    status: 201,
    description: 'Access card request created',
    type: AccessCardRequestResponseDto,
  })
  async create(
    @Param('apartmentId', ParseUUIDPipe) apartmentId: string,
    @Body() dto: CreateAccessCardRequestDto,
    @CurrentUser('id') userId: string,
  ): Promise<{ data: AccessCardRequestResponseDto }> {
    const request = await this.requestsService.create(apartmentId, dto, userId);
    return { data: request };
  }

  @Get('access-card-requests')
  @Roles('admin')
  @ApiOperation({ summary: 'List access card requests (admin only)' })
  @ApiResponse({
    status: 200,
    description: 'List of access card requests',
    type: AccessCardRequestListResponseDto,
  })
  async findAll(
    @Query() query: AccessCardRequestQueryDto,
  ): Promise<AccessCardRequestListResponseDto> {
    return this.requestsService.findAll(query);
  }

  @Post('access-card-requests/:id/approve')
  @Roles('admin')
  @ApiOperation({ summary: 'Approve request and issue access card (admin only)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({
    status: 200,
    description: 'Access card request approved',
    type: AccessCardRequestResponseDto,
  })
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveAccessCardRequestDto,
    @CurrentUser('id') userId: string,
  ): Promise<{ data: AccessCardRequestResponseDto }> {
    const request = await this.requestsService.approve(id, dto, userId);
    return { data: request };
  }

  @Post('access-card-requests/:id/reject')
  @Roles('admin')
  @ApiOperation({ summary: 'Reject access card request (admin only)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({
    status: 200,
    description: 'Access card request rejected',
    type: AccessCardRequestResponseDto,
  })
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectAccessCardRequestDto,
    @CurrentUser('id') userId: string,
  ): Promise<{ data: AccessCardRequestResponseDto }> {
    const request = await this.requestsService.reject(id, dto, userId);
    return { data: request };
  }
}
