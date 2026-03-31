import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { StatsService, DashboardStats, AdminStats } from './stats.service';

@ApiTags('Statistics')
@Controller('stats')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

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
}
