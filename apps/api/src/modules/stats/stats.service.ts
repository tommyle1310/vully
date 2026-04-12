import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../../common/prisma/prisma.service';
import { getStartOfMonth, getStartOfLastMonth, getEndOfLastMonth } from '../../common/utils/date.util';
import { toNumber } from '../../common/utils/decimal.util';
import { CACHE_TTL_MS } from '../../common/constants/defaults';
import { DashboardStats, AdminStats } from '../../common/types/service-types';

interface TechnicianDashboardStats {
  assignedCount: number;
  inProgressCount: number;
  pendingReviewCount: number;
  resolvedThisMonth: number;
  avgResolutionHours: number;
  urgentCount: number;
}

@Injectable()
export class StatsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getDashboardStats(userId: string, userRole: string): Promise<DashboardStats> {
    const cacheKey = `dashboard:stats:${userRole}:${userId}`;
    const cached = await this.cacheManager.get<DashboardStats>(cacheKey);
    if (cached) {
      return cached;
    }

    const now = new Date();
    const startOfMonth = getStartOfMonth(now);

    // Apartment stats
    const apartmentStats = await this.prisma.apartments.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    const apartmentCounts = {
      total: 0,
      vacant: 0,
      occupied: 0,
      maintenance: 0,
    };

    for (const stat of apartmentStats) {
      apartmentCounts.total += stat._count.id;
      if (stat.status === 'vacant') apartmentCounts.vacant = stat._count.id;
      if (stat.status === 'occupied') apartmentCounts.occupied = stat._count.id;
      if (stat.status === 'maintenance') apartmentCounts.maintenance = stat._count.id;
    }

    // Resident stats
    const totalResidents = await this.prisma.users.count({
      where: { role: 'resident' },
    });
    const activeResidents = await this.prisma.users.count({
      where: { role: 'resident', is_active: true },
    });

    // Invoice stats
    const pendingInvoices = await this.prisma.invoices.count({
      where: { status: 'pending' },
    });
    const overdueInvoices = await this.prisma.invoices.count({
      where: { status: 'overdue' },
    });
    const paidThisMonth = await this.prisma.invoices.count({
      where: {
        status: 'paid',
        paid_at: { gte: startOfMonth },
      },
    });
    const outstandingAgg = await this.prisma.invoices.aggregate({
      where: { status: { in: ['pending', 'overdue'] } },
      _sum: { total_amount: true },
    });
    const totalOutstanding = toNumber(outstandingAgg._sum.total_amount);

    // Incident stats
    const openIncidents = await this.prisma.incidents.count({
      where: { status: 'open' },
    });
    const inProgressIncidents = await this.prisma.incidents.count({
      where: { status: 'in_progress' },
    });
    const resolvedThisMonth = await this.prisma.incidents.count({
      where: {
        status: 'resolved',
        resolved_at: { gte: startOfMonth },
      },
    });

    const stats = {
      apartments: apartmentCounts,
      residents: {
        total: totalResidents,
        active: activeResidents,
      },
      invoices: {
        pending: pendingInvoices,
        overdue: overdueInvoices,
        paidThisMonth,
        totalOutstanding,
      },
      incidents: {
        open: openIncidents,
        inProgress: inProgressIncidents,
        resolvedThisMonth,
      },
    };

    await this.cacheManager.set(cacheKey, stats, CACHE_TTL_MS);
    return stats;
  }

  async getAdminStats(): Promise<AdminStats> {
    const baseStats = await this.getDashboardStats('', 'admin');

    const now = new Date();
    const startOfMonth = getStartOfMonth(now);
    const startOfLastMonth_ = getStartOfLastMonth(now);
    const endOfLastMonth_ = getEndOfLastMonth(now);

    const thisMonthRevenue = await this.prisma.invoices.aggregate({
      where: {
        status: 'paid',
        paid_at: { gte: startOfMonth },
      },
      _sum: { total_amount: true },
    });

    const lastMonthRevenue = await this.prisma.invoices.aggregate({
      where: {
        status: 'paid',
        paid_at: {
          gte: startOfLastMonth_,
          lte: endOfLastMonth_,
        },
      },
      _sum: { total_amount: true },
    });

    const thisMonth = toNumber(thisMonthRevenue._sum.total_amount);
    const lastMonth = toNumber(lastMonthRevenue._sum.total_amount);
    const percentChange = lastMonth > 0
      ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100)
      : thisMonth > 0 ? 100 : 0;

    const totalBuildings = await this.prisma.buildings.count();

    return {
      ...baseStats,
      revenue: {
        thisMonth,
        lastMonth,
        percentChange,
      },
      buildings: {
        total: totalBuildings,
      },
    };
  }

  async getTechnicianDashboardStats(technicianId: string): Promise<TechnicianDashboardStats> {
    const cacheKey = `technician:dashboard:${technicianId}`;
    const cached = await this.cacheManager.get<TechnicianDashboardStats>(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const startOfMonth = getStartOfMonth(now);

    const [assignedCount, inProgressCount, pendingReviewCount, resolvedThisMonth, urgentCount, allResolved] =
      await Promise.all([
        this.prisma.incidents.count({
          where: { assigned_to: technicianId, status: 'assigned' },
        }),
        this.prisma.incidents.count({
          where: { assigned_to: technicianId, status: 'in_progress' },
        }),
        this.prisma.incidents.count({
          where: { assigned_to: technicianId, status: 'pending_review' },
        }),
        this.prisma.incidents.count({
          where: {
            assigned_to: technicianId,
            status: 'resolved',
            resolved_at: { gte: startOfMonth },
          },
        }),
        this.prisma.incidents.count({
          where: {
            assigned_to: technicianId,
            status: { in: ['assigned', 'in_progress'] },
            priority: 'urgent',
          },
        }),
        this.prisma.incidents.findMany({
          where: {
            assigned_to: technicianId,
            status: 'resolved',
            resolved_at: { not: null },
          },
          select: {
            created_at: true,
            resolved_at: true,
          },
          take: 100,
          orderBy: { resolved_at: 'desc' },
        }),
      ]);

    // Calculate average resolution time in hours
    let avgResolutionHours = 0;
    if (allResolved.length > 0) {
      const totalHours = allResolved.reduce((sum, inc) => {
        if (!inc.resolved_at) return sum;
        const diff = inc.resolved_at.getTime() - inc.created_at.getTime();
        return sum + diff / (1000 * 60 * 60);
      }, 0);
      avgResolutionHours = Math.round((totalHours / allResolved.length) * 10) / 10;
    }

    const stats: TechnicianDashboardStats = {
      assignedCount,
      inProgressCount,
      pendingReviewCount,
      resolvedThisMonth,
      avgResolutionHours,
      urgentCount,
    };

    await this.cacheManager.set(cacheKey, stats, CACHE_TTL_MS);
    return stats;
  }
}
