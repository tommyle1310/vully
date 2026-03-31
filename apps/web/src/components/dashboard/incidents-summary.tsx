'use client';

import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { AlertTriangle, Clock, Wrench } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useIncidentAnalytics } from '@/hooks/use-stats';

const STATUS_COLORS: Record<string, string> = {
  open: '#ef4444',        // red-500
  assigned: '#f59e0b',    // amber-500
  in_progress: '#3b82f6', // blue-500
  pending_review: '#8b5cf6', // violet-500
  resolved: '#10b981',    // green-500
  closed: '#6b7280',      // gray-500
};

const CATEGORY_ICONS: Record<string, any> = {
  plumbing: '💧',
  electrical: '⚡',
  hvac: '❄️',
  structural: '🏗️',
  appliance: '🔧',
  pest: '🐛',
  noise: '🔊',
  security: '🔒',
  other: '📋',
};

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { fill: string } }>;
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="rounded-lg border bg-background p-2 shadow-sm">
      <div className="flex items-center gap-2">
        <div
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: payload[0].payload.fill }}
        />
        <span className="font-medium">{payload[0].name}</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {payload[0].value} incidents
      </p>
    </div>
  );
}

export function IncidentsSummary() {
  const { data, isLoading, isError } = useIncidentAnalytics();

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Incidents Analytics</CardTitle>
          <CardDescription>Failed to load incident data</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Incidents Analytics</CardTitle>
          <CardDescription>Last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[320px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const analytics = data?.data;

  // Prepare chart data for status breakdown
  const statusChartData = analytics?.byStatus.map((item) => ({
    name: item.status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
    value: item.count,
    fill: STATUS_COLORS[item.status] || '#6b7280',
  })) || [];

  // Top 3 categories
  const topCategories = [...(analytics?.byCategory || [])]
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
    >
      <Card>
        <CardHeader>
          <CardTitle>Incidents Analytics</CardTitle>
          <CardDescription>Overview of incidents in the last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Status Donut Chart */}
            <div>
              <h4 className="mb-2 text-sm font-medium">By Status</h4>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Top Categories Stats */}
            <div>
              <h4 className="mb-3 text-sm font-medium">Top Categories</h4>
              <div className="space-y-3">
                {topCategories.map((cat, index) => (
                  <div key={cat.category} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">
                        {CATEGORY_ICONS[cat.category] || '📋'}
                      </span>
                      <div>
                        <p className="text-sm font-medium">
                          {cat.category.charAt(0).toUpperCase() + cat.category.slice(1)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Avg: {cat.avgResolutionTime}h resolution
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-bold">{cat.count}</span>
                  </div>
                ))}
              </div>

              {/* Priority Summary */}
              <div className="mt-4 pt-4 border-t">
                <h4 className="mb-2 text-sm font-medium">Priority Levels</h4>
                <div className="grid grid-cols-2 gap-2">
                  {analytics?.byPriority.map((p) => (
                    <div
                      key={p.priority}
                      className="rounded-md bg-muted p-2 text-center"
                    >
                      <p className="text-xs text-muted-foreground">
                        {p.priority.toUpperCase()}
                      </p>
                      <p className="text-lg font-bold">{p.count}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
