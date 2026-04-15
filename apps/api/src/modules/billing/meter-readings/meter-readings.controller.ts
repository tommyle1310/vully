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
} from '@nestjs/swagger';
import { MeterReadingsService } from './meter-readings.service';
import {
  CreateMeterReadingDto,
  UpdateMeterReadingDto,
  MeterReadingResponseDto,
  MeterReadingFiltersDto,
} from '../dto/meter-reading.dto';
import { JwtAuthGuard } from '../../identity/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthUser } from '../../../common/interfaces/auth-user.interface';

@ApiTags('Meter Readings')
@Controller('meter-readings')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class MeterReadingsController {
  constructor(private readonly meterReadingsService: MeterReadingsService) {}

  @Post()
  @Roles('admin', 'technician', 'resident')
  @ApiOperation({ summary: 'Submit a meter reading' })
  @ApiResponse({
    status: 201,
    description: 'Meter reading created',
    type: MeterReadingResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Reading already exists for this period',
  })
  async create(
    @Body() dto: CreateMeterReadingDto,
    @CurrentUser() user: AuthUser,
  ): Promise<{ data: MeterReadingResponseDto }> {
    const reading = await this.meterReadingsService.create(dto, user.id, user.role);
    return { data: reading };
  }

  @Get()
  @Roles('admin', 'technician', 'resident')
  @ApiOperation({ summary: 'List meter readings (filtered by role)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'apartmentId', required: false, type: String })
  @ApiQuery({ name: 'utilityTypeId', required: false, type: String })
  @ApiQuery({ name: 'billingPeriod', required: false, type: String, example: '2026-03' })
  @ApiResponse({ status: 200, description: 'Meter readings list' })
  async findAll(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('apartmentId') apartmentId?: string,
    @Query('utilityTypeId') utilityTypeId?: string,
    @Query('billingPeriod') billingPeriod?: string,
  ): Promise<{
    data: MeterReadingResponseDto[];
    meta: { total: number; page: number; limit: number };
  }> {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '20', 10);

    const filters: MeterReadingFiltersDto = {
      apartmentId,
      utilityTypeId,
      billingPeriod,
    };

    const result = await this.meterReadingsService.findAll(
      filters,
      pageNum,
      limitNum,
      user.id,
      user.role,
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

  @Get('apartment/:apartmentId/latest')
  @Roles('admin', 'technician', 'resident')
  @ApiOperation({ summary: 'Get latest readings for an apartment' })
  @ApiResponse({ status: 200, description: 'Latest meter readings' })
  async getLatestReadings(
    @Param('apartmentId', ParseUUIDPipe) apartmentId: string,
  ): Promise<{ data: MeterReadingResponseDto[] }> {
    const readings = await this.meterReadingsService.getLatestReadings(apartmentId);
    return { data: readings };
  }

  @Get(':id')
  @Roles('admin', 'technician', 'resident')
  @ApiOperation({ summary: 'Get meter reading by ID' })
  @ApiResponse({
    status: 200,
    description: 'Meter reading details',
    type: MeterReadingResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Meter reading not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<{ data: MeterReadingResponseDto }> {
    const reading = await this.meterReadingsService.findOne(id, user.id, user.role);
    return { data: reading };
  }

  @Patch(':id')
  @Roles('admin', 'technician')
  @ApiOperation({ summary: 'Update meter reading (admin/technician)' })
  @ApiResponse({
    status: 200,
    description: 'Meter reading updated',
    type: MeterReadingResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Cannot update reading already used in invoice',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMeterReadingDto,
    @CurrentUser() user: AuthUser,
  ): Promise<{ data: MeterReadingResponseDto }> {
    const reading = await this.meterReadingsService.update(id, dto, user.id);
    return { data: reading };
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete meter reading (admin only)' })
  @ApiResponse({ status: 204, description: 'Meter reading deleted' })
  @ApiResponse({
    status: 409,
    description: 'Cannot delete reading already used in invoice',
  })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.meterReadingsService.delete(id, user.id);
  }
}
