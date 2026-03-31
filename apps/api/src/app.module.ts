import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';

// Configuration
import { appConfig, databaseConfig, redisConfig, jwtConfig, s3Config } from './config';

// Common modules
import { PrismaModule } from './common/prisma/prisma.module';
import { HealthModule } from './common/health/health.module';

// Feature modules (will be added progressively)
import { IdentityModule } from './modules/identity/identity.module';
import { ApartmentsModule } from './modules/apartments/apartments.module';
import { BillingModule } from './modules/billing/billing.module';
import { StatsModule } from './modules/stats/stats.module';
import { IncidentsModule } from './modules/incidents/incidents.module';
// import { NotificationsModule } from './modules/notifications/notifications.module';
// import { DashboardModule } from './modules/dashboard/dashboard.module';
// import { AiModule } from './modules/ai/ai.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig, jwtConfig, s3Config],
      envFilePath: ['.env.local', '.env'],
    }),

    // Pino Logger
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        pinoHttp: {
          level: configService.get('NODE_ENV') === 'production' ? 'info' : 'debug',
          transport:
            configService.get('NODE_ENV') !== 'production'
              ? { target: 'pino-pretty', options: { colorize: true } }
              : undefined,
          customProps: () => ({
            context: 'HTTP',
          }),
          redact: ['req.headers.authorization'],
        },
      }),
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),

    // BullMQ for background jobs
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('redis.host'),
          port: configService.get('redis.port'),
        },
      }),
    }),

    // Common modules
    PrismaModule,
    HealthModule,

    // Feature modules
    IdentityModule,
    ApartmentsModule,
    BillingModule,
    StatsModule,
    IncidentsModule,
    // NotificationsModule,
    // DashboardModule,
    // AiModule,
  ],
})
export class AppModule {}
