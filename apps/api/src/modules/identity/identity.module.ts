import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OAuthController } from './oauth.controller';
import { OAuthService } from './oauth.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { BuildingAssignmentsController, BuildingStaffController } from './building-assignments.controller';
import { BuildingAssignmentsService } from './building-assignments.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
        signOptions: {
          expiresIn: config.get<string>('jwt.accessExpiresIn', '15m'),
        },
      }),
    }),
  ],
  controllers: [
    AuthController,
    OAuthController,
    UsersController,
    BuildingAssignmentsController,
    BuildingStaffController,
  ],
  providers: [
    AuthService,
    OAuthService,
    UsersService,
    BuildingAssignmentsService,
    JwtStrategy,
  ],
  exports: [AuthService, OAuthService, JwtStrategy, PassportModule, BuildingAssignmentsService],
})
export class IdentityModule {}
