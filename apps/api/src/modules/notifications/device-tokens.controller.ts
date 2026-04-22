import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DeviceTokensService } from './device-tokens.service';
import {
  RegisterDeviceDto,
  UnregisterDeviceDto,
  DeviceTokenResponseDto,
} from './dto/notification.dto';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

/**
 * Device Tokens Controller
 * 
 * Endpoints for managing FCM device tokens:
 * - Register device token on app startup
 * - Unregister device token on logout
 * - List registered devices
 */
@ApiTags('Device Tokens')
@ApiBearerAuth()
@Controller('notifications/devices')
@UseGuards(JwtAuthGuard)
export class DeviceTokensController {
  constructor(private readonly service: DeviceTokensService) {}

  /**
   * Register a device token
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register device for push notifications' })
  @ApiResponse({ status: 201, description: 'Device registered' })
  async register(
    @CurrentUser('id') userId: string,
    @Body() dto: RegisterDeviceDto,
  ): Promise<DeviceTokenResponseDto> {
    return this.service.register(userId, dto);
  }

  /**
   * Unregister a device token
   */
  @Post('unregister')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unregister device from push notifications' })
  @ApiResponse({ status: 200, description: 'Device unregistered' })
  @ApiResponse({ status: 404, description: 'Device token not found' })
  async unregister(
    @CurrentUser('id') userId: string,
    @Body() dto: UnregisterDeviceDto,
  ): Promise<{ success: boolean }> {
    await this.service.unregister(userId, dto.token);
    return { success: true };
  }

  /**
   * Get registered devices
   */
  @Get()
  @ApiOperation({ summary: 'Get registered devices' })
  @ApiResponse({ status: 200, description: 'List of registered devices' })
  async getDevices(
    @CurrentUser('id') userId: string,
  ): Promise<DeviceTokenResponseDto[]> {
    return this.service.getByUserId(userId);
  }
}
