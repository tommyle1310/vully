'use client';

import { motion } from 'framer-motion';
import { FileText, AlertTriangle, FileSignature, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useRecentActivity } from '@/hooks/use-stats';
import { formatDistanceToNow } from 'date-fns';

const TYPE_ICONS = {
  incident: AlertTriangle,
  invoice: FileText,
  contracts: FileSignature,
};

const TYPE_COLORS = {
  incident: 'text-red-500',
  invoice: 'text-blue-500',
  contracts: 'text-green-500',
};

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  open: 'destructive',
  in_progress: 'default',
  resolved: 'secondary',
  pending: 'outline',
  overdue: 'destructive',
  paid: 'secondary',
  active: 'default',
  expired: 'outline',
};

const PRIORITY_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive'> = {
  low: 'secondary',
  medium: 'default',
  high: 'destructive',
  urgent: 'destructive',
};

export function RecentActivity() {
  const { data, isLoading, isError } = useRecentActivity(10);

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Failed to load activity feed</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Last 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start gap-4">
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
    );
  }

  const activities = data?.data || [];

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Last 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No recent activity</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Last 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activities.map((activity, index) => {
              const Icon = TYPE_ICONS[activity.type];
              const iconColor = TYPE_COLORS[activity.type];

              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-start gap-4 pb-4 last:pb-0 border-b last:border-b-0"
                >
                  <div className={`rounded-full bg-muted p-2 ${iconColor}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  
                  <div className="flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium leading-none">
                          {activity.title}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {activity.description}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {activity.priority && (
                          <Badge variant={PRIORITY_VARIANTS[activity.priority] || 'default'} className="text-xs">
                            {activity.priority}
                          </Badge>
                        )}
                        {activity.status && (
                          <Badge variant={STATUS_VARIANTS[activity.status] || 'default'} className="text-xs">
                            {activity.status.replace('_', ' ')}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
