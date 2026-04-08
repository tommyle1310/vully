import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Home,
  FileText,
  AlertTriangle,
  Plus,
  ChevronRight,
  FileSignature,
  CalendarClock,
  Wallet,
  Receipt,
  Clock,
  AlertCircle,
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


import { useMyContracts, useMyApartment } from '@/hooks/use-contracts';
import { useIncidents } from '@/hooks/use-incidents';
import { useInvoices } from '@/hooks/use-invoices';
import { useAuthStore } from '@/stores/authStore';
import { formatDistanceToNow, format, differenceInDays, isPast } from 'date-fns';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const statusBadgeVariant = {
  new: 'secondary',
  investigating: 'outline',
  in_progress: 'default',
  resolved: 'secondary',
  closed: 'outline',
} as const;

const statusLabels = {
  new: 'New',
  investigating: 'Investigating',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
} as const;

export function ResidentDashboard() {
  const { user } = useAuthStore();
  const { data: apartmentData, isLoading: isLoadingApartment } = useMyApartment();
  const { data: contractsData, isLoading: isLoadingContracts } = useMyContracts();
  const { data: incidentsData, isLoading: isLoadingIncidents } = useIncidents({}, 1, 5);
  const { data: invoicesData, isLoading: isLoadingInvoices } = useInvoices({ limit: 20 });

  const apartment = apartmentData?.data;
  const contracts = contractsData?.data || [];
  const invoices = invoicesData?.data || [];
  const activeContract = contracts.find((c) => c.status === 'active');
  
  // Fallback: If useMyApartment doesn't return data but we have an active contract, use contract data
  const apartmentInfo = apartment || (activeContract?.apartment ? {
    apartmentId: activeContract.apartment.id,
    apartmentUnitNumber: activeContract.apartment.unit_number,
    buildingId: activeContract.apartment.buildingId || '',
    buildingName: activeContract.apartment.building?.name || '',
    contractId: activeContract.id,
  } : null);
  
  const incidents = incidentsData?.data?.filter((i) => i.apartment?.id === apartmentInfo?.apartmentId) || [];
  const openIncidents = incidents.filter((i) => !['resolved', 'closed'].includes(i.status));
  const payableInvoices = invoices
    .filter((inv) => inv.status === 'pending' || inv.status === 'overdue')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  const nextInvoice = payableInvoices[0];
  const totalOutstanding = payableInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  
  // Payment warning calculations
  const overdueInvoices = payableInvoices.filter((inv) => inv.status === 'overdue');
  const hasOverdue = overdueInvoices.length > 0;
  const nextDueDate = nextInvoice ? new Date(nextInvoice.dueDate) : null;
  const daysUntilDue = nextDueDate ? differenceInDays(nextDueDate, new Date()) : null;
  const isDueSoon = daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 7;
  const isOverdue = daysUntilDue !== null && daysUntilDue < 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome, {user?.firstName || 'Resident'}
        </h1>
        <p className="text-muted-foreground">
          Everything important for your apartment and payments, in one place.
        </p>
      </div>

      {/* Payment Warning Banner */}
      {!isLoadingInvoices && (hasOverdue || isDueSoon) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Alert variant={hasOverdue ? 'destructive' : 'default'} className={hasOverdue ? '' : 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20'}>
            {hasOverdue ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <Clock className="h-4 w-4 text-yellow-600" />
            )}
            <AlertTitle className={hasOverdue ? '' : 'text-yellow-700 dark:text-yellow-500'}>
              {hasOverdue 
                ? `${overdueInvoices.length} Overdue Payment${overdueInvoices.length > 1 ? 's' : ''}!`
                : 'Payment Due Soon'
              }
            </AlertTitle>
            <AlertDescription className={hasOverdue ? '' : 'text-yellow-600 dark:text-yellow-400'}>
              {hasOverdue ? (
                <div className="flex items-center justify-between">
                  <span>
                    Total overdue: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                      overdueInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0)
                    )}
                  </span>
                  <Link href="/invoices">
                    <Button variant="destructive" size="sm">
                      Pay Now
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span>
                    {daysUntilDue === 0 
                      ? 'Payment is due today!' 
                      : daysUntilDue === 1 
                        ? 'Payment is due tomorrow!' 
                        : `Payment due in ${daysUntilDue} days`
                    } — {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(nextInvoice?.totalAmount || 0)}
                  </span>
                  <Link href="/invoices">
                    <Button variant="outline" size="sm" className="border-yellow-500 text-yellow-700 hover:bg-yellow-100 dark:text-yellow-400 dark:hover:bg-yellow-950">
                      View Invoice
                    </Button>
                  </Link>
                </div>
              )}
            </AlertDescription>
          </Alert>
        </motion.div>
      )}

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        <motion.div variants={item}>
          <Card className="border-primary/25 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                Your Home Snapshot
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingApartment ? (
                <div className="space-y-2">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-48" />
                </div>
              ) : apartmentInfo ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">{apartmentInfo.apartmentUnitNumber}</p>
                    <p className="text-muted-foreground">
                      {apartmentInfo.buildingName}
                    </p>
                    {activeContract?.endDate && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Lease ends {format(new Date(activeContract.endDate), 'MMM dd, yyyy')}
                      </p>
                    )}
                  </div>
                  <Link href={`/apartments/${apartmentInfo.apartmentId}`}>
                    <Button variant="outline" size="sm">
                      View Details
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  No apartment assigned. Please contact your administrator.
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item} className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Contract Status</CardTitle>
              <FileSignature className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoadingContracts ? (
                <Skeleton className="h-8 w-20" />
              ) : activeContract ? (
                <>
                  <Badge variant="default" className="mb-2">
                    Active
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    {activeContract.endDate && (
                      <>Expires {format(new Date(activeContract.endDate), 'MMM dd, yyyy')}</>
                    )}
                  </p>
                </>
              ) : (
                <span className="text-muted-foreground">No active contract</span>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoadingInvoices ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalOutstanding)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {payableInvoices.length} unpaid invoices
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/incidents" className="block">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Plus className="mr-2 h-4 w-4" />
                  Report Incident
                </Button>
              </Link>
              <Link href="/invoices" className="block">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <FileText className="mr-2 h-4 w-4" />
                  View Invoices
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item} className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="h-4 w-4" />
                    Next Payment
                  </CardTitle>
                  <CardDescription>Upcoming due item</CardDescription>
                </div>
                <Link href="/invoices">
                  <Button variant="outline" size="sm">
                    View All
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingInvoices ? (
                <Skeleton className="h-20 w-full" />
              ) : nextInvoice ? (
                <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Invoice {nextInvoice.invoice_number}</p>
                      <p className="text-xl font-semibold">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(nextInvoice.totalAmount)}
                      </p>
                    </div>
                    <Badge variant={nextInvoice.status === 'overdue' ? 'destructive' : 'outline'}>
                      {nextInvoice.status}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <CalendarClock className="h-3.5 w-3.5" />
                    Due {format(new Date(nextInvoice.dueDate), 'MMM dd, yyyy')}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No unpaid invoices</p>
                  <Link href="/invoices">
                    <Button variant="link" className="mt-2">
                      Open invoices
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Service Requests</CardTitle>
                  <CardDescription>Your recent incidents</CardDescription>
                </div>
                <Link href="/incidents">
                  <Button variant="outline" size="sm">
                    View All
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingIncidents ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : openIncidents.length > 0 ? (
                <div className="space-y-2">
                  {openIncidents.slice(0, 3).map((incident) => (
                    <Link
                      key={incident.id}
                      href={`/incidents?incident=${incident.id}`}
                      className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2.5 hover:bg-muted/40"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{incident.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <Badge variant={statusBadgeVariant[incident.status as keyof typeof statusBadgeVariant] || 'secondary'}>
                        {statusLabels[incident.status as keyof typeof statusLabels] || incident.status}
                      </Badge>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <AlertTriangle className="mx-auto mb-3 h-10 w-10 opacity-50" />
                  <p>No active service requests</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {activeContract && (
          <motion.div variants={item}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Contract Details</CardTitle>
                    <CardDescription>Your current lease agreement</CardDescription>
                  </div>
                  <Link href="/contracts">
                    <Button variant="outline" size="sm">
                      View Contract
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Start Date</p>
                    <p className="text-lg font-semibold">
                      {format(new Date(activeContract.start_date), 'MMM dd, yyyy')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">End Date</p>
                    <p className="text-lg font-semibold">
                      {activeContract.endDate
                        ? format(new Date(activeContract.endDate), 'MMM dd, yyyy')
                        : 'Open-ended'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Monthly Rent</p>
                    <p className="text-lg font-semibold">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(activeContract.rentAmount)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
