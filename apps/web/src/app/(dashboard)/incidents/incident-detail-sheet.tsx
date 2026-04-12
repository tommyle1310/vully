'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  Clock,
  CheckCircle,
  User,
  Wrench,
  CircleDot,
  MapPin,
  Calendar,
  MessageSquare,
  Send,
} from 'lucide-react';
import {
  Incident,
  useIncident,
  useIncidentComments,
  useCreateComment,
  useUpdateIncidentStatus,
  useAssignTechnician,
  useIncidentDetailRealTime,
} from '@/hooks/use-incidents';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TechnicianSelector } from '@/components/incidents/technician-selector';
import { IncidentTimeline } from '@/components/incidents/incident-timeline';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/format';

// Incident detail sheet component
interface IncidentDetailSheetProps {
  incident: Incident | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusConfig: Record<
  string,
  { label: string; variant: string; icon: typeof Clock }
> = {
  open: { label: 'Open', variant: 'destructive', icon: AlertCircle },
  assigned: { label: 'Assigned', variant: 'warning', icon: User },
  in_progress: { label: 'In Progress', variant: 'default', icon: Wrench },
  pending_review: { label: 'Pending Review', variant: 'secondary', icon: Clock },
  resolved: { label: 'Resolved', variant: 'success', icon: CheckCircle },
  closed: { label: 'Closed', variant: 'secondary', icon: CircleDot },
};

const priorityConfig: Record<string, { label: string; variant: string }> = {
  low: { label: 'Low', variant: 'secondary' },
  medium: { label: 'Medium', variant: 'default' },
  high: { label: 'High', variant: 'warning' },
  urgent: { label: 'Urgent', variant: 'destructive' },
};

const categoryLabels: Record<string, string> = {
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

const incidentDateOptions: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
};

function getFullName(user?: { firstName: string; lastName: string }): string {
  if (!user) return 'Unknown';
  return `${user.firstName} ${user.lastName}`;
}

export function IncidentDetailSheet({
  incident,
  open,
  onOpenChange,
}: IncidentDetailSheetProps) {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [newComment, setNewComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);

  const { data: incidentData, isLoading: loadingIncident } = useIncident(
    incident?.id ?? ''
  );
  const { data: commentsData, isLoading: loadingComments } = useIncidentComments(
    incident?.id ?? ''
  );

  // Enable real-time comment updates when viewing an incident
  useIncidentDetailRealTime({
    incidentId: incident?.id ?? '',
    showToasts: open, // Only show toasts when the sheet is open
  });

  const createComment = useCreateComment();
  const updateStatus = useUpdateIncidentStatus();
  const assignTechnician = useAssignTechnician();

  const currentIncident = incidentData?.data ?? incident;
  const comments = commentsData?.data ?? [];

  const isAdmin = user?.roles?.includes('admin');
  const isTechnician = user?.roles?.includes('technician');
  const isAssigned = currentIncident?.assignedToId === user?.id;

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !incident?.id) return;

    try {
      await createComment.mutateAsync({
        incidentId: incident.id,
        data: {
          content: newComment.trim(),
          isInternal: (isAdmin || isTechnician) && isInternal,
        },
      });
      setNewComment('');
      toast({
        title: 'Comment added',
        description: 'Your comment has been posted.',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to add comment.',
        variant: 'destructive',
      });
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!incident?.id) return;

    try {
      await updateStatus.mutateAsync({
        incidentId: incident.id,
        data: { status: newStatus as 'open' | 'assigned' | 'in_progress' | 'pending_review' | 'resolved' | 'closed' },
      });
      toast({
        title: 'Status updated',
        description: `Incident status changed to ${statusConfig[newStatus]?.label}.`,
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to update status.',
        variant: 'destructive',
      });
    }
  };

  const canChangeStatus =
    isAdmin || (isTechnician && isAssigned && currentIncident?.status !== 'open');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle className="text-left line-clamp-2">
            {loadingIncident ? (
              <Skeleton className="h-6 w-3/4" />
            ) : (
              currentIncident?.title
            )}
          </SheetTitle>
          <SheetDescription className="text-left">
            {loadingIncident ? (
              <Skeleton className="h-4 w-1/2" />
            ) : (
              categoryLabels[currentIncident?.category ?? ''] ??
              currentIncident?.category
            )}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 py-4">
            {/* Status & Priority */}
            <div className="flex flex-wrap gap-2">
              {currentIncident?.status && (
                <Badge variant={(statusConfig[currentIncident.status]?.variant ?? 'secondary') as 'default' | 'secondary' | 'destructive' | 'outline'}>
                  {statusConfig[currentIncident.status]?.label}
                </Badge>
              )}
              {currentIncident?.priority && (
                <Badge variant={(priorityConfig[currentIncident.priority]?.variant ?? 'secondary') as 'default' | 'secondary' | 'destructive' | 'outline'}>
                  {priorityConfig[currentIncident.priority]?.label} Priority
                </Badge>
              )}
            </div>

            {/* Description */}
            <div>
              <h4 className="text-sm font-medium mb-2">Description</h4>
              {loadingIncident ? (
                <Skeleton className="h-20 w-full" />
              ) : (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {currentIncident?.description}
                </p>
              )}
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>
                  {currentIncident?.apartment?.unit_number ?? '-'}
                  {currentIncident?.apartment?.building?.name &&
                    ` - ${currentIncident.apartment.building.name}`}
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  {currentIncident?.created_at
                    ? formatDate(currentIncident.created_at, incidentDateOptions)
                    : '-'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" />
                <span>Reported by: {getFullName(currentIncident?.reportedBy)}</span>
              </div>
              {currentIncident?.assignedTo && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Wrench className="h-4 w-4" />
                  <span>
                    Assigned: {getFullName(currentIncident.assignedTo)}
                  </span>
                </div>
              )}
            </div>

            {/* Resolution Notes */}
            {currentIncident?.resolutionNotes && (
              <div>
                <h4 className="text-sm font-medium mb-2">Resolution Notes</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {currentIncident.resolutionNotes}
                </p>
              </div>
            )}

            {/* Status Change (Admin/Technician) */}
            {canChangeStatus && (
              <div>
                <h4 className="text-sm font-medium mb-2">Update Status</h4>
                <Select
                  value={currentIncident?.status}
                  onValueChange={handleStatusChange}
                  disabled={updateStatus.isPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {isAdmin && (
                      <>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="assigned">Assigned</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="pending_review">Pending Review</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </>
                    )}
                    {isTechnician && isAssigned && (
                      <>
                        {currentIncident?.status === 'assigned' && (
                          <SelectItem value="in_progress">In Progress</SelectItem>
                        )}
                        {currentIncident?.status === 'in_progress' && (
                          <>
                            <SelectItem value="pending_review">Pending Review</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                          </>
                        )}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Assign Technician (Admin only) */}
            {isAdmin && currentIncident && (
              <div>
                <h4 className="text-sm font-medium mb-2">Assign Technician</h4>
                <TechnicianSelector
                  value={currentIncident.assignedToId ?? undefined}
                  onChange={(technicianId) => {
                    assignTechnician.mutate(
                      { incidentId: currentIncident.id, data: { technicianId } },
                      {
                        onSuccess: () => {
                          toast({
                            title: 'Technician assigned',
                            description: 'Technician has been assigned to this incident.',
                          });
                        },
                        onError: () => {
                          toast({
                            title: 'Error',
                            description: 'Failed to assign technician.',
                            variant: 'destructive',
                          });
                        },
                      },
                    );
                  }}
                  disabled={assignTechnician.isPending}
                />
              </div>
            )}

            {/* Incident Timeline */}
            {currentIncident && comments.length > 0 && (
              <IncidentTimeline
                comments={comments}
                incident={currentIncident}
              />
            )}

            <Separator />

            {/* Comments Section */}
            <div>
              <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Comments ({comments.length})
              </h4>

              {loadingComments ? (
                <div className="space-y-3">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : comments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No comments yet
                </p>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <motion.div
                      key={comment.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-3 rounded-lg border ${
                        comment.isInternal
                          ? 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800'
                          : 'bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">
                          {getFullName(comment.author)}
                          {comment.author?.role && (
                            <span className="text-xs text-muted-foreground ml-1">
                              ({comment.author.role})
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(comment.created_at, incidentDateOptions)}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                      {comment.isInternal && (
                        <Badge variant="outline" className="mt-2 text-xs">
                          Internal Note
                        </Badge>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Add Comment */}
            <div className="space-y-2">
              <Textarea
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewComment(e.target.value)}
                rows={3}
              />
              <div className="flex items-center justify-between">
                {(isAdmin || isTechnician) && (
                  <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                      className="rounded"
                    />
                    Internal note (not visible to residents)
                  </label>
                )}
                <Button
                  size="sm"
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || createComment.isPending}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Post Comment
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
