'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  Clock,
  CheckCircle,
  User,
  Wrench,
  CircleDot,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/format';
import { Incident, IncidentComment } from '@/hooks/incident.types';

interface TimelineEvent {
  id: string;
  type: 'status_change' | 'comment' | 'created';
  timestamp: string;
  author?: { firstName: string; lastName: string; role?: string };
  content: string;
  statusTo?: string;
  isInternal?: boolean;
}

const statusIcons: Record<string, typeof Clock> = {
  open: AlertCircle,
  assigned: User,
  in_progress: Wrench,
  pending_review: Clock,
  resolved: CheckCircle,
  closed: CircleDot,
};

const statusLabels: Record<string, string> = {
  open: 'Open',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  pending_review: 'Pending Review',
  resolved: 'Resolved',
  closed: 'Closed',
};

const dateOptions: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
};

const STATUS_CHANGE_REGEX = /^Status changed to (\w+)/;

interface IncidentTimelineProps {
  incident: Incident;
  comments: IncidentComment[];
}

export function IncidentTimeline({ incident, comments }: IncidentTimelineProps) {
  const events = useMemo<TimelineEvent[]>(() => {
    const result: TimelineEvent[] = [];

    // Created event
    result.push({
      id: 'created',
      type: 'created',
      timestamp: incident.created_at,
      author: incident.reportedBy,
      content: 'Incident reported',
    });

    // Derive events from comments
    for (const comment of comments) {
      const statusMatch = comment.content.match(STATUS_CHANGE_REGEX);
      if (statusMatch) {
        result.push({
          id: comment.id,
          type: 'status_change',
          timestamp: comment.created_at,
          author: comment.author,
          content: comment.content,
          statusTo: statusMatch[1],
          isInternal: comment.isInternal,
        });
      } else {
        result.push({
          id: comment.id,
          type: 'comment',
          timestamp: comment.created_at,
          author: comment.author,
          content: comment.content,
          isInternal: comment.isInternal,
        });
      }
    }

    // Sort chronologically
    result.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return result;
  }, [incident, comments]);

  if (events.length <= 1) return null;

  return (
    <div>
      <h4 className="text-sm font-medium mb-3">Timeline</h4>
      <div className="relative ml-3 border-l border-border pl-6 space-y-4">
        {events.map((event, index) => {
          const Icon =
            event.type === 'status_change'
              ? statusIcons[event.statusTo ?? ''] ?? CircleDot
              : event.type === 'created'
                ? AlertCircle
                : MessageSquare;

          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="relative"
            >
              <div
                className={cn(
                  'absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full border bg-background',
                  event.type === 'status_change'
                    ? 'border-primary text-primary'
                    : 'border-border text-muted-foreground',
                )}
              >
                <Icon className="h-3 w-3" />
              </div>
              <div className="text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {event.author
                      ? `${event.author.firstName} ${event.author.lastName}`
                      : 'System'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(event.timestamp, dateOptions)}
                  </span>
                  {event.isInternal && (
                    <span className="text-xs text-yellow-600 dark:text-yellow-400">
                      Internal
                    </span>
                  )}
                </div>
                {event.type === 'status_change' && event.statusTo ? (
                  <p className="text-muted-foreground">
                    Changed status to{' '}
                    <span className="font-medium text-foreground">
                      {statusLabels[event.statusTo] ?? event.statusTo}
                    </span>
                  </p>
                ) : event.type === 'created' ? (
                  <p className="text-muted-foreground">Incident created</p>
                ) : (
                  <p className="text-muted-foreground line-clamp-2">{event.content}</p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
