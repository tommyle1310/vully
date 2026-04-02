'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Building,
  User,
  Calendar,
  DollarSign,
  FileText,
  Pencil,
  XCircle,
  Loader2,
} from 'lucide-react';
import { Contract, useTerminateContract } from '@/hooks/use-contracts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface ContractDetailSheetProps {
  contract: Contract | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (contract: Contract) => void;
}

const statusVariants: Record<string, 'default' | 'success' | 'warning' | 'destructive'> = {
  draft: 'default',
  active: 'success',
  expired: 'warning',
  terminated: 'destructive',
};

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

export function ContractDetailSheet({
  contract,
  open,
  onOpenChange,
  onEdit,
}: ContractDetailSheetProps) {
  const { toast } = useToast();
  const terminateContract = useTerminateContract();
  const [terminateOpen, setTerminateOpen] = useState(false);
  const [terminateDate, setTerminateDate] = useState('');
  const [terminateReason, setTerminateReason] = useState('');

  if (!contract) return null;

  const handleTerminate = async () => {
    try {
      await terminateContract.mutateAsync({
        id: contract.id,
        data: {
          end_date: terminateDate,
          reason: terminateReason || undefined,
        },
      });
      toast({
        title: 'Contract terminated',
        description: 'The contract has been terminated and apartment set to vacant.',
      });
      setTerminateOpen(false);
      onOpenChange(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      toast({
        title: 'Failed to terminate contract',
        description: message,
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-[420px] sm:w-[480px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Contract Details
            </SheetTitle>
            <SheetDescription>
              {contract.apartment?.unit_number
                ? `Apartment ${contract.apartment.unit_number}`
                : 'Contract information'}
            </SheetDescription>
          </SheetHeader>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 space-y-6"
          >
            {/* Status */}
            <div className="flex items-center justify-between">
              <Badge
                variant={statusVariants[contract.status] || 'default'}
                className="text-sm px-3 py-1"
              >
                {contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}
              </Badge>
              <div className="flex gap-2">
                {onEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(contract)}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                )}
                {contract.status === 'active' && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setTerminateDate(new Date().toISOString().split('T')[0]);
                      setTerminateReason('');
                      setTerminateOpen(true);
                    }}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Terminate
                  </Button>
                )}
              </div>
            </div>

            {/* Apartment Info */}
            <Card>
              <CardContent className="pt-4 space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Apartment
                </h3>
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
                  value={
                    contract.apartment?.floorIndex !== undefined
                      ? `Floor ${contract.apartment.floorIndex}`
                      : '-'
                  }
                />
              </CardContent>
            </Card>

            {/* Tenant Info */}
            <Card>
              <CardContent className="pt-4 space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Tenant
                </h3>
                <InfoRow
                  icon={User}
                  label="Name"
                  value={
                    contract.tenant
                      ? `${contract.tenant.firstName} ${contract.tenant.lastName}`
                      : '-'
                  }
                />
                <InfoRow
                  icon={User}
                  label="Email"
                  value={contract.tenant?.email || '-'}
                />
              </CardContent>
            </Card>

            <Separator />

            {/* Contract Dates */}
            <Card>
              <CardContent className="pt-4 space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Duration
                </h3>
                <InfoRow
                  icon={Calendar}
                  label="Start Date"
                  value={new Date(contract.start_date).toLocaleDateString()}
                />
                <InfoRow
                  icon={Calendar}
                  label="End Date"
                  value={
                    contract.endDate
                      ? new Date(contract.endDate).toLocaleDateString()
                      : 'Open-ended'
                  }
                />
              </CardContent>
            </Card>

            {/* Financial */}
            <Card>
              <CardContent className="pt-4 space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Financial
                </h3>
                <InfoRow
                  icon={DollarSign}
                  label="Monthly Rent"
                  value={`${new Intl.NumberFormat('vi-VN').format(contract.rentAmount)} VND`}
                />
                <InfoRow
                  icon={DollarSign}
                  label="Deposit Months"
                  value={`${contract.depositMonths} month(s)`}
                />
                {contract.depositAmount && (
                  <InfoRow
                    icon={DollarSign}
                    label="Deposit Amount"
                    value={`${new Intl.NumberFormat('vi-VN').format(contract.depositAmount)} VND`}
                  />
                )}
              </CardContent>
            </Card>

            {/* Terms / Notes */}
            {contract.termsNotes && (
              <Card>
                <CardContent className="pt-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Terms & Notes
                  </h3>
                  <p className="text-sm whitespace-pre-wrap">
                    {contract.termsNotes}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Metadata */}
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Created: {new Date(contract.created_at).toLocaleString()}</p>
              <p>Updated: {new Date(contract.updatedAt).toLocaleString()}</p>
            </div>
          </motion.div>
        </SheetContent>
      </Sheet>

      {/* Terminate Confirmation Dialog */}
      <Dialog open={terminateOpen} onOpenChange={setTerminateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Terminate Contract</DialogTitle>
            <DialogDescription>
              This will terminate the contract and set the apartment back to
              vacant. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="terminate-date">Termination Date</Label>
              <Input
                id="terminate-date"
                type="date"
                value={terminateDate}
                onChange={(e) => setTerminateDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="terminate-reason">Reason (optional)</Label>
              <Textarea
                id="terminate-reason"
                placeholder="Reason for early termination..."
                value={terminateReason}
                onChange={(e) => setTerminateReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTerminateOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleTerminate}
              disabled={!terminateDate || terminateContract.isPending}
            >
              {terminateContract.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirm Termination
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
