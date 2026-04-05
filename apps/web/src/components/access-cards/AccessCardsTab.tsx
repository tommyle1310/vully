'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useAccessCards,
  useAccessCardStats,
  AccessCard,
  AccessCardStatus,
  AccessCardType,
  getStatusLabel,
  getCardTypeLabel,
  getStatusVariant,
} from '@/hooks/use-access-cards';
import { IssueAccessCardDialog } from './IssueAccessCardDialog';
import { DeactivateCardDialog } from './DeactivateCardDialog';
import { EditAccessCardDialog } from './EditAccessCardDialog';
import { ReactivateCardDialog } from './ReactivateCardDialog';
import {
  Plus,
  MoreHorizontal,
  CreditCard,
  Car,
  Ban,
  RefreshCw,
  Edit,
  User,
  Building2,
} from 'lucide-react';

interface AccessCardsTabProps {
  apartmentId: string;
  buildingFloorCount?: number;
}

export function AccessCardsTab({
  apartmentId,
  buildingFloorCount = 20,
}: AccessCardsTabProps) {
  const [statusFilter, setStatusFilter] = useState<AccessCardStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<AccessCardType | 'all'>('all');
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<AccessCard | null>(null);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [reactivateDialogOpen, setReactivateDialogOpen] = useState(false);

  const { data: cardsResponse, isLoading: cardsLoading } = useAccessCards(
    apartmentId,
    {
      status: statusFilter !== 'all' ? statusFilter : undefined,
      cardType: typeFilter !== 'all' ? typeFilter : undefined,
    },
  );
  const { data: statsResponse } = useAccessCardStats(apartmentId);

  const cards = cardsResponse?.data ?? [];
  const stats = statsResponse?.data;
  const cardLimit = cardsResponse?.limit ?? 4;
  const activeCount = cardsResponse?.activeCount ?? 0;

  const handleDeactivate = (card: AccessCard) => {
    setSelectedCard(card);
    setDeactivateDialogOpen(true);
  };

  const handleEdit = (card: AccessCard) => {
    setSelectedCard(card);
    setEditDialogOpen(true);
  };

  const handleReactivate = (card: AccessCard) => {
    setSelectedCard(card);
    setReactivateDialogOpen(true);
  };

  const getCardIcon = (type: AccessCardType) => {
    return type === 'building' ? (
      <Building2 className="h-4 w-4" />
    ) : (
      <Car className="h-4 w-4" />
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-medium">Access Cards</h3>
          <p className="text-sm text-muted-foreground">
            Manage building and parking access cards for this apartment
          </p>
        </div>
        <Button onClick={() => setIssueDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Issue Card
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Cards</CardDescription>
            <CardTitle className="text-2xl">
              {stats?.active ?? 0} / {cardLimit}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              {cardLimit - activeCount} building card slots available
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Lost</CardDescription>
            <CardTitle className="text-2xl text-destructive">
              {stats?.lost ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Deactivated</CardDescription>
            <CardTitle className="text-2xl text-muted-foreground">
              {stats?.deactivated ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Expired</CardDescription>
            <CardTitle className="text-2xl text-muted-foreground">
              {stats?.expired ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as AccessCardStatus | 'all')}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
            <SelectItem value="deactivated">Deactivated</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={typeFilter}
          onValueChange={(v) => setTypeFilter(v as AccessCardType | 'all')}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="building">Building</SelectItem>
            <SelectItem value="parking">Parking</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cards table */}
      <Card>
        <CardContent className="p-0">
          {cardsLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-3 w-[100px]" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </div>
          ) : cards.length === 0 ? (
            <div className="p-12 text-center">
              <CreditCard className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">No access cards</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Issue access cards to enable building and parking access.
              </p>
              <Button
                className="mt-4"
                onClick={() => setIssueDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Issue First Card
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Card Number</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Holder</TableHead>
                  <TableHead>Access Zones</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence mode="popLayout">
                  {cards.map((card) => (
                    <motion.tr
                      key={card.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      layout
                      className="border-b transition-colors hover:bg-muted/50"
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {getCardIcon(card.cardType)}
                          {card.cardNumber}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getCardTypeLabel(card.cardType)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(card.status)}>
                          {getStatusLabel(card.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {card.holder ? (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {card.holder.firstName} {card.holder.lastName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {card.accessZones.slice(0, 3).map((zone) => (
                            <Badge
                              key={zone}
                              variant="secondary"
                              className="text-xs"
                            >
                              {zone}
                            </Badge>
                          ))}
                          {card.accessZones.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{card.accessZones.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(card.issuedAt)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(card)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {card.status === 'active' ? (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDeactivate(card)}
                              >
                                <Ban className="mr-2 h-4 w-4" />
                                Deactivate
                              </DropdownMenuItem>
                            ) : card.status !== 'expired' ? (
                              <DropdownMenuItem
                                onClick={() => handleReactivate(card)}
                              >
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Reactivate
                              </DropdownMenuItem>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <IssueAccessCardDialog
        open={issueDialogOpen}
        onOpenChange={setIssueDialogOpen}
        apartmentId={apartmentId}
        buildingFloorCount={buildingFloorCount}
        currentCardCount={activeCount}
        cardLimit={cardLimit}
      />
      <DeactivateCardDialog
        open={deactivateDialogOpen}
        onOpenChange={setDeactivateDialogOpen}
        card={selectedCard}
      />
      <EditAccessCardDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        card={selectedCard}
        buildingFloorCount={buildingFloorCount}
      />
      <ReactivateCardDialog
        open={reactivateDialogOpen}
        onOpenChange={setReactivateDialogOpen}
        card={selectedCard}
      />
    </div>
  );
}
