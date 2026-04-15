import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OAuthProvider } from './dto/oauth.dto';
import { UserRole } from '@prisma/client';
import * as crypto from 'crypto';

/**
 * OAuth Profile from providers
 */
interface OAuthProfile {
  id: string;
  email?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  picture?: string;
}

/**
 * OAuth tokens from provider
 */
interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

/**
 * OAuth Service
 * 
 * Handles social login via:
 * - Google OAuth 2.0
 * - Zalo OAuth (Vietnam-specific)
 */
@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Generate OAuth authorization URL for Google
   */
  async initiateGoogleOAuth(): Promise<{ authUrl: string; state: string }> {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const redirectUri = this.configService.get<string>('GOOGLE_CALLBACK_URL');

    if (!clientId || !redirectUri) {
      throw new BadRequestException('Google OAuth is not configured');
    }

    const state = crypto.randomBytes(32).toString('hex');
    
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'offline',
      prompt: 'consent',
    });

    return {
      authUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
      state,
    };
  }

  /**
   * Generate OAuth authorization URL for Zalo
   */
  async initiateZaloOAuth(): Promise<{ authUrl: string; state: string }> {
    const appId = this.configService.get<string>('ZALO_APP_ID');
    const redirectUri = this.configService.get<string>('ZALO_CALLBACK_URL');

    if (!appId) {
      throw new BadRequestException('Zalo OAuth is not configured');
    }

    const state = crypto.randomBytes(32).toString('hex');
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    // Store code_verifier in session/cache for later use
    // For simplicity, encoding in state (in production, use Redis session)
    const encodedState = Buffer.from(
      JSON.stringify({ state, codeVerifier }),
    ).toString('base64url');

    const params = new URLSearchParams({
      app_id: appId,
      redirect_uri: redirectUri || `${this.configService.get('API_URL')}/api/v1/auth/zalo/callback`,
      code_challenge: codeChallenge,
      state: encodedState,
    });

    return {
      authUrl: `https://oauth.zaloapp.com/v4/permission?${params.toString()}`,
      state: encodedState,
    };
  }

  /**
   * Handle Google OAuth callback
   */
  async handleGoogleCallback(
    code: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<{ accessToken: string; refreshToken: string; user: any }> {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
    const redirectUri = this.configService.get<string>('GOOGLE_CALLBACK_URL');

    if (!clientId || !clientSecret) {
      throw new BadRequestException('Google OAuth is not configured');
    }

    // Exchange code for tokens
    const tokens = await this.exchangeGoogleCode(code, clientId, clientSecret, redirectUri!);
    
    // Get user profile
    const profile = await this.getGoogleProfile(tokens.accessToken);

    return this.processOAuthLogin(
      OAuthProvider.GOOGLE,
      profile,
      tokens,
      ipAddress,
      userAgent,
    );
  }

  /**
   * Handle Zalo OAuth callback
   */
  async handleZaloCallback(
    code: string,
    state: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<{ accessToken: string; refreshToken: string; user: any }> {
    const appId = this.configService.get<string>('ZALO_APP_ID');
    const appSecret = this.configService.get<string>('ZALO_APP_SECRET');

    if (!appId || !appSecret) {
      throw new BadRequestException('Zalo OAuth is not configured');
    }

    // Decode state to get code_verifier
    let codeVerifier: string;
    try {
      const decoded = JSON.parse(Buffer.from(state, 'base64url').toString());
      codeVerifier = decoded.codeVerifier;
    } catch {
      throw new BadRequestException('Invalid state parameter');
    }

    // Exchange code for tokens
    const tokens = await this.exchangeZaloCode(code, appId, appSecret, codeVerifier);
    
    // Get user profile
    const profile = await this.getZaloProfile(tokens.accessToken);

    return this.processOAuthLogin(
      OAuthProvider.ZALO,
      profile,
      tokens,
      ipAddress,
      userAgent,
    );
  }

  /**
   * Link OAuth account to existing user
   */
  async linkOAuthAccount(
    userId: string,
    provider: OAuthProvider,
    code: string,
  ): Promise<void> {
    // Check if user already has this provider linked
    const existing = await this.prisma.oauth_accounts.findFirst({
      where: {
        user_id: userId,
        provider,
      },
    });

    if (existing) {
      throw new ConflictException(`${provider} account already linked`);
    }

    // Get profile based on provider
    let profile: OAuthProfile;
    let tokens: OAuthTokens;

    if (provider === OAuthProvider.GOOGLE) {
      const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
      const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
      const redirectUri = this.configService.get<string>('GOOGLE_CALLBACK_URL');
      
      tokens = await this.exchangeGoogleCode(code, clientId!, clientSecret!, redirectUri!);
      profile = await this.getGoogleProfile(tokens.accessToken);
    } else if (provider === OAuthProvider.ZALO) {
      // For Zalo, we need code_verifier which should be passed separately
      throw new BadRequestException('Use /auth/zalo/link endpoint for Zalo');
    } else {
      throw new BadRequestException(`Unsupported provider: ${provider}`);
    }

    // Check if this OAuth account is already linked to another user
    const linkedToOther = await this.prisma.oauth_accounts.findFirst({
      where: {
        provider,
        provider_user_id: profile.id,
      },
    });

    if (linkedToOther) {
      throw new ConflictException('This social account is already linked to another user');
    }

    // Create OAuth account link
    await this.prisma.oauth_accounts.create({
      data: {
        user_id: userId,
        provider,
        provider_user_id: profile.id,
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        token_expires_at: tokens.expiresIn
          ? new Date(Date.now() + tokens.expiresIn * 1000)
          : null,
      },
    });

    // If Zalo, also update zalo_id on user profile
    // Note: Zalo linking flows through a different endpoint, but keep this for future
    if ((provider as string) === 'zalo' && profile.id) {
      await this.prisma.users.update({
        where: { id: userId },
        data: {
          zalo_id: profile.id,
          zalo_oa_follower: true,
        },
      });
    }
  }

  /**
   * Unlink OAuth account
   */
  async unlinkOAuthAccount(userId: string, provider: OAuthProvider): Promise<void> {
    const account = await this.prisma.oauth_accounts.findFirst({
      where: {
        user_id: userId,
        provider,
      },
    });

    if (!account) {
      throw new NotFoundException(`${provider} account not linked`);
    }

    // Check if user has password (must have either password or another OAuth)
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      include: {
        oauth_accounts: true,
      },
    });

    if (!user?.password_hash && (user?.oauth_accounts?.length ?? 0) <= 1) {
      throw new BadRequestException(
        'Cannot unlink last authentication method. Set a password first.',
      );
    }

    await this.prisma.oauth_accounts.delete({
      where: { id: account.id },
    });

    // If Zalo, clear zalo_id
    if (provider === OAuthProvider.ZALO) {
      await this.prisma.users.update({
        where: { id: userId },
        data: {
          zalo_id: null,
          zalo_oa_follower: false,
        },
      });
    }
  }

  /**
   * Get user's linked OAuth accounts
   */
  async getLinkedAccounts(userId: string): Promise<any[]> {
    const accounts = await this.prisma.oauth_accounts.findMany({
      where: { user_id: userId },
      select: {
        id: true,
        provider: true,
        provider_user_id: true,
        created_at: true,
      },
    });

    return accounts.map((a: { id: string; provider: string; provider_user_id: string; created_at: Date }) => ({
      id: a.id,
      provider: a.provider,
      provider_user_id: a.provider_user_id,
      linked_at: a.created_at,
    }));
  }

  // ============================================================
  // PRIVATE METHODS
  // ============================================================

  /**
   * Process OAuth login - find or create user, generate tokens
   */
  private async processOAuthLogin(
    provider: OAuthProvider,
    profile: OAuthProfile,
    tokens: OAuthTokens,
    ipAddress: string,
    userAgent: string,
  ): Promise<{ accessToken: string; refreshToken: string; user: any }> {
    // Check if OAuth account exists
    let oauthAccount = await this.prisma.oauth_accounts.findFirst({
      where: {
        provider,
        provider_user_id: profile.id,
      },
      include: {
        user: {
          include: {
            user_role_assignments: true,
          },
        },
      },
    });

    let user: any;

    if (oauthAccount) {
      // Existing OAuth account - update tokens
      user = oauthAccount.user;

      await this.prisma.oauth_accounts.update({
        where: { id: oauthAccount.id },
        data: {
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
          token_expires_at: tokens.expiresIn
            ? new Date(Date.now() + tokens.expiresIn * 1000)
            : null,
        },
      });
    } else if (profile.email) {
      // Check if user exists by email
      user = await this.prisma.users.findUnique({
        where: { email: profile.email },
        include: {
          user_role_assignments: true,
        },
      });

      if (user) {
        // Link OAuth to existing user
        await this.prisma.oauth_accounts.create({
          data: {
            user_id: user.id,
            provider,
            provider_user_id: profile.id,
            access_token: tokens.accessToken,
            refresh_token: tokens.refreshToken,
            token_expires_at: tokens.expiresIn
              ? new Date(Date.now() + tokens.expiresIn * 1000)
              : null,
          },
        });
      } else {
        // Create new user
        user = await this.prisma.users.create({
          data: {
            email: profile.email,
            first_name: profile.firstName || profile.name?.split(' ')[0] || '',
            last_name: profile.lastName || profile.name?.split(' ').slice(1).join(' ') || '',
            password_hash: null, // No password for OAuth-only users
            is_active: true,
            updated_at: new Date(),
            profile_data: profile.picture ? { avatarUrl: profile.picture } : undefined,
            zalo_id: provider === OAuthProvider.ZALO ? profile.id : null,
            zalo_oa_follower: provider === OAuthProvider.ZALO,
            user_role_assignments: {
              create: {
                role: UserRole.resident,
              },
            },
            oauth_accounts: {
              create: {
                provider,
                provider_user_id: profile.id,
                access_token: tokens.accessToken,
                refresh_token: tokens.refreshToken,
                token_expires_at: tokens.expiresIn
                  ? new Date(Date.now() + tokens.expiresIn * 1000)
                  : null,
              },
            },
          },
          include: {
            user_role_assignments: true,
          },
        });
      }
    } else {
      throw new BadRequestException(
        'OAuth account has no email. Please grant email permission.',
      );
    }

    // Update Zalo ID if Zalo provider
    if (provider === OAuthProvider.ZALO && !user.zalo_id) {
      await this.prisma.users.update({
        where: { id: user.id },
        data: {
          zalo_id: profile.id,
          zalo_oa_follower: true,
        },
      });
    }

    // Generate JWT tokens
    const roles = user.user_role_assignments.map((r: any) => r.role);
    const payload = {
      sub: user.id,
      email: user.email,
      roles,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshTokenValue = crypto.randomBytes(32).toString('hex');
    const refreshTokenHash = crypto
      .createHash('sha256')
      .update(refreshTokenValue)
      .digest('hex');

    // Store refresh token
    await this.prisma.refresh_tokens.create({
      data: {
        user_id: user.id,
        token_hash: refreshTokenHash,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        ip_address: ipAddress,
        user_agent: userAgent,
      },
    });

    return {
      accessToken,
      refreshToken: refreshTokenValue,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        roles,
      },
    };
  }

  /**
   * Exchange Google authorization code for tokens
   */
  private async exchangeGoogleCode(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string,
  ): Promise<OAuthTokens> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error('Google token exchange failed', { error });
      throw new UnauthorizedException('Failed to exchange authorization code');
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  }

  /**
   * Get Google user profile
   */
  private async getGoogleProfile(accessToken: string): Promise<OAuthProfile> {
    const response = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    if (!response.ok) {
      throw new UnauthorizedException('Failed to get Google profile');
    }

    const data = await response.json();
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      firstName: data.given_name,
      lastName: data.family_name,
      picture: data.picture,
    };
  }

  /**
   * Exchange Zalo authorization code for tokens
   */
  private async exchangeZaloCode(
    code: string,
    appId: string,
    appSecret: string,
    codeVerifier: string,
  ): Promise<OAuthTokens> {
    const response = await fetch('https://oauth.zaloapp.com/v4/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        secret_key: appSecret,
      },
      body: new URLSearchParams({
        code,
        app_id: appId,
        grant_type: 'authorization_code',
        code_verifier: codeVerifier,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error('Zalo token exchange failed', { error });
      throw new UnauthorizedException('Failed to exchange Zalo authorization code');
    }

    const data = await response.json();
    
    if (data.error) {
      throw new UnauthorizedException(data.message || 'Zalo OAuth failed');
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  }

  /**
   * Get Zalo user profile
   */
  private async getZaloProfile(accessToken: string): Promise<OAuthProfile> {
    const response = await fetch(
      'https://graph.zalo.me/v2.0/me?fields=id,name,picture',
      {
        headers: { access_token: accessToken },
      },
    );

    if (!response.ok) {
      throw new UnauthorizedException('Failed to get Zalo profile');
    }

    const data = await response.json();
    
    if (data.error) {
      throw new UnauthorizedException(data.message || 'Failed to get Zalo profile');
    }

    // Note: Zalo doesn't provide email in basic scope
    return {
      id: data.id,
      name: data.name,
      picture: data.picture?.data?.url,
    };
  }
}
