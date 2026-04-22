import {
  Controller,
  Get,
  Post,
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
import { NotificationsService } from './notifications.service';
import {
  CreateNotificationDto,
  NotificationResponseDto,
  MarkReadDto,
} from './dto/notification.dto';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

/**
 * Notifications Controller
 * 
 * Endpoints for managing user notifications:
 * - List notifications (with filtering)
 * - Mark as read (single, multiple, all)
 * - Delete notification
 * - Admin: Broadcast notifications
 */
@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  /**
   * Get user's notifications
   */
  @Get()
  @ApiOperation({ summary: "Get user's notifications" })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'List of notifications' })
  async getNotifications(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('unreadOnly') unreadOnly?: string,
  ): Promise<{ items: NotificationResponseDto[]; total: number }> {
    return this.service.getByUserId(userId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      unreadOnly: unreadOnly === 'true',
    });
  }

  /**
   * Get unread notification count
   */
  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({ status: 200, description: 'Unread count' })
  async getUnreadCount(
    @CurrentUser('id') userId: string,
  ): Promise<{ count: number }> {
    const count = await this.service.getUnreadCount(userId);
    return { count };
  }

  /**
   * Mark notifications as read
   */
  @Post('mark-read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark notifications as read' })
  @ApiResponse({ status: 200, description: 'Notifications marked as read' })
  async markAsRead(
    @CurrentUser('id') userId: string,
    @Body() dto: MarkReadDto,
  ): Promise<{ success: boolean }> {
    await this.service.markAsRead(userId, dto.notificationIds);
    return { success: true };
  }

  /**
   * Mark all notifications as read
   */
  @Post('mark-all-read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllAsRead(
    @CurrentUser('id') userId: string,
  ): Promise<{ success: boolean }> {
    await this.service.markAllAsRead(userId);
    return { success: true };
  }

  /**
   * Delete a notification
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({ status: 200, description: 'Notification deleted' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async delete(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) notificationId: string,
  ): Promise<{ success: boolean }> {
    await this.service.delete(userId, notificationId);
    return { success: true };
  }

  /**
   * Create/broadcast notification (Admin only)
   */
  @Post('broadcast')
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Broadcast notification (Admin only)' })
  @ApiResponse({ status: 201, description: 'Notification queued' })
  async broadcast(@Body() dto: CreateNotificationDto): Promise<{ queued: boolean; jobId?: string }> {
    return this.service.create(dto);
  }
}
