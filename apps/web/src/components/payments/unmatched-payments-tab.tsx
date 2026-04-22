'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Check, X, Search, ArrowRightLeft, Ban } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  useUnmatchedPayments,
  useUnmatchedPaymentsStats,
  usePotentialMatches,
  useMatchPayment,
  useRejectUnmatchedPayment,
  type UnmatchedPayment,
} from '@/hooks/use-unmatched-payments';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
}

function GatewayBadge({ gateway }: { gateway: string }) {
  const colors: Record<string, string> = {
    payos: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    casso: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    sepay: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  };
  return (
    <Badge variant="outline" className={cn('text-xs', colors[gateway])}>
      {gateway.toUpperCase()}
    </Badge>
  );
}

function MatchDialog({
  payment,
  open,
  onOpenChange,
}: {
  payment: UnmatchedPayment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: matches, isLoading } = usePotentialMatches(
    open ? payment?.id ?? null : null,
  );
  const matchPayment = useMatchPayment();

  const handleMatch = (invoiceId: string) => {
    if (!payment) return;
    matchPayment.mutate(
      { paymentId: payment.id, invoiceId },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Match Payment to Invoice
          </DialogTitle>
          <DialogDescription>
            {payment && (
              <>
                {formatCurrency(payment.amount)} from{' '}
                <strong>{payment.senderName || 'Unknown'}</strong>
                {payment.description && (
                  <> — &quot;{payment.description}&quot;</>
                )}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[300px]">
          {isLoading ? (
            <div className="space-y-3 p-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !matches || matches.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Search className="mx-auto mb-2 h-8 w-8 opacity-40" />
              <p className="text-sm">No potential invoice matches found</p>
            </div>
          ) : (
            <div className="space-y-2 p-1">
              {matches.map((match) => (
                <motion.div
                  key={match.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50"
                >
                  <div>
                    <p className="text-sm font-medium">{match.invoice_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(match.total_amount - match.paid_amount)} remaining
                      {match.apartment_unit && ` · Unit ${match.apartment_unit}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {Math.round(match.matchScore * 100)}% match
                    </Badge>
                    <Button
                      size="sm"
                      onClick={() => handleMatch(match.id)}
                      disabled={matchPayment.isPending}
                    >
                      <Check className="mr-1 h-3 w-3" />
                      Match
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function RejectDialog({
  payment,
  open,
  onOpenChange,
}: {
  payment: UnmatchedPayment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [reason, setReason] = useState('');
  const rejectPayment = useRejectUnmatchedPayment();

  const handleReject = () => {
    if (!payment || !reason.trim()) return;
    rejectPayment.mutate(
      { paymentId: payment.id, reason: reason.trim() },
      {
        onSuccess: () => {
          setReason('');
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5 text-destructive" />
            Reject Payment
          </DialogTitle>
          <DialogDescription>
            This payment will be marked as rejected and won&apos;t be matched to any invoice.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Reason for rejection</Label>
            <Textarea
              placeholder="e.g., Duplicate transfer, wrong account, refund processed..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={!reason.trim() || rejectPayment.isPending}
          >
            Reject Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UnmatchedPaymentRow({
  payment,
  onMatch,
  onReject,
}: {
  payment: UnmatchedPayment;
  onMatch: () => void;
  onReject: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/30"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium">{formatCurrency(payment.amount)}</p>
            <GatewayBadge gateway={payment.gateway} />
          </div>
          <p className="text-sm text-muted-foreground">
            {payment.senderName || 'Unknown sender'}
            {payment.description && ` — "${payment.description}"`}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(payment.receivedAt), { addSuffix: true })}
            {' · '}TX: {payment.transactionId}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={onMatch}>
          <ArrowRightLeft className="mr-1 h-3.5 w-3.5" />
          Match
        </Button>
        <Button size="sm" variant="ghost" className="text-destructive" onClick={onReject}>
          <X className="mr-1 h-3.5 w-3.5" />
          Reject
        </Button>
      </div>
    </motion.div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-20 rounded-lg" />
      ))}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-20 rounded-lg" />
      ))}
    </div>
  );
}

export function UnmatchedPaymentsTab() {
  const [selectedPayment, setSelectedPayment] = useState<UnmatchedPayment | null>(null);
  const [matchDialogOpen, setMatchDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'pending' | 'matched' | 'rejected'>('pending');
  const [page, setPage] = useState(1);

  const { data: stats, isLoading: statsLoading } = useUnmatchedPaymentsStats();
  const { data: paymentsData, isLoading } = useUnmatchedPayments(filterStatus, page);

  const payments = paymentsData?.data ?? [];
  const meta = paymentsData?.meta;

  return (
    <div className="space-y-4">
      {/* Stats */}
      {statsLoading ? (
        <StatsSkeleton />
      ) : stats ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card
            className={cn('cursor-pointer transition-all', filterStatus === 'pending' && 'ring-2 ring-primary')}
            onClick={() => { setFilterStatus('pending'); setPage(1); }}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Review
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
              {stats.totalPendingAmount > 0 && (
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(stats.totalPendingAmount)} total
                </p>
              )}
            </CardContent>
          </Card>
          <Card
            className={cn('cursor-pointer transition-all', filterStatus === 'matched' && 'ring-2 ring-primary')}
            onClick={() => { setFilterStatus('matched'); setPage(1); }}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Matched
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{stats.matched}</p>
            </CardContent>
          </Card>
          <Card
            className={cn('cursor-pointer transition-all', filterStatus === 'rejected' && 'ring-2 ring-primary')}
            onClick={() => { setFilterStatus('rejected'); setPage(1); }}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Rejected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* List */}
      {isLoading ? (
        <ListSkeleton />
      ) : payments.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 opacity-30" />
          <p>No {filterStatus} webhook payments</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {payments.map((p) => (
              <UnmatchedPaymentRow
                key={p.id}
                payment={p}
                onMatch={() => {
                  setSelectedPayment(p);
                  setMatchDialogOpen(true);
                }}
                onReject={() => {
                  setSelectedPayment(p);
                  setRejectDialogOpen(true);
                }}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {meta.page} of {meta.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Dialogs */}
      <MatchDialog
        payment={selectedPayment}
        open={matchDialogOpen}
        onOpenChange={setMatchDialogOpen}
      />
      <RejectDialog
        payment={selectedPayment}
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
      />
    </div>
  );
}
