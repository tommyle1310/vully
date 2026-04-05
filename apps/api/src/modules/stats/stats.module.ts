import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
import { StatsAnalyticsService } from './stats-analytics.service';

@Module({
  imports: [PrismaModule],
  controllers: [StatsController],
  providers: [StatsService, StatsAnalyticsService],
  exports: [StatsService, StatsAnalyticsService],
})
export class StatsModule {}
