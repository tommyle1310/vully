import { Injectable } from '@nestjs/common';
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
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardStats(userId: string, userRole: string): Promise<DashboardStats> {
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

    return {
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
}
