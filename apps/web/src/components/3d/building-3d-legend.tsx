'use client';

import { cn } from '@/lib/utils';
import { STATUS_COLORS, ApartmentStatus } from './building-3d';

interface Building3DLegendProps {
  className?: string;
}

const LEGEND_ITEMS: Array<{ status: ApartmentStatus; label: string }> = [
  { status: 'vacant', label: 'Vacant' },
  { status: 'occupied', label: 'Occupied' },
  { status: 'maintenance', label: 'Maintenance' },
  { status: 'reserved', label: 'Reserved' },
];

export function Building3DLegend({ className }: Building3DLegendProps) {
  return (
    <div className={cn('flex flex-wrap gap-4 text-xs bg-background/80 backdrop-blur-sm rounded-md px-3 py-2', className)}>
      {LEGEND_ITEMS.map((item) => (
        <div key={item.status} className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 rounded"
            style={{ backgroundColor: STATUS_COLORS[item.status] }}
          />
          <span className="text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
