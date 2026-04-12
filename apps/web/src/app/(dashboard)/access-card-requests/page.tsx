'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  CreditCard,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import {
  AccessCardRequest,
  AccessCardRequestStatus,
  useAccessCardRequests,
  useApproveAccessCardRequest,
  useRejectAccessCardRequest,
} from '@/hooks/use-access-cards';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const statusLabel: Record<AccessCardRequestStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

function statusVariant(status: AccessCardRequestStatus): 'secondary' | 'default' | 'destructive' {
  if (status === 'approved') return 'default';
  if (status === 'rejected') return 'destructive';
  return 'secondary';
}

function cardTypeLabel(cardType: 'building' | 'parking') {
  return cardType === 'building' ? 'Building Card' : 'Parking Card';
}

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-72" />
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-96" />
    </div>
  );
}

export default function AccessCardRequestsPage() {
  const { hasRole } = useAuthStore();
  const { toast } = useToast();
  const isAdmin = hasRole('admin');

  const [statusFilter, setStatusFilter] = useState<AccessCardRequestStatus | 'all'>('all');
  const [rejectTarget, setRejectTarget] = useState<AccessCardRequest | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  const { data, isLoading, error, refetch } = useAccessCardRequests(
    statusFilter === 'all' ? undefined : { status: statusFilter },
  );
  const { data: allData } = useAccessCardRequests();
  const approveRequest = useApproveAccessCardRequest();
  const rejectRequest = useRejectAccessCardRequest();

  const requests = data?.data ?? [];
  const allRequests = allData?.data ?? [];

  const stats = useMemo(() => {
    const pending = allRequests.filter((r) => r.status === 'pending').length;
    const approved = allRequests.filter((r) => r.status === 'approved').length;
    const rejected = allRequests.filter((r) => r.status === 'rejected').length;
    return { pending, approved, rejected };
  }, [allRequests]);

  const handleApprove = (request: AccessCardRequest) => {
    approveRequest.mutate(
      { id: request.id },
      {
        onSuccess: () => {
          toast({
            title: 'Request approved',
            description: 'Access card has been issued to the resident.',
          });
        },
        onError: (approveError: Error) => {
          toast({
            title: 'Failed to approve request',
            description: approveError.message,
            variant: 'destructive',
          });
        },
      },
    );
  };

  const handleReject = () => {
    if (!rejectTarget) return;

    rejectRequest.mutate(
      {
        id: rejectTarget.id,
        reviewNote: rejectNote,
      },
      {
        onSuccess: () => {
          toast({
            title: 'Request rejected',
            description: 'Resident request has been rejected.',
          });
          setRejectTarget(null);
          setRejectNote('');
        },
        onError: (rejectError: Error) => {
          toast({
            title: 'Failed to reject request',
            description: rejectError.message,
            variant: 'destructive',
          });
        },
      },
    );
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="mb-4 h-12 w-12 text-muted-foreground" />
        <h2 className="mb-2 text-xl font-semibold">Access Denied</h2>
        <p className="text-muted-foreground">Only administrators can manage access card requests.</p>
      </div>
    );
  }

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
        <h2 className="mb-2 text-xl font-semibold">Failed to load access card requests</h2>
        <p className="mb-4 text-muted-foreground">{error.message}</p>
        <Button onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Access Card Requests</h1>
          <p className="text-muted-foreground">Review resident requests and issue cards directly.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as AccessCardRequestStatus | 'all')}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4" /> Pending
            </CardDescription>
            <CardTitle>{stats.pending}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" /> Approved
            </CardDescription>
            <CardTitle>{stats.approved}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-destructive" /> Rejected
            </CardDescription>
            <CardTitle>{stats.rejected}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {requests.length === 0 ? (
            <div className="p-12 text-center">
              <CreditCard className="mx-auto h-12 w-12 text-muted-foreground/40" />
              <h3 className="mt-4 text-lg font-medium">No requests found</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                New resident access card requests will appear here.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Requested At</TableHead>
                  <TableHead>Resident</TableHead>
                  <TableHead>Apartment</TableHead>
                  <TableHead>Card Type</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[200px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      {new Date(request.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </TableCell>
                    <TableCell>
                      {request.requester
                        ? `${request.requester.firstName} ${request.requester.lastName}`
                        : 'Unknown'}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{request.apartment?.unitNumber ?? '-'}</div>
                        <div className="text-xs text-muted-foreground">{request.apartment?.buildingName ?? '-'}</div>
                      </div>
                    </TableCell>
                    <TableCell>{cardTypeLabel(request.cardType)}</TableCell>
                    <TableCell className="max-w-[260px] truncate">{request.reason}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(request.status)}>
                        {statusLabel[request.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {request.status === 'pending' ? (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(request)}
                            disabled={approveRequest.isPending || rejectRequest.isPending}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setRejectTarget(request)}
                            disabled={approveRequest.isPending || rejectRequest.isPending}
                          >
                            Reject
                          </Button>
                        </div>
                      ) : request.status === 'approved' ? (
                        <span className="text-xs text-muted-foreground">
                          Issued: {request.issuedCard?.cardNumber ?? '-'}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {request.reviewNote ?? 'Rejected'}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!rejectTarget}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null);
            setRejectNote('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Access Card Request</DialogTitle>
            <DialogDescription>
              Provide a brief reason so the resident understands why this request was rejected.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="reject-note">Rejection reason</Label>
            <Textarea
              id="reject-note"
              value={rejectNote}
              onChange={(event) => setRejectNote(event.target.value)}
              rows={4}
              placeholder="Example: Building card limit reached for this apartment."
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectTarget(null);
                setRejectNote('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectRequest.isPending || rejectNote.trim().length < 5}
            >
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
