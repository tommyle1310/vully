import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  Param,
  Req,
  Res,
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
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { OAuthService } from './oauth.service';
import {
  OAuthProvider,
  OAuthCallbackDto,
  ZaloCallbackDto,
  LinkOAuthAccountDto,
  OAuthAccountResponseDto,
  OAuthInitiateResponseDto,
} from './dto/oauth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from './interfaces/auth.interface';
import { LoginResponseDto } from './dto/login.dto';

@ApiTags('OAuth')
@Controller('auth')
export class OAuthController {
  constructor(
    private readonly oauthService: OAuthService,
    private readonly configService: ConfigService,
  ) {}

  // ============================================================
  // GOOGLE OAUTH
  // ============================================================

  @Get('google')
  @ApiOperation({ summary: 'Initiate Google OAuth flow (redirects to Google)' })
  @ApiResponse({ status: 302, description: 'Redirects to Google OAuth consent screen' })
  async initiateGoogle(@Res() res: Response): Promise<void> {
    const { authUrl } = await this.oauthService.initiateGoogleOAuth();
    res.redirect(authUrl);
  }

  @Get('google/callback')
  @ApiOperation({ summary: 'Handle Google OAuth callback' })
  @ApiQuery({ name: 'code', required: true })
  @ApiQuery({ name: 'state', required: false })
  @ApiResponse({ status: 302, description: 'Redirects to frontend with tokens' })
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    const result = await this.oauthService.handleGoogleCallback(
      code,
      ip,
      userAgent,
    );

    // Redirect to frontend with tokens
    const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
    const redirectUrl = new URL('/oauth-callback', frontendUrl);
    redirectUrl.searchParams.set('accessToken', result.accessToken);
    redirectUrl.searchParams.set('refreshToken', result.refreshToken);
    
    res.redirect(redirectUrl.toString());
  }

  // ============================================================
  // ZALO OAUTH
  // ============================================================

  @Get('zalo')
  @ApiOperation({ summary: 'Initiate Zalo OAuth flow (redirects to Zalo)' })
  @ApiResponse({ status: 302, description: 'Redirects to Zalo OAuth consent screen' })
  async initiateZalo(@Res() res: Response): Promise<void> {
    const { authUrl } = await this.oauthService.initiateZaloOAuth();
    res.redirect(authUrl);
  }

  @Get('zalo/callback')
  @ApiOperation({ summary: 'Handle Zalo OAuth callback' })
  @ApiQuery({ name: 'code', required: true })
  @ApiQuery({ name: 'state', required: false })
  @ApiResponse({ status: 302, description: 'Redirects to frontend with tokens' })
  async zaloCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    const result = await this.oauthService.handleZaloCallback(
      code,
      state || '',
      ip,
      userAgent,
    );

    // Redirect to frontend with tokens
    const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
    const redirectUrl = new URL('/oauth-callback', frontendUrl);
    redirectUrl.searchParams.set('accessToken', result.accessToken);
    redirectUrl.searchParams.set('refreshToken', result.refreshToken);
    
    res.redirect(redirectUrl.toString());
  }

  // ============================================================
  // ACCOUNT LINKING (for authenticated users)
  // ============================================================

  @Get('oauth/accounts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get linked OAuth accounts' })
  @ApiResponse({ status: 200, type: [OAuthAccountResponseDto] })
  async getLinkedAccounts(
    @CurrentUser() user: AuthUser,
  ): Promise<{ data: OAuthAccountResponseDto[] }> {
    const accounts = await this.oauthService.getLinkedAccounts(user.id);
    return { data: accounts };
  }

  @Post('oauth/link')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Link OAuth account to current user' })
  @ApiResponse({ status: 200, description: 'Account linked successfully' })
  @ApiResponse({ status: 409, description: 'Account already linked' })
  async linkAccount(
    @CurrentUser() user: AuthUser,
    @Body() dto: LinkOAuthAccountDto,
  ): Promise<{ message: string }> {
    await this.oauthService.linkOAuthAccount(user.id, dto.provider, dto.code);
    return { message: `${dto.provider} account linked successfully` };
  }

  @Delete('oauth/link/:provider')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unlink OAuth account' })
  @ApiResponse({ status: 200, description: 'Account unlinked successfully' })
  @ApiResponse({ status: 404, description: 'Account not linked' })
  async unlinkAccount(
    @CurrentUser() user: AuthUser,
    @Param('provider') provider: OAuthProvider,
  ): Promise<{ message: string }> {
    await this.oauthService.unlinkOAuthAccount(user.id, provider);
    return { message: `${provider} account unlinked successfully` };
  }

  // ============================================================
  // LINK INITIATION (redirect to OAuth with link intent)
  // ============================================================

  @Get('google/link')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate Google account linking' })
  @ApiResponse({ status: 200, type: OAuthInitiateResponseDto })
  async initiateLinkGoogle(): Promise<OAuthInitiateResponseDto> {
    // Same as login initiation, frontend handles the link flow
    return this.oauthService.initiateGoogleOAuth();
  }

  @Get('zalo/link')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate Zalo account linking' })
  @ApiResponse({ status: 200, type: OAuthInitiateResponseDto })
  async initiateLinkZalo(): Promise<OAuthInitiateResponseDto> {
    return this.oauthService.initiateZaloOAuth();
  }
}
