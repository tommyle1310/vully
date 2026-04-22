import {
  Controller,
  Get,
  Patch,
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
import { NotificationPreferencesService } from './notification-preferences.service';
import {
  UpdateNotificationPreferencesDto,
  NotificationPreferencesResponseDto,
} from './dto/notification.dto';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

/**
 * Notification Preferences Controller
 * 
 * Endpoints for managing notification preferences:
 * - Get current preferences
 * - Update preferences
 */
@ApiTags('Notification Preferences')
@ApiBearerAuth()
@Controller('notifications/preferences')
@UseGuards(JwtAuthGuard)
export class NotificationPreferencesController {
  constructor(private readonly service: NotificationPreferencesService) {}

  /**
   * Get notification preferences
   */
  @Get()
  @ApiOperation({ summary: 'Get notification preferences' })
  @ApiResponse({ status: 200, description: 'Notification preferences' })
  async getPreferences(
    @CurrentUser('id') userId: string,
  ): Promise<NotificationPreferencesResponseDto> {
    return this.service.getByUserId(userId);
  }

  /**
   * Update notification preferences
   */
  @Patch()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update notification preferences' })
  @ApiResponse({ status: 200, description: 'Preferences updated' })
  async updatePreferences(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreferencesResponseDto> {
    return this.service.update(userId, dto);
  }
}
