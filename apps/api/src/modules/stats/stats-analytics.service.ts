import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../../common/prisma/prisma.service';
import { getMonthOffset } from '../../common/utils/date.util';
import {
  CACHE_TTL_MS,
  CACHE_TTL_SHORT_MS,
  THIRTY_DAYS_MS,
  SEVEN_DAYS_MS,
} from '../../common/constants/defaults';

@Injectable()
export class StatsAnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getOccupancyTrend(months = 12): Promise<Array<{ month: string; occupancyRate: number; total: number; occupied: number }>> {
    const cacheKey = `analytics:occupancy:${months}`;
    const cached = await this.cacheManager.get<any>(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const startMonth = getMonthOffset(now, -months + 1);
    const endMonth = getMonthOffset(now, 1);

    const allApartments = await this.prisma.apartments.findMany({
      where: { created_at: { lt: endMonth } },
      select: { created_at: true },
    });

    const allContracts = await this.prisma.contracts.findMany({
      where: {
        status: 'active',
        start_date: { lt: endMonth },
        OR: [
          { end_date: null },
          { end_date: { gte: startMonth } },
        ],
      },
      select: { start_date: true, end_date: true },
    });

    const trends = [];
    for (let i = months - 1; i >= 0; i--) {
      const month = getMonthOffset(now, -i);
      const nextMonth = getMonthOffset(now, -i + 1);

      const total = allApartments.filter(a => a.created_at < nextMonth).length;
      const occupied = allContracts.filter(c =>
        c.start_date < nextMonth && (c.end_date === null || c.end_date >= month),
      ).length;

      const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0;
      trends.push({
        month: month.toISOString().substring(0, 7),
        occupancyRate,
        total,
        occupied,
      });
    }

    await this.cacheManager.set(cacheKey, trends, CACHE_TTL_MS);
    return trends;
  }

  async getRevenueBreakdown(months = 6): Promise<Array<{ month: string; rent: number; utilities: number; fees: number; total: number }>> {
    const cacheKey = `analytics:revenue:${months}`;
    const cached = await this.cacheManager.get<any>(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const rangeStart = getMonthOffset(now, -months + 1);
    const rangeEnd = getMonthOffset(now, 1);

    const allInvoices = await this.prisma.invoices.findMany({
      where: {
        status: 'paid',
        paid_at: { gte: rangeStart, lt: rangeEnd },
      },
      include: { invoice_line_items: true },
    });

    const byMonth = new Map<string, typeof allInvoices>();
    for (const inv of allInvoices) {
      if (!inv.paid_at) continue;
      const key = inv.paid_at.toISOString().substring(0, 7);
      if (!byMonth.has(key)) byMonth.set(key, []);
      byMonth.get(key)!.push(inv);
    }

    const breakdown = [];
    for (let i = months - 1; i >= 0; i--) {
      const monthStart = getMonthOffset(now, -i);
      const monthKey = monthStart.toISOString().substring(0, 7);
      const monthInvoices = byMonth.get(monthKey) || [];

      const { rent, utilities, fees } = this.categorizeInvoiceLineItems(monthInvoices);

      breakdown.push({
        month: monthKey,
        rent: Math.round(rent),
        utilities: Math.round(utilities),
        fees: Math.round(fees),
        total: Math.round(rent + utilities + fees),
      });
    }

    await this.cacheManager.set(cacheKey, breakdown, CACHE_TTL_MS);
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
    const thirtyDaysAgo = new Date(now.getTime() - THIRTY_DAYS_MS);

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
          avgResolutionTime = Math.round(totalTime / resolvedIncidents.length / (1000 * 60 * 60));
        }

        return {
          category: cat.category,
          count: cat._count.id,
          avgResolutionTime,
        };
      })
    );

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

    await this.cacheManager.set(cacheKey, result, CACHE_TTL_MS);
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
    const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS);

    const recentIncidents = await this.prisma.incidents.findMany({
      where: { created_at: { gte: sevenDaysAgo } },
      orderBy: { created_at: 'desc' },
      take: Math.ceil(limit / 3),
      include: {
        apartments: { include: { buildings: true } },
      },
    });

    for (const incident of recentIncidents) {
      const apartment = incident.apartments;
      const building = apartment?.buildings;
      const location = apartment && building
        ? `${building.name}, ${apartment.floor_index}F-${apartment.unit_number}`
        : 'Unknown location';

      activities.push({
        id: incident.id,
        type: 'incident' as const,
        title: incident.title,
        description: `${incident.category} - ${location}`,
        timestamp: incident.created_at,
        status: incident.status,
        priority: incident.priority,
      });
    }

    const recentInvoices = await this.prisma.invoices.findMany({
      where: { created_at: { gte: sevenDaysAgo } },
      orderBy: { created_at: 'desc' },
      take: Math.ceil(limit / 3),
      include: {
        contracts: {
          include: { apartments: { include: { buildings: true } } },
        },
      },
    });

    for (const invoice of recentInvoices) {
      const contract = invoice.contracts;
      const apartment = contract?.apartments;
      const building = apartment?.buildings;
      const location = apartment && building
        ? `${building.name}, ${apartment.floor_index}F-${apartment.unit_number}`
        : 'Unknown location';
      const amount = invoice.total_amount.toNumber();

      activities.push({
        id: invoice.id,
        type: 'invoice' as const,
        title: `Invoice #${invoice.invoice_number}`,
        description: `${location} - ${amount.toLocaleString('vi-VN')} VND`,
        timestamp: invoice.created_at,
        status: invoice.status,
      });
    }

    const recentContracts = await this.prisma.contracts.findMany({
      where: { created_at: { gte: sevenDaysAgo } },
      orderBy: { created_at: 'desc' },
      take: Math.ceil(limit / 3),
      include: {
        apartments: { include: { buildings: true } },
        users_contracts_tenant_idTousers: true,
      },
    });

    for (const contract of recentContracts) {
      const tenant = contract.users_contracts_tenant_idTousers;
      const apartment = contract.apartments;
      const building = apartment?.buildings;
      const tenantName = tenant
        ? `${tenant.first_name} ${tenant.last_name}`
        : 'Unknown tenant';
      const location = apartment && building
        ? `${building.name}, ${apartment.floor_index}F-${apartment.unit_number}`
        : 'Unknown location';

      activities.push({
        id: contract.id,
        type: 'contract' as const,
        title: `New Contract`,
        description: `${tenantName} - ${location}`,
        timestamp: contract.created_at,
        status: contract.status,
      });
    }

    const sortedActivities = activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);

    await this.cacheManager.set(cacheKey, sortedActivities, CACHE_TTL_SHORT_MS);
    return sortedActivities;
  }

  private categorizeInvoiceLineItems(
    invoices: Array<{ invoice_line_items: Array<{ description: string; amount: { toNumber(): number } }> }>,
  ): { rent: number; utilities: number; fees: number } {
    let rent = 0;
    let utilities = 0;
    let fees = 0;

    for (const invoice of invoices) {
      for (const item of invoice.invoice_line_items) {
        const amount = item.amount.toNumber();
        const desc = item.description.toLowerCase();
        if (desc.includes('rent')) {
          rent += amount;
        } else if (desc.includes('water') || desc.includes('electric') || desc.includes('gas')) {
          utilities += amount;
        } else {
          fees += amount;
        }
      }
    }

    return { rent, utilities, fees };
  }
}
