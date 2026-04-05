import {
  createColumnHelper,
} from '@tanstack/react-table';
import {
  AlertCircle,
  Clock,
  CheckCircle,
  User,
  Wrench,
  CircleDot,
} from 'lucide-react';
import { Incident } from '@/hooks/use-incidents';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/format';

const columnHelper = createColumnHelper<Incident>();

export const statusConfig: Record<
  Incident['status'],
  { label: string; variant: 'default' | 'secondary' | 'warning' | 'success' | 'destructive'; icon: typeof Clock }
> = {
  open: { label: 'Open', variant: 'destructive', icon: AlertCircle },
  assigned: { label: 'Assigned', variant: 'warning', icon: User },
  in_progress: { label: 'In Progress', variant: 'default', icon: Wrench },
  pending_review: { label: 'Pending Review', variant: 'secondary', icon: Clock },
  resolved: { label: 'Resolved', variant: 'success', icon: CheckCircle },
  closed: { label: 'Closed', variant: 'secondary', icon: CircleDot },
};

export const priorityConfig: Record<
  Incident['priority'],
  { label: string; variant: 'default' | 'secondary' | 'warning' | 'destructive' }
> = {
  low: { label: 'Low', variant: 'secondary' },
  medium: { label: 'Medium', variant: 'default' },
  high: { label: 'High', variant: 'warning' },
  urgent: { label: 'Urgent', variant: 'destructive' },
};

export const categoryLabels: Record<string, string> = {
  plumbing: 'Plumbing',
  electrical: 'Electrical',
  hvac: 'HVAC',
  structural: 'Structural',
  appliance: 'Appliance',
  pest: 'Pest Control',
  noise: 'Noise',
  security: 'Security',
  other: 'Other',
};

function getFullName(user?: { firstName: string; lastName: string }): string {
  if (!user) return '-';
  return `${user.firstName} ${user.lastName}`;
}

export const columns = [
  columnHelper.accessor('title', {
    header: 'Incident',
    cell: (info) => {
      const incident = info.row.original;
      return (
        <div className="max-w-[300px]">
          <span className="font-medium line-clamp-1">{info.getValue()}</span>
          <span className="block text-xs text-muted-foreground">
            {categoryLabels[incident.category] ?? incident.category}
          </span>
        </div>
      );
    },
  }),
  columnHelper.accessor('apartment', {
    header: 'Location',
    cell: (info) => {
      const apartment = info.getValue();
      if (!apartment) return '-';
      return (
        <div>
          <span className="font-medium">{apartment.unit_number}</span>
          <span className="block text-xs text-muted-foreground">
            {apartment.building?.name || ''}
          </span>
        </div>
      );
    },
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => {
      const status = info.getValue();
      const config = statusConfig[status];
      const Icon = config.icon;
      return (
        <Badge variant={(config.variant ?? 'secondary') as 'default' | 'secondary' | 'destructive' | 'outline'} className="gap-1">
          <Icon className="h-3 w-3" />
          {config.label}
        </Badge>
      );
    },
  }),
  columnHelper.accessor('priority', {
    header: 'Priority',
    cell: (info) => {
      const priority = info.getValue();
      const config = priorityConfig[priority];
      return <Badge variant={(config.variant ?? 'secondary') as 'default' | 'secondary' | 'destructive' | 'outline'}>{config.label}</Badge>;
    },
  }),
  columnHelper.accessor('assignedTo', {
    header: 'Assigned To',
    cell: (info) => getFullName(info.getValue()),
  }),
  columnHelper.accessor('reportedBy', {
    header: 'Reported By',
    cell: (info) => getFullName(info.getValue()),
  }),
  columnHelper.accessor('created_at', {
    header: 'Created',
    cell: (info) => formatDate(info.getValue()),
  }),
];
