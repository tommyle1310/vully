import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface DashboardStats {
  apartments: {
    total: number;
    vacant: number;
    occupied: number;
    maintenance: number;
  };
  residents: {
    total: number;
    active: number;
  };
  invoices: {
    pending: number;
    overdue: number;
    paidThisMonth: number;
    totalOutstanding: number;
  };
  incidents: {
    open: number;
    inProgress: number;
    resolvedThisMonth: number;
  };
}

export interface AdminStats extends DashboardStats {
  revenue: {
    thisMonth: number;
    lastMonth: number;
    percentChange: number;
  };
  buildings: {
    total: number;
  };
}

@Injectable()
export class StatsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getDashboardStats(userId: string, userRole: string): Promise<DashboardStats> {
    // Try cache first
    const cacheKey = `dashboard:stats:${userRole}:${userId}`;
    const cached = await this.cacheManager.get<DashboardStats>(cacheKey);
    if (cached) {
      return cached;
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

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
    const totalOutstanding = outstandingAgg._sum.total_amount?.toNumber() || 0;

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

    // Cache for 5 minutes
    await this.cacheManager.set(cacheKey, stats, 300 * 1000);
    return stats;
  }

  async getAdminStats(): Promise<AdminStats> {
    const baseStats = await this.getDashboardStats('', 'admin');

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Revenue this month
    const thisMonthRevenue = await this.prisma.invoices.aggregate({
      where: {
        status: 'paid',
        paid_at: { gte: startOfMonth },
      },
      _sum: { total_amount: true },
    });

    // Revenue last month
    const lastMonthRevenue = await this.prisma.invoices.aggregate({
      where: {
        status: 'paid',
        paid_at: {
          gte: startOfLastMonth,
          lte: endOfLastMonth,
        },
      },
      _sum: { total_amount: true },
    });

    const thisMonth = thisMonthRevenue._sum.total_amount?.toNumber() || 0;
    const lastMonth = lastMonthRevenue._sum.total_amount?.toNumber() || 0;
    const percentChange = lastMonth > 0
      ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100)
      : thisMonth > 0 ? 100 : 0;

    // Building count
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

  // =============================================================================
  // Analytics Endpoints
  // =============================================================================

  async getOccupancyTrend(months = 12): Promise<Array<{ month: string; occupancyRate: number; total: number; occupied: number }>> {
    const cacheKey = `analytics:occupancy:${months}`;
    const cached = await this.cacheManager.get<any>(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const trends = [];

    for (let i = months - 1; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

      // Count apartments
      const total = await this.prisma.apartments.count({
        where: {
          created_at: { lt: nextMonth },
        },
      });

      // Count active contracts in that month
      const occupied = await this.prisma.contracts.count({
        where: {
          status: 'active',
          start_date: { lt: nextMonth },
          OR: [
            { end_date: null },
            { end_date: { gte: month } },
          ],
        },
      });

      const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0;

      trends.push({
        month: month.toISOString().substring(0, 7), // YYYY-MM format
        occupancyRate,
        total,
        occupied,
      });
    }

    await this.cacheManager.set(cacheKey, trends, 300 * 1000); // 5 min cache
    return trends;
  }

  async getRevenueBreakdown(months = 6): Promise<Array<{ month: string; rent: number; utilities: number; fees: number; total: number }>> {
    const cacheKey = `analytics:revenue:${months}`;
    const cached = await this.cacheManager.get<any>(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const breakdown = [];

    for (let i = months - 1; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

      // Get paid invoices for this month
      const invoices = await this.prisma.invoices.findMany({
        where: {
          status: 'paid',
          paid_at: {
            gte: monthStart,
            lt: monthEnd,
          },
        },
        include: {
          invoice_line_items: true,
        },
      });

      let rent = 0;
      let utilities = 0;
      let fees = 0;

      for (const invoice of invoices) {
        for (const item of invoice.invoice_line_items) {
          const amount = item.amount.toNumber();
          if (item.description.toLowerCase().includes('rent')) {
            rent += amount;
          } else if (item.description.toLowerCase().includes('water') || 
                     item.description.toLowerCase().includes('electric') || 
                     item.description.toLowerCase().includes('gas')) {
            utilities += amount;
          } else {
            fees += amount;
          }
        }
      }

      breakdown.push({
        month: monthStart.toISOString().substring(0, 7),
        rent: Math.round(rent),
        utilities: Math.round(utilities),
        fees: Math.round(fees),
        total: Math.round(rent + utilities + fees),
      });
    }

    await this.cacheManager.set(cacheKey, breakdown, 300 * 1000);
    return breakdown;
  }

  async getIncidentAnalytics(): Promise<{
    byCategory: Array<{ category: string; count: number; avgResolutionTime: number }>;
    byPriority: Array<{ priority: string; count: number }>;
    byStatus: Array<{ status: string; count: number }>;
  }> {
    const cacheKey = 'analytics:incidents';
    const cached = await this.cacheManager.get<any>(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Group by category with avg resolution time
    const byCategory = await this.prisma.incidents.groupBy({
      by: ['category'],
      where: {
        created_at: { gte: thirtyDaysAgo },
      },
      _count: { id: true },
    });

    const categoryStats = await Promise.all(
      byCategory.map(async (cat) => {
        const resolvedIncidents = await this.prisma.incidents.findMany({
          where: {
            category: cat.category,
            status: 'resolved',
            resolved_at: { not: null },
            created_at: { gte: thirtyDaysAgo },
          },
          select: {
            created_at: true,
            resolved_at: true,
          },
        });

        let avgResolutionTime = 0;
        if (resolvedIncidents.length > 0) {
          const totalTime = resolvedIncidents.reduce((sum, inc) => {
            const resTime = inc.resolved_at!.getTime() - inc.created_at.getTime();
            return sum + resTime;
          }, 0);
          avgResolutionTime = Math.round(totalTime / resolvedIncidents.length / (1000 * 60 * 60)); // hours
        }

        return {
          category: cat.category,
          count: cat._count.id,
          avgResolutionTime,
        };
      })
    );

    // Group by priority
    const byPriority = await this.prisma.incidents.groupBy({
      by: ['priority'],
      where: {
        created_at: { gte: thirtyDaysAgo },
      },
      _count: { id: true },
    });

    const priorityStats = byPriority.map((p) => ({
      priority: p.priority,
      count: p._count.id,
    }));

    // Group by status
    const byStatus = await this.prisma.incidents.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    const statusStats = byStatus.map((s) => ({
      status: s.status,
      count: s._count.id,
    }));

    const result = {
      byCategory: categoryStats,
      byPriority: priorityStats,
      byStatus: statusStats,
    };

    await this.cacheManager.set(cacheKey, result, 300 * 1000);
    return result;
  }

  async getRecentActivity(limit = 10): Promise<Array<{
    id: string;
    type: 'incident' | 'invoice' | 'contract';
    title: string;
    description: string;
    timestamp: Date;
    status?: string;
    priority?: string;
  }>> {
    const cacheKey = `activity:recent:${limit}`;
    const cached = await this.cacheManager.get<any>(cacheKey);
    if (cached) return cached;

    const activities: Array<any> = [];

    // Recent incidents (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const recentIncidents = await this.prisma.incidents.findMany({
      where: {
        created_at: { gte: sevenDaysAgo },
      },
      orderBy: { created_at: 'desc' },
      take: Math.ceil(limit / 3),
      include: {
        apartments: {
          include: {
            buildings: true,
          },
        },
      },
    });

    for (const incident of recentIncidents) {
      activities.push({
        id: incident.id,
        type: 'incident' as const,
        title: incident.title,
        description: `${incident.category} - ${incident.apartments.buildings.name}, ${incident.apartments.floor_index}F-${incident.apartments.unit_number}`,
        timestamp: incident.created_at,
        status: incident.status,
        priority: incident.priority,
      });
    }

    // Recent invoices (last 7 days)
    const recentInvoices = await this.prisma.invoices.findMany({
      where: {
        created_at: { gte: sevenDaysAgo },
      },
      orderBy: { created_at: 'desc' },
      take: Math.ceil(limit / 3),
      include: {
        contracts: {
          include: {
            apartments: {
              include: {
                buildings: true,
              },
            },
          },
        },
      },
    });

    for (const invoice of recentInvoices) {
      const amount = invoice.total_amount.toNumber();
      activities.push({
        id: invoice.id,
        type: 'invoice' as const,
        title: `Invoice #${invoice.invoice_number}`,
        description: `${invoice.contracts.apartments.buildings.name}, ${invoice.contracts.apartments.floor_index}F-${invoice.contracts.apartments.unit_number} - ${amount.toLocaleString('vi-VN')} VND`,
        timestamp: invoice.created_at,
        status: invoice.status,
      });
    }

    // Recent contracts (last 7 days)
    const recentContracts = await this.prisma.contracts.findMany({
      where: {
        created_at: { gte: sevenDaysAgo },
      },
      orderBy: { created_at: 'desc' },
      take: Math.ceil(limit / 3),
      include: {
        apartments: {
          include: {
            buildings: true,
          },
        },
        users_contracts_tenant_idTousers: true,
      },
    });

    for (const contract of recentContracts) {
      activities.push({
        id: contract.id,
        type: 'contract' as const,
        title: `New Contract`,
        description: `${contract.users_contracts_tenant_idTousers.first_name} ${contract.users_contracts_tenant_idTousers.last_name} - ${contract.apartments.buildings.name}, ${contract.apartments.floor_index}F-${contract.apartments.unit_number}`,
        timestamp: contract.created_at,
        status: contract.status,
      });
    }

    // Sort by timestamp and limit
    const sortedActivities = activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);

    await this.cacheManager.set(cacheKey, sortedActivities, 60 * 1000); // 1 min cache
    return sortedActivities;
  }
}
