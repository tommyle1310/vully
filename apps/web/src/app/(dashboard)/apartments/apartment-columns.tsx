import {
  createColumnHelper,
} from '@tanstack/react-table';
import { Apartment } from '@/hooks/use-apartments';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const columnHelper = createColumnHelper<Apartment>();

export const statusVariants: Record<string, 'default' | 'success' | 'warning' | 'destructive'> = {
  vacant: 'success',
  occupied: 'default',
  maintenance: 'warning',
  reserved: 'default',
};

export const columns = [
  columnHelper.accessor('unit_number', {
    header: 'Unit',
    cell: (info) => (
      <span className="font-medium">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor('building.name', {
    header: 'Building',
    cell: (info) => info.getValue() || '-',
  }),
  columnHelper.accessor('floorIndex', {
    header: 'Floor',
    cell: (info) => `Floor ${info.getValue()}`,
  }),
  columnHelper.accessor('grossArea', {
    header: 'Area',
    cell: (info) => info.getValue() ? `${info.getValue()} m²` : '-',
  }),
  columnHelper.accessor('bedroomCount', {
    header: 'Beds',
  }),
  columnHelper.accessor('bathroomCount', {
    header: 'Baths',
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => {
      const status = info.getValue();
      return (
        <Badge variant={statusVariants[status] || 'default'}>
          {status.charAt(0) + status.slice(1).toLowerCase()}
        </Badge>
      );
    },
  }),
];

export function ApartmentTableSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="rounded-md border">
        <div className="border-b p-4">
          <div className="flex gap-4">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <Skeleton key={i} className="h-4 w-20" />
            ))}
          </div>
        </div>
        {[1, 2, 3, 4, 5].map((row) => (
          <div key={row} className="border-b p-4">
            <div className="flex gap-4">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <Skeleton key={i} className="h-4 w-20" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
