'use client';

import { motion } from 'framer-motion';
import { Building, Users, FileText, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/stores/authStore';
import { useDashboardStats } from '@/hooks/use-stats';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  isLoading?: boolean;
}

function StatCard({ title, value, subtitle, icon: Icon, isLoading }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data: statsResponse, isLoading } = useDashboardStats();
  const stats = statsResponse?.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {user?.firstName || 'User'}
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s an overview of your apartment management dashboard.
        </p>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      >
        <motion.div variants={item}>
          <StatCard
            title="Total Apartments"
            value={stats?.apartments.total ?? 0}
            subtitle={`${stats?.apartments.occupied ?? 0} occupied, ${stats?.apartments.vacant ?? 0} vacant`}
            icon={Building}
            isLoading={isLoading}
          />
        </motion.div>
        <motion.div variants={item}>
          <StatCard
            title="Active Residents"
            value={stats?.residents.active ?? 0}
            subtitle={`${stats?.residents.total ?? 0} total residents`}
            icon={Users}
            isLoading={isLoading}
          />
        </motion.div>
        <motion.div variants={item}>
          <StatCard
            title="Pending Invoices"
            value={stats?.invoices.pending ?? 0}
            subtitle={`${stats?.invoices.overdue ?? 0} overdue`}
            icon={FileText}
            isLoading={isLoading}
          />
        </motion.div>
        <motion.div variants={item}>
          <StatCard
            title="Open Incidents"
            value={stats?.incidents.open ?? 0}
            subtitle={`${stats?.incidents.inProgress ?? 0} in progress`}
            icon={AlertTriangle}
            isLoading={isLoading}
          />
        </motion.div>
      </motion.div>

      {/* Placeholder for more dashboard content */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
