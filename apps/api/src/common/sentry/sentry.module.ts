import { Module, Global, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService, ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import * as Sentry from '@sentry/nestjs';

/**
 * Sentry Error Tracking Module
 * 
 * Provides error tracking and performance monitoring via Sentry.
 * 
 * Features:
 * - Automatic exception capture
 * - User context enrichment
 * - Release tracking
 * - Performance tracing
 */
@Global()
@Module({
  imports: [ConfigModule],
})
export class SentryModule implements OnModuleInit {
  private readonly logger = new Logger(SentryModule.name);

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const dsn = this.configService.get<string>('SENTRY_DSN');

    if (!dsn) {
      this.logger.warn('Sentry DSN not configured, error tracking disabled');
      return;
    }

    const environment = this.configService.get<string>('SENTRY_ENVIRONMENT', 'development');
    const release = this.configService.get<string>('SENTRY_RELEASE', `vully-api@${process.env.npm_package_version || '0.0.0'}`);

    Sentry.init({
      dsn,
      environment,
      release,
      
      // Performance monitoring
      tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
      
      // Profile sampling (requires @sentry/profiling-node)
      profilesSampleRate: environment === 'production' ? 0.1 : 1.0,
      
      // Additional options
      debug: environment === 'development',
      
      // Filter sensitive data
      beforeSend(event) {
        // Remove sensitive headers
        if (event.request?.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['cookie'];
        }
        
        // Remove password fields from body
        if (event.request?.data) {
          const data = typeof event.request.data === 'string' 
            ? JSON.parse(event.request.data) 
            : event.request.data;
          
          if (data.password) data.password = '[REDACTED]';
          if (data.passwordHash) data.passwordHash = '[REDACTED]';
          if (data.refreshToken) data.refreshToken = '[REDACTED]';
          
          event.request.data = JSON.stringify(data);
        }
        
        return event;
      },
      
      // Ignore specific errors
      ignoreErrors: [
        'UnauthorizedException',
        'ForbiddenException',
        'NotFoundException',
        'BadRequestException',
      ],
    });

    this.logger.log(`Sentry initialized for ${environment}`);
  }
}

/**
 * Sentry interceptor to add user context to errors
 */
export class SentryUserInterceptor {
  intercept(context: any, next: any) {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user) {
      Sentry.setUser({
        id: user.id,
        email: user.email,
        roles: user.roles?.join(','),
      });
    }

    return next.handle();
  }
}

/**
 * Helper to capture exceptions with additional context
 */
export function captureException(error: Error, context?: Record<string, any>) {
  Sentry.withScope((scope) => {
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }
    Sentry.captureException(error);
  });
}

/**
 * Helper to add breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category: string,
  level: 'debug' | 'info' | 'warning' | 'error' = 'info',
  data?: Record<string, any>,
) {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
    timestamp: Date.now() / 1000,
  });
}
