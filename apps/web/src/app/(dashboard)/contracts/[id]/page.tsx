'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { formatCurrency, formatDate } from '@/lib/format';
import {
  ArrowLeft,
  Building,
  User,
  Calendar,
  DollarSign,
  FileText,
  Pencil,
} from 'lucide-react';
import { useContract } from '@/hooks/use-contracts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

import { ContractFinancialSummaryCard } from '@/components/payments/ContractFinancialSummary';
import { PaymentScheduleTable } from '@/components/payments/PaymentScheduleTable';

interface PageProps {
  params: Promise<{ id: string }>;
}

const statusVariants: Record<string, 'default' | 'success' | 'warning' | 'destructive'> = {
  draft: 'default',
  active: 'success',
  expired: 'warning',
  terminated: 'destructive',
};

/** Extract the contract type tag written by buildTermsNotes() */
function parseContractType(
  termsNotes?: string,
): 'rental' | 'purchase' | 'lease_to_own' {
  if (!termsNotes) return 'rental';
  const match = termsNotes.match(/\[Contract Type:\s*([^\]]+)\]/);
  if (!match) return 'rental';
  const label = match[1].trim();
  if (label === 'Purchase') return 'purchase';
  if (label === 'Lease to Own') return 'lease_to_own';
  return 'rental';
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 mt-0.5 text-muted-foreground" />
      <div className="flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-96" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    </div>
  );
}

export default function ContractDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { data, isLoading, error } = useContract(resolvedParams.id);

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (error || !data?.data) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Contract not found</h2>
        <p className="text-muted-foreground mb-4">The contract you're looking for doesn't exist.</p>
        <Button onClick={() => router.push('/contracts')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Contracts
        </Button>
      </div>
    );
  }

  const contract = data.data;
  const contractType = parseContractType(contract.termsNotes);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/contracts')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">
                Contract - {contract.apartment?.unit_number || 'Unknown Unit'}
              </h1>
              <Badge variant={statusVariants[contract.status] || 'default'} className="text-sm">
                {contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {contract.apartment?.building?.name || 'Unknown Building'}
              {' · '}
              {contract.tenant ? `${contract.tenant.firstName} ${contract.tenant.lastName}` : 'No tenant'}
            </p>
          </div>
        </div>
        <Button variant="outline" disabled>
          <Pencil className="mr-2 h-4 w-4" />
          Edit Contract
        </Button>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left - Payment Schedule */}
        <div className="lg:col-span-2 space-y-6">
          {/* Financial Summary */}
          <ContractFinancialSummaryCard contractId={contract.id} />

          {/* Payment Schedule Table */}
          <Card>
            <CardContent className="pt-6">
              <PaymentScheduleTable
                contractId={contract.id}
                contractType={contractType}
                rentAmount={contract.rentAmount}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right - Contract Info */}
        <div className="space-y-6">
          {/* Contract Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Contract Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InfoRow
                icon={Calendar}
                label="Start Date"
                value={formatDate(contract.start_date, { year: 'numeric', month: 'long', day: 'numeric' })}
              />
              <InfoRow
                icon={Calendar}
                label="End Date"
                value={contract.endDate ? formatDate(contract.endDate, { year: 'numeric', month: 'long', day: 'numeric' }) : 'Open-ended'}
              />
              <Separator />
              <InfoRow
                icon={DollarSign}
                label="Monthly Rent"
                value={
                  <span>
                    {formatCurrency(contract.rentAmount)}
                    <span className="text-xs text-muted-foreground ml-1">(excl. VAT)</span>
                  </span>
                }
              />
              <InfoRow
                icon={DollarSign}
                label="Deposit"
                value={`${contract.depositMonths} month(s) (${formatCurrency(contract.depositAmount || contract.rentAmount * contract.depositMonths)})`}
              />
            </CardContent>
          </Card>

          {/* Apartment Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Apartment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InfoRow
                icon={Building}
                label="Building"
                value={contract.apartment?.building?.name || '-'}
              />
              <InfoRow
                icon={Building}
                label="Unit"
                value={contract.apartment?.unit_number || '-'}
              />
              <InfoRow
                icon={Building}
                label="Floor"
                value={contract.apartment?.floorIndex !== undefined ? `Floor ${contract.apartment.floorIndex}` : '-'}
              />
            </CardContent>
          </Card>

          {/* Tenant Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Tenant
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InfoRow
                icon={User}
                label="Name"
                value={contract.tenant ? `${contract.tenant.firstName} ${contract.tenant.lastName}` : '-'}
              />
              <InfoRow
                icon={User}
                label="Email"
                value={contract.tenant?.email || '-'}
              />
            </CardContent>
          </Card>

          {/* Notes */}
          {contract.termsNotes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Terms & Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{contract.termsNotes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </motion.div>
  );
}
