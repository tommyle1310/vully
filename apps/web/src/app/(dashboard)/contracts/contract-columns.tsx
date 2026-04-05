import {
  createColumnHelper,
} from '@tanstack/react-table';
import { Contract } from '@/hooks/use-contracts';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const columnHelper = createColumnHelper<Contract>();

/** Extract the contract type tag written by buildTermsNotes() */
export function parseContractType(
  termsNotes?: string,
): 'Rental' | 'Purchase' | 'Lease to Own' | null {
  if (!termsNotes) return null;
  const match = termsNotes.match(/\[Contract Type:\s*([^\]]+)\]/);
  if (!match) return null;
  const label = match[1].trim();
  if (label === 'Rental') return 'Rental';
  if (label === 'Purchase') return 'Purchase';
  if (label === 'Lease to Own') return 'Lease to Own';
  return null;
}

/** Pull purchase price out of the termsNotes free-text block */
function parsePurchasePrice(termsNotes?: string): number | null {
  if (!termsNotes) return null;
  const match = termsNotes.match(/Purchase Price:\s*([\d,]+)\s*VND/);
  return match ? parseInt(match[1].replace(/,/g, ''), 10) : null;
}

export const statusVariants: Record<string, 'default' | 'success' | 'warning' | 'destructive'> = {
  draft: 'default',
  active: 'success',
  expired: 'warning',
  terminated: 'destructive',
};

export const typeVariants: Record<
  string,
  'default' | 'secondary' | 'outline'
> = {
  Rental: 'default',
  Purchase: 'secondary',
  'Lease to Own': 'outline',
};

export const columns = [
  columnHelper.display({
    id: 'type',
    header: 'Type',
    cell: ({ row }) => {
      const type = parseContractType(row.original.termsNotes);
      return (
        <Badge variant={type ? typeVariants[type] : 'outline'}>
          {type ?? 'Rental'}
        </Badge>
      );
    },
  }),
  columnHelper.accessor(
    (row) => row.apartment?.unit_number ?? '-',
    {
      id: 'apartment',
      header: 'Apartment',
      cell: (info) => <span className="font-medium">{info.getValue()}</span>,
    },
  ),
  columnHelper.accessor(
    (row) =>
      row.tenant
        ? `${row.tenant.firstName} ${row.tenant.lastName}`
        : '-',
    {
      id: 'party',
      header: 'Tenant / Buyer',
    },
  ),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => {
      const status = info.getValue();
      return (
        <Badge variant={statusVariants[status] || 'default'}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
      );
    },
  }),
  columnHelper.display({
    id: 'amount',
    header: 'Amount',
    cell: ({ row }) => {
      const type = parseContractType(row.original.termsNotes);
      if (type === 'Purchase') {
        const price = parsePurchasePrice(row.original.termsNotes);
        if (price) {
          return (
            <span className="text-sm">
              {new Intl.NumberFormat('vi-VN').format(price)}{' '}
              <span className="text-muted-foreground text-xs">VND</span>
            </span>
          );
        }
        return <span className="text-muted-foreground text-sm">— (see notes)</span>;
      }
      return (
        <span className="text-sm">
          {new Intl.NumberFormat('vi-VN').format(row.original.rentAmount)}{' '}
          <span className="text-muted-foreground text-xs">VND/mo</span>
        </span>
      );
    },
  }),
  columnHelper.accessor('start_date', {
    header: 'Start Date',
    cell: (info) => new Date(info.getValue()).toLocaleDateString(),
  }),
  columnHelper.accessor('endDate', {
    header: 'End Date',
    cell: (info) => {
      const v = info.getValue();
      return v ? new Date(v).toLocaleDateString() : 'Open-ended';
    },
  }),
];

export function ContractTableSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="rounded-md border">
        <div className="border-b p-4">
          <div className="flex gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-4 w-24" />
            ))}
          </div>
        </div>
        {[1, 2, 3, 4, 5].map((row) => (
          <div key={row} className="border-b p-4">
            <div className="flex gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-4 w-24" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
