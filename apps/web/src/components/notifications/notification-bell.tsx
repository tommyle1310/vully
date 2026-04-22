'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, CheckCheck, Trash2, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationsRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
  useNotificationRealTime,
  type Notification,
} from '@/hooks/use-notifications';

const typeIcons: Record<string, string> = {
  payment_confirmed: '💰',
  payment_reminder: '⏰',
  incident_assigned: '🔧',
  incident_updated: '📝',
  incident_resolved: '✅',
  incident_status: '📋',
  building_announcement: '📢',
  announcement: '📢',
  unmatched_payment: '❓',
  access_card_approved: '✅',
  access_card_rejected: '❌',
  system: '⚙️',
};

function NotificationItem({
  notification,
  onMarkRead,
  onDelete,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 50 }}
      className={cn(
        'group flex gap-3 rounded-lg p-3 transition-colors',
        notification.is_read
          ? 'bg-transparent hover:bg-muted/50'
          : 'bg-primary/5 hover:bg-primary/10',
      )}
    >
      <span className="mt-0.5 text-lg">
        {typeIcons[notification.type] || '🔔'}
      </span>

      <div className="min-w-0 flex-1">
        <p className={cn('text-sm', !notification.is_read && 'font-semibold')}>
          {notification.title}
        </p>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {notification.message}
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {formatDistanceToNow(new Date(notification.created_at), {
            addSuffix: true,
          })}
        </p>
      </div>

      <div className="flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {!notification.is_read && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onMarkRead(notification.id);
            }}
          >
            <Check className="h-3 w-3" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-destructive hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(notification.id);
          }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </motion.div>
  );
}

function NotificationsSkeleton() {
  return (
    <div className="space-y-3 p-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="h-6 w-6 rounded" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data: countData } = useUnreadNotificationCount();
  const { data: notificationsData, isLoading } = useNotifications(1, 20);
  const markRead = useMarkNotificationsRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteNotification = useDeleteNotification();

  // Listen for real-time notification events via WebSocket
  useNotificationRealTime();

  const unreadCount = countData?.count ?? 0;
  const notifications = notificationsData?.items ?? [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-10 w-10">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px]"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[380px] p-0"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold">Notifications</h4>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} new
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
              >
                <CheckCheck className="mr-1 h-3 w-3" />
                Mark all read
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setOpen(false)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="max-h-[400px]">
          {isLoading ? (
            <NotificationsSkeleton />
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bell className="mb-2 h-8 w-8 opacity-40" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="p-1">
              <AnimatePresence mode="popLayout">
                {notifications.map((n) => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    onMarkRead={(id) => markRead.mutate([id])}
                    onDelete={(id) => deleteNotification.mutate(id)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
