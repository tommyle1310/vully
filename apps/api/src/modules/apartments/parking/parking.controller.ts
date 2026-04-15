import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ParkingService } from './parking.service';
import { ParkingZonesService } from './parking-zones.service';
import {
  CreateParkingZoneDto,
  UpdateParkingZoneDto,
  ParkingZoneResponseDto,
  CreateParkingSlotsDto,
  UpdateParkingSlotDto,
  ParkingSlotResponseDto,
  AssignSlotDto,
  ParkingStatsDto,
} from '../dto/parking.dto';
import { JwtAuthGuard } from '../../identity/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthUser } from '../../identity/interfaces/auth.interface';
import { PrismaService } from '../../../common/prisma/prisma.service';

@ApiTags('Parking')
@Controller('buildings/:buildingId/parking')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ParkingController {
  constructor(
    private readonly parkingService: ParkingService,
    private readonly parkingZonesService: ParkingZonesService,
    private readonly prisma: PrismaService,
  ) {}

  // =====================
  // Stats
  // =====================

  @Get('stats')
  @ApiOperation({ summary: 'Get parking statistics for a building' })
  @ApiParam({ name: 'buildingId', type: String })
  @ApiResponse({ status: 200, description: 'Parking stats', type: ParkingStatsDto })
  async getStats(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
  ): Promise<{ data: ParkingStatsDto }> {
    const stats = await this.parkingService.getStats(buildingId);
    return { data: stats };
  }

  // =====================
  // Zone Endpoints
  // =====================

  @Get('zones')
  @ApiOperation({ summary: 'List all parking zones for a building' })
  @ApiParam({ name: 'buildingId', type: String })
  @ApiResponse({ status: 200, description: 'Zones list', type: [ParkingZoneResponseDto] })
  async findAllZones(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
  ): Promise<{ data: ParkingZoneResponseDto[] }> {
    const zones = await this.parkingZonesService.findAllZones(buildingId);
    return { data: zones };
  }

  @Get('zones/:zoneId')
  @ApiOperation({ summary: 'Get a specific parking zone' })
  @ApiParam({ name: 'buildingId', type: String })
  @ApiParam({ name: 'zoneId', type: String })
  @ApiResponse({ status: 200, description: 'Zone details', type: ParkingZoneResponseDto })
  async findOneZone(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Param('zoneId', ParseUUIDPipe) zoneId: string,
  ): Promise<{ data: ParkingZoneResponseDto }> {
    const zone = await this.parkingZonesService.findOneZone(buildingId, zoneId);
    return { data: zone };
  }

  @Post('zones')
  @Roles('admin')
  @ApiOperation({ summary: 'Create a new parking zone (admin only)' })
  @ApiParam({ name: 'buildingId', type: String })
  @ApiResponse({ status: 201, description: 'Zone created', type: ParkingZoneResponseDto })
  async createZone(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Body() dto: CreateParkingZoneDto,
  ): Promise<{ data: ParkingZoneResponseDto }> {
    const zone = await this.parkingZonesService.createZone(buildingId, dto);
    return { data: zone };
  }

  @Patch('zones/:zoneId')
  @Roles('admin')
  @ApiOperation({ summary: 'Update a parking zone (admin only)' })
  @ApiParam({ name: 'buildingId', type: String })
  @ApiParam({ name: 'zoneId', type: String })
  @ApiResponse({ status: 200, description: 'Zone updated', type: ParkingZoneResponseDto })
  async updateZone(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Param('zoneId', ParseUUIDPipe) zoneId: string,
    @Body() dto: UpdateParkingZoneDto,
  ): Promise<{ data: ParkingZoneResponseDto }> {
    const zone = await this.parkingZonesService.updateZone(buildingId, zoneId, dto);
    return { data: zone };
  }

  // =====================
  // Slot Endpoints
  // =====================

  @Get('zones/:zoneId/slots')
  @ApiOperation({ summary: 'List all slots in a parking zone' })
  @ApiParam({ name: 'buildingId', type: String })
  @ApiParam({ name: 'zoneId', type: String })
  @ApiResponse({ status: 200, description: 'Slots list', type: [ParkingSlotResponseDto] })
  async findAllSlots(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Param('zoneId', ParseUUIDPipe) zoneId: string,
  ): Promise<{ data: ParkingSlotResponseDto[] }> {
    const slots = await this.parkingService.findAllSlots(buildingId, zoneId);
    return { data: slots };
  }

  @Post('zones/:zoneId/slots')
  @Roles('admin')
  @ApiOperation({ summary: 'Bulk create parking slots (admin only)' })
  @ApiParam({ name: 'buildingId', type: String })
  @ApiParam({ name: 'zoneId', type: String })
  @ApiResponse({ status: 201, description: 'Slots created', type: [ParkingSlotResponseDto] })
  async bulkCreateSlots(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Param('zoneId', ParseUUIDPipe) zoneId: string,
    @Body() dto: CreateParkingSlotsDto,
  ): Promise<{ data: ParkingSlotResponseDto[] }> {
    const slots = await this.parkingService.bulkCreateSlots(buildingId, zoneId, dto);
    return { data: slots };
  }

  @Patch('zones/:zoneId/slots/:slotId')
  @Roles('admin')
  @ApiOperation({ summary: 'Update a parking slot (admin only)' })
  @ApiParam({ name: 'buildingId', type: String })
  @ApiParam({ name: 'zoneId', type: String })
  @ApiParam({ name: 'slotId', type: String })
  @ApiResponse({ status: 200, description: 'Slot updated', type: ParkingSlotResponseDto })
  async updateSlot(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Param('zoneId', ParseUUIDPipe) zoneId: string,
    @Param('slotId', ParseUUIDPipe) slotId: string,
    @Body() dto: UpdateParkingSlotDto,
  ): Promise<{ data: ParkingSlotResponseDto }> {
    const slot = await this.parkingService.updateSlot(buildingId, zoneId, slotId, dto);
    return { data: slot };
  }

  @Post('zones/:zoneId/slots/:slotId/assign')
  @Roles('admin', 'resident')
  @ApiOperation({ summary: 'Assign a parking slot to an apartment' })
  @ApiParam({ name: 'buildingId', type: String })
  @ApiParam({ name: 'zoneId', type: String })
  @ApiParam({ name: 'slotId', type: String })
  @ApiResponse({ status: 200, description: 'Slot assigned', type: ParkingSlotResponseDto })
  @ApiResponse({ status: 403, description: 'Residents can only assign to their own apartment' })
  async assignSlot(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Param('zoneId', ParseUUIDPipe) zoneId: string,
    @Param('slotId', ParseUUIDPipe) slotId: string,
    @Body() dto: AssignSlotDto,
    @CurrentUser() user: AuthUser,
  ): Promise<{ data: ParkingSlotResponseDto }> {
    // Residents can only assign slots to their own apartment
    if (!user.roles.includes('admin')) {
      await this.verifyApartmentOwnership(user.id, dto.apartmentId);
    }

    const slot = await this.parkingService.assignSlot(
      buildingId,
      zoneId,
      slotId,
      dto.apartmentId,
    );
    return { data: slot };
  }

  @Post('zones/:zoneId/slots/:slotId/unassign')
  @Roles('admin', 'resident')
  @ApiOperation({ summary: 'Unassign a parking slot' })
  @ApiParam({ name: 'buildingId', type: String })
  @ApiParam({ name: 'zoneId', type: String })
  @ApiParam({ name: 'slotId', type: String })
  @ApiResponse({ status: 200, description: 'Slot unassigned', type: ParkingSlotResponseDto })
  @ApiResponse({ status: 403, description: 'Residents can only unassign from their own apartment' })
  async unassignSlot(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Param('zoneId', ParseUUIDPipe) zoneId: string,
    @Param('slotId', ParseUUIDPipe) slotId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<{ data: ParkingSlotResponseDto }> {
    // Residents can only unassign slots from their own apartment
    if (!user.roles.includes('admin')) {
      const slot = await this.prisma.parking_slots.findFirst({
        where: { id: slotId, zone_id: zoneId },
        select: { assigned_apt_id: true },
      });
      if (slot?.assigned_apt_id) {
        await this.verifyApartmentOwnership(user.id, slot.assigned_apt_id);
      }
    }

    const slotResult = await this.parkingService.unassignSlot(buildingId, zoneId, slotId);
    return { data: slotResult };
  }

  /**
   * Verify that the user has an active contract for the given apartment.
   */
  private async verifyApartmentOwnership(userId: string, apartmentId: string): Promise<void> {
    const activeContract = await this.prisma.contracts.findFirst({
      where: {
        tenant_id: userId,
        apartment_id: apartmentId,
        status: 'active',
      },
      select: { id: true },
    });

    if (!activeContract) {
      throw new ForbiddenException('You can only manage parking for your own apartment');
    }
  }
}
