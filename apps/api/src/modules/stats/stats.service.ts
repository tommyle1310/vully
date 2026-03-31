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
    const apartmentStats = await this.prisma.apartment.groupBy({
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
    const totalResidents = await this.prisma.user.count({
      where: { role: 'resident' },
    });
    const activeResidents = await this.prisma.user.count({
      where: { role: 'resident', isActive: true },
    });

    // Invoice stats
    const pendingInvoices = await this.prisma.invoice.count({
      where: { status: 'pending' },
    });
    const overdueInvoices = await this.prisma.invoice.count({
      where: { status: 'overdue' },
    });
    const paidThisMonth = await this.prisma.invoice.count({
      where: {
        status: 'paid',
        paidAt: { gte: startOfMonth },
      },
    });
    const outstandingAgg = await this.prisma.invoice.aggregate({
      where: { status: { in: ['pending', 'overdue'] } },
      _sum: { totalAmount: true },
    });
    const totalOutstanding = outstandingAgg._sum.totalAmount?.toNumber() || 0;

    // Incident stats
    const openIncidents = await this.prisma.incident.count({
      where: { status: 'open' },
    });
    const inProgressIncidents = await this.prisma.incident.count({
      where: { status: 'in_progress' },
    });
    const resolvedThisMonth = await this.prisma.incident.count({
      where: {
        status: 'resolved',
        resolvedAt: { gte: startOfMonth },
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
    const thisMonthRevenue = await this.prisma.invoice.aggregate({
      where: {
        status: 'paid',
        paidAt: { gte: startOfMonth },
      },
      _sum: { totalAmount: true },
    });

    // Revenue last month
    const lastMonthRevenue = await this.prisma.invoice.aggregate({
      where: {
        status: 'paid',
        paidAt: {
          gte: startOfLastMonth,
          lte: endOfLastMonth,
        },
      },
      _sum: { totalAmount: true },
    });

    const thisMonth = thisMonthRevenue._sum.totalAmount?.toNumber() || 0;
    const lastMonth = lastMonthRevenue._sum.totalAmount?.toNumber() || 0;
    const percentChange = lastMonth > 0
      ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100)
      : thisMonth > 0 ? 100 : 0;

    // Building count
    const totalBuildings = await this.prisma.building.count();

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
      const total = await this.prisma.apartment.count({
        where: {
          createdAt: { lt: nextMonth },
        },
      });

      // Count active contracts in that month
      const occupied = await this.prisma.contract.count({
        where: {
          status: 'active',
          startDate: { lt: nextMonth },
          OR: [
            { endDate: null },
            { endDate: { gte: month } },
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
      const invoices = await this.prisma.invoice.findMany({
        where: {
          status: 'paid',
          paidAt: {
            gte: monthStart,
            lt: monthEnd,
          },
        },
        include: {
          lineItems: true,
        },
      });

      let rent = 0;
      let utilities = 0;
      let fees = 0;

      for (const invoice of invoices) {
        for (const item of invoice.lineItems) {
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
    const byCategory = await this.prisma.incident.groupBy({
      by: ['category'],
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
      _count: { id: true },
    });

    const categoryStats = await Promise.all(
      byCategory.map(async (cat) => {
        const resolvedIncidents = await this.prisma.incident.findMany({
          where: {
            category: cat.category,
            status: 'resolved',
            resolvedAt: { not: null },
            createdAt: { gte: thirtyDaysAgo },
          },
          select: {
            createdAt: true,
            resolvedAt: true,
          },
        });

        let avgResolutionTime = 0;
        if (resolvedIncidents.length > 0) {
          const totalTime = resolvedIncidents.reduce((sum, inc) => {
            const resTime = inc.resolvedAt!.getTime() - inc.createdAt.getTime();
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
    const byPriority = await this.prisma.incident.groupBy({
      by: ['priority'],
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
      _count: { id: true },
    });

    const priorityStats = byPriority.map((p) => ({
      priority: p.priority,
      count: p._count.id,
    }));

    // Group by status
    const byStatus = await this.prisma.incident.groupBy({
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
    
    const recentIncidents = await this.prisma.incident.findMany({
      where: {
        createdAt: { gte: sevenDaysAgo },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.ceil(limit / 3),
      include: {
        apartment: {
          include: {
            building: true,
          },
        },
      },
    });

    for (const incident of recentIncidents) {
      activities.push({
        id: incident.id,
        type: 'incident' as const,
        title: incident.title,
        description: `${incident.category} - ${incident.apartment.building.name}, ${incident.apartment.floor}F-${incident.apartment.number}`,
        timestamp: incident.createdAt,
        status: incident.status,
        priority: incident.priority,
      });
    }

    // Recent invoices (last 7 days)
    const recentInvoices = await this.prisma.invoice.findMany({
      where: {
        createdAt: { gte: sevenDaysAgo },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.ceil(limit / 3),
      include: {
        contract: {
          include: {
            apartment: {
              include: {
                building: true,
              },
            },
          },
        },
      },
    });

    for (const invoice of recentInvoices) {
      const amount = invoice.totalAmount.toNumber();
      activities.push({
        id: invoice.id,
        type: 'invoice' as const,
        title: `Invoice #${invoice.invoiceNumber}`,
        description: `${invoice.contract.apartment.building.name}, ${invoice.contract.apartment.floor}F-${invoice.contract.apartment.number} - ${amount.toLocaleString('vi-VN')} VND`,
        timestamp: invoice.createdAt,
        status: invoice.status,
      });
    }

    // Recent contracts (last 7 days)
    const recentContracts = await this.prisma.contract.findMany({
      where: {
        createdAt: { gte: sevenDaysAgo },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.ceil(limit / 3),
      include: {
        apartment: {
          include: {
            building: true,
          },
        },
        tenant: true,
      },
    });

    for (const contract of recentContracts) {
      activities.push({
        id: contract.id,
        type: 'contract' as const,
        title: `New Contract`,
        description: `${contract.tenant.firstName} ${contract.tenant.lastName} - ${contract.apartment.building.name}, ${contract.apartment.floor}F-${contract.apartment.number}`,
        timestamp: contract.createdAt,
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
