import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { StatsService } from './stats.service';
import { StatsAnalyticsService } from './stats-analytics.service';
import { DashboardStats, AdminStats } from '../../common/types/service-types';

@ApiTags('Statistics')
@Controller('stats')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StatsController {
  constructor(
    private readonly statsService: StatsService,
    private readonly statsAnalyticsService: StatsAnalyticsService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard statistics retrieved successfully',
  })
  async getDashboardStats(
    @CurrentUser() user: { id: string; role: string },
  ): Promise<{ data: DashboardStats }> {
    const stats = await this.statsService.getDashboardStats(user.id, user.role);
    return { data: stats };
  }

  @Get('admin')
  @ApiOperation({ summary: 'Get admin statistics (revenue, etc.)' })
  @ApiResponse({
    status: 200,
    description: 'Admin statistics retrieved successfully',
  })
  async getAdminStats(
    @CurrentUser() user: { id: string; role: string },
  ): Promise<{ data: AdminStats }> {
    // TODO: Add role guard to restrict to admins only
    const stats = await this.statsService.getAdminStats();
    return { data: stats };
  }

  @Get('analytics/occupancy')
  @ApiOperation({ summary: 'Get occupancy trend over last N months' })
  @ApiQuery({ name: 'months', required: false, type: Number, description: 'Number of months (default: 12)' })
  @ApiResponse({
    status: 200,
    description: 'Occupancy trend data with Redis caching',
  })
  async getOccupancyTrend(
    @Query('months') months?: number,
  ): Promise<{ data: any }> {
    const trend = await this.statsAnalyticsService.getOccupancyTrend(months ? parseInt(String(months)) : 12);
    return { data: trend };
  }

  @Get('analytics/revenue')
  @ApiOperation({ summary: 'Get revenue breakdown by category over last N months' })
  @ApiQuery({ name: 'months', required: false, type: Number, description: 'Number of months (default: 6)' })
  @ApiResponse({
    status: 200,
    description: 'Revenue breakdown with caching',
  })
  async getRevenueBreakdown(
    @Query('months') months?: number,
  ): Promise<{ data: any }> {
    const breakdown = await this.statsAnalyticsService.getRevenueBreakdown(months ? parseInt(String(months)) : 6);
    return { data: breakdown };
  }

  @Get('analytics/incidents')
  @ApiOperation({ summary: 'Get incident analytics (by category, priority, status)' })
  @ApiResponse({
    status: 200,
    description: 'Incident analytics with response time metrics',
  })
  async getIncidentAnalytics(): Promise<{ data: any }> {
    const analytics = await this.statsAnalyticsService.getIncidentAnalytics();
    return { data: analytics };
  }

  @Get('recent-activity')
  @ApiOperation({ summary: 'Get recent activity feed (incidents, invoices, contracts)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of items to return (default: 10)' })
  @ApiResponse({
    status: 200,
    description: 'Recent activity feed with caching',
  })
  async getRecentActivity(
    @Query('limit') limit?: number,
  ): Promise<{ data: any }> {
    const activity = await this.statsAnalyticsService.getRecentActivity(limit ? parseInt(String(limit)) : 10);
    return { data: activity };
  }
}
