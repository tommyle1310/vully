import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
import { CacheModule } from '@nestjs/cache-manager';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import * as redisStore from 'cache-manager-redis-store';

// Configuration
import { appConfig, databaseConfig, redisConfig, jwtConfig, s3Config } from './config';

// Common modules
import { PrismaModule } from './common/prisma/prisma.module';
import { HealthModule } from './common/health/health.module';
import { SentryModule } from './common/sentry/sentry.module';

// Feature modules (will be added progressively)
import { IdentityModule } from './modules/identity/identity.module';
import { ApartmentsModule } from './modules/apartments/apartments.module';
import { BillingModule } from './modules/billing/billing.module';
import { StatsModule } from './modules/stats/stats.module';
import { IncidentsModule } from './modules/incidents/incidents.module';
import { AiAssistantModule } from './modules/ai-assistant/ai-assistant.module';
import { PaymentsWebhookModule } from './modules/payments-webhook/payments-webhook.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
// import { DashboardModule } from './modules/dashboard/dashboard.module';

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

    // Event emitter for cache invalidation and domain events
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      maxListeners: 10,
    }),

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

    // Redis cache for dashboard stats
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        store: redisStore as any,
        host: configService.get('redis.host'),
        port: configService.get('redis.port'),
        ttl: 300, // 5 minutes default TTL
      }),
    }),

    // Common modules
    PrismaModule,
    HealthModule,
    SentryModule,

    // Scheduler for cron jobs
    ScheduleModule.forRoot(),

    // Feature modules
    IdentityModule,
    ApartmentsModule,
    BillingModule,
    StatsModule,
    IncidentsModule,
    AiAssistantModule,
    PaymentsWebhookModule,
    NotificationsModule,
    // DashboardModule,
  ],
})
export class AppModule {}
