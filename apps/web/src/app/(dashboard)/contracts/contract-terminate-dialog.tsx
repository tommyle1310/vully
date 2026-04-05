'use client';

import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ContractTerminateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  terminateDate: string;
  onTerminateDateChange: (date: string) => void;
  terminateReason: string;
  onTerminateReasonChange: (reason: string) => void;
  onConfirm: () => void;
  isPending: boolean;
}

export function ContractTerminateDialog({
  open,
  onOpenChange,
  terminateDate,
  onTerminateDateChange,
  terminateReason,
  onTerminateReasonChange,
  onConfirm,
  isPending,
}: ContractTerminateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              onChange={(e) => onTerminateDateChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="terminate-reason">Reason (optional)</Label>
            <Textarea
              id="terminate-reason"
              placeholder="Reason for early termination..."
              value={terminateReason}
              onChange={(e) => onTerminateReasonChange(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={!terminateDate || isPending}
          >
            {isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Confirm Termination
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
