import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Logger } from 'nestjs-pino';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly logger: Logger) {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connected', 'PrismaService');

    // Log slow queries in development
    if (process.env.NODE_ENV !== 'production') {
      // @ts-expect-error Prisma event typing
      this.$on('query', (e: { duration: number; query: string }) => {
        if (e.duration > 100) {
          this.logger.warn(
            { duration: e.duration, query: e.query },
            'Slow query detected',
          );
        }
      });
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected', 'PrismaService');
  }

  /**
   * Clean database (for testing only)
   */
  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clean database in production');
    }

    const models = Reflect.ownKeys(this).filter(
      (key) => typeof key === 'string' && !key.startsWith('_') && !key.startsWith('$'),
    );

    for (const model of models) {
      try {
        // @ts-expect-error Dynamic model access
        await this[model]?.deleteMany?.();
      } catch {
        // Ignore errors for non-model properties
      }
    }
  }
}
