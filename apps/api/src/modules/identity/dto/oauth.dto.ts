import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';

/**
 * OAuth Provider enum
 */
export enum OAuthProvider {
  GOOGLE = 'google',
  ZALO = 'zalo',
}

/**
 * OAuth Initiation Response
 */
export class OAuthInitiateResponseDto {
  @ApiProperty({ description: 'OAuth authorization URL to redirect user to' })
  authUrl: string;

  @ApiProperty({ description: 'State parameter for CSRF protection' })
  state: string;
}

/**
 * OAuth Callback DTO
 */
export class OAuthCallbackDto {
  @ApiProperty({ description: 'Authorization code from OAuth provider' })
  @IsString()
  code: string;

  @ApiPropertyOptional({ description: 'State parameter for CSRF verification' })
  @IsString()
  @IsOptional()
  state?: string;
}

/**
 * Zalo OAuth Callback DTO (Zalo uses different param names)
 */
export class ZaloCallbackDto {
  @ApiProperty({ description: 'Authorization code from Zalo' })
  @IsString()
  code: string;

  @ApiPropertyOptional({ description: 'Code verifier for PKCE' })
  @IsString()
  @IsOptional()
  code_verifier?: string;

  @ApiPropertyOptional({ description: 'State parameter' })
  @IsString()
  @IsOptional()
  state?: string;
}

/**
 * Link OAuth Account DTO
 */
export class LinkOAuthAccountDto {
  @ApiProperty({ enum: OAuthProvider, description: 'OAuth provider to link' })
  @IsEnum(OAuthProvider)
  provider: OAuthProvider;

  @ApiProperty({ description: 'Authorization code from OAuth provider' })
  @IsString()
  code: string;
}

/**
 * OAuth Account Response
 */
export class OAuthAccountResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: OAuthProvider })
  provider: OAuthProvider;

  @ApiProperty()
  provider_user_id: string;

  @ApiProperty()
  linked_at: Date;
}
