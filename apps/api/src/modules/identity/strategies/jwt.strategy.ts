import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { JwtPayload } from '../interfaces/auth.interface';
import { AuthUser } from '../../../common/interfaces/auth-user.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    // Verify user still exists and is active (lightweight check)
    const user = await this.prisma.users.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        is_active: true,
      },
    });

    if (!user || !user.is_active) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Return AuthUser with roles from JWT payload (no extra DB query needed)
    // Include `role` (singular) for backward compatibility with controllers using user.role
    return {
      id: payload.sub,
      email: payload.email,
      roles: payload.roles, // Multi-role support
      role: payload.roles[0], // Legacy: first role for backwards compatibility
    };
  }
}
