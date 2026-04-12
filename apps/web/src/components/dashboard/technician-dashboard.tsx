'use client';

import { motion } from 'framer-motion';
import {
  Wrench,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Timer,
  ClipboardList,
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/stores/authStore';
import {
  useTechnicianDashboardStats,
  TechnicianDashboardStats,
} from '@/hooks/use-technicians';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  isLoading?: boolean;
  accent?: string;
}

function StatCard({ title, value, subtitle, icon: Icon, isLoading, accent }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${accent || 'text-muted-foreground'}`} />
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

export function TechnicianDashboard() {
  const { user } = useAuthStore();
  const { data, isLoading } = useTechnicianDashboardStats(user?.id ?? '');
  const stats: TechnicianDashboardStats | undefined = data?.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {user?.firstName || 'Technician'}
          </h1>
          <p className="text-muted-foreground">
            Here&apos;s your work overview for today.
          </p>
        </div>
        <Button asChild>
          <Link href="/incidents/my-assignments">
            <ClipboardList className="mr-2 h-4 w-4" />
            My Assignments
          </Link>
        </Button>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
      >
        <motion.div variants={item}>
          <StatCard
            title="Assigned to Me"
            value={stats?.assignedCount ?? 0}
            subtitle="Awaiting your attention"
            icon={Wrench}
            isLoading={isLoading}
            accent="text-blue-500"
          />
        </motion.div>
        <motion.div variants={item}>
          <StatCard
            title="In Progress"
            value={stats?.inProgressCount ?? 0}
            subtitle="Currently working on"
            icon={Clock}
            isLoading={isLoading}
            accent="text-yellow-500"
          />
        </motion.div>
        <motion.div variants={item}>
          <StatCard
            title="Pending Review"
            value={stats?.pendingReviewCount ?? 0}
            subtitle="Awaiting admin review"
            icon={Timer}
            isLoading={isLoading}
          />
        </motion.div>
        <motion.div variants={item}>
          <StatCard
            title="Resolved This Month"
            value={stats?.resolvedThisMonth ?? 0}
            subtitle="Great work!"
            icon={CheckCircle2}
            isLoading={isLoading}
            accent="text-green-500"
          />
        </motion.div>
        <motion.div variants={item}>
          <StatCard
            title="Avg. Resolution Time"
            value={stats?.avgResolutionHours ? `${stats.avgResolutionHours}h` : '—'}
            subtitle="Hours per incident"
            icon={Timer}
            isLoading={isLoading}
          />
        </motion.div>
        <motion.div variants={item}>
          <StatCard
            title="Urgent"
            value={stats?.urgentCount ?? 0}
            subtitle="High priority items"
            icon={AlertTriangle}
            isLoading={isLoading}
            accent="text-red-500"
          />
        </motion.div>
      </motion.div>
    </div>
  );
}
