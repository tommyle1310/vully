import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsUUID, IsBoolean, IsOptional, IsArray, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Device Platform enum
 */
export enum DevicePlatform {
  WEB = 'web',
  ANDROID = 'android',
  IOS = 'ios',
}

/**
 * Notification Channel enum
 */
export enum NotificationChannel {
  FCM = 'fcm',
  ZALO_ZNS = 'zalo_zns',
  EMAIL = 'email',
}

/**
 * Notification Type enum
 */
export enum NotificationType {
  PAYMENT_CONFIRMED = 'payment_confirmed',
  PAYMENT_REMINDER = 'payment_reminder',
  INCIDENT_ASSIGNED = 'incident_assigned',
  INCIDENT_UPDATED = 'incident_updated',
  INCIDENT_RESOLVED = 'incident_resolved',
  INCIDENT_STATUS = 'incident_status',
  BUILDING_ANNOUNCEMENT = 'building_announcement',
  ANNOUNCEMENT = 'announcement',
  UNMATCHED_PAYMENT = 'unmatched_payment',
  ACCESS_CARD_APPROVED = 'access_card_approved',
  ACCESS_CARD_REJECTED = 'access_card_rejected',
  SYSTEM = 'system',
}

// =============================================================================
// Device Token DTOs
// =============================================================================

export class RegisterDeviceDto {
  @ApiProperty({ description: 'FCM registration token' })
  @IsString()
  token: string;

  @ApiProperty({ enum: DevicePlatform, description: 'Device platform' })
  @IsEnum(DevicePlatform)
  platform: DevicePlatform;
}

export class UnregisterDeviceDto {
  @ApiProperty({ description: 'FCM registration token to unregister' })
  @IsString()
  token: string;
}

export class DeviceTokenResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  token: string;

  @ApiProperty({ enum: DevicePlatform })
  platform: DevicePlatform;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  last_used: Date;
}

// =============================================================================
// Notification Preferences DTOs
// =============================================================================

export class UpdateNotificationPreferencesDto {
  @ApiPropertyOptional({ description: 'Enable push notifications' })
  @IsOptional()
  @IsBoolean()
  push_enabled?: boolean;

  @ApiPropertyOptional({ description: 'Enable email notifications' })
  @IsOptional()
  @IsBoolean()
  email_enabled?: boolean;

  @ApiPropertyOptional({ description: 'Enable Zalo ZNS notifications' })
  @IsOptional()
  @IsBoolean()
  zalo_enabled?: boolean;

  @ApiPropertyOptional({ description: 'Enable payment notifications' })
  @IsOptional()
  @IsBoolean()
  payment_notifications?: boolean;

  @ApiPropertyOptional({ description: 'Enable incident notifications' })
  @IsOptional()
  @IsBoolean()
  incident_notifications?: boolean;

  @ApiPropertyOptional({ description: 'Enable announcement notifications' })
  @IsOptional()
  @IsBoolean()
  announcement_notifications?: boolean;
}

export class NotificationPreferencesResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  user_id: string;

  @ApiProperty()
  push_enabled: boolean;

  @ApiProperty()
  email_enabled: boolean;

  @ApiProperty()
  zalo_enabled: boolean;

  @ApiProperty()
  payment_notifications: boolean;

  @ApiProperty()
  incident_notifications: boolean;

  @ApiProperty()
  announcement_notifications: boolean;
}

// =============================================================================
// Notification DTOs
// =============================================================================

export class CreateNotificationDto {
  @ApiProperty({ enum: NotificationType, description: 'Notification type' })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ description: 'Notification title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Notification message' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: 'Target user ID (for single user)' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ description: 'Target user IDs (for multiple users)', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  userIds?: string[];

  @ApiPropertyOptional({ description: 'Target roles (for role-based)', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roles?: string[];

  @ApiPropertyOptional({ description: 'Target building ID (for building broadcast)' })
  @IsOptional()
  @IsUUID()
  buildingId?: string;

  @ApiPropertyOptional({ description: 'Resource type for deep linking' })
  @IsOptional()
  @IsString()
  resourceType?: string;

  @ApiPropertyOptional({ description: 'Resource ID for deep linking' })
  @IsOptional()
  @IsUUID()
  resourceId?: string;

  @ApiPropertyOptional({ description: 'Additional data payload' })
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}

export class NotificationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  user_id: string;

  @ApiProperty({ enum: NotificationType })
  type: NotificationType;

  @ApiProperty()
  title: string;

  @ApiProperty()
  message: string;

  @ApiProperty()
  is_read: boolean;

  @ApiPropertyOptional()
  resource_type?: string;

  @ApiPropertyOptional()
  resource_id?: string;

  @ApiProperty()
  created_at: Date;
}

export class MarkReadDto {
  @ApiProperty({ description: 'Notification IDs to mark as read', type: [String] })
  @IsArray()
  @IsUUID('all', { each: true })
  notificationIds: string[];
}

// =============================================================================
// Queue Job Payloads
// =============================================================================

export interface NotificationJobPayload {
  type: NotificationType;
  userId?: string;
  userIds?: string[];
  roles?: string[];
  buildingId?: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  channel?: NotificationChannel;
}

export interface DeliveryResult {
  channel: NotificationChannel;
  success: boolean;
  error?: string;
  messageId?: string;
}
