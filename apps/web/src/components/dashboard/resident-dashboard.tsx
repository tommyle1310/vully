'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Home,
  FileText,
  AlertTriangle,
  CreditCard,
  Calendar,
  Plus,
  ChevronRight,
  Loader2,
  Building,
  FileSignature,
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

import { useMyContracts, useMyApartment } from '@/hooks/use-contracts';
import { useIncidents } from '@/hooks/use-incidents';
import { useAuthStore } from '@/stores/authStore';
import { formatDistanceToNow, format } from 'date-fns';

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

  const apartment = apartmentData?.data;
  const contracts = contractsData?.data || [];
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

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome, {user?.firstName || 'Resident'}
        </h1>
        <p className="text-muted-foreground">
          Your apartment dashboard overview
        </p>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        {/* Apartment Overview Card */}
        <motion.div variants={item}>
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                Your Apartment
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

        {/* Stats Cards */}
        <motion.div variants={item} className="grid gap-4 md:grid-cols-3">
          {/* Contract Card */}
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

          {/* Open Incidents Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Incidents</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoadingIncidents ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {incidents.filter((i) => !['resolved', 'closed'].includes(i.status)).length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {incidents.filter((i) => i.status === 'in_progress').length} in progress
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions Card */}
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

        {/* Recent Incidents */}
        <motion.div variants={item}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Incidents</CardTitle>
                  <CardDescription>Your reported incidents</CardDescription>
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
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : incidents.length > 0 ? (
                <div className="space-y-4">
                  {incidents.slice(0, 5).map((incident) => (
                    <Link
                      key={incident.id}
                      href={`/incidents?incident=${incident.id}`}
                      className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium truncate">{incident.title}</p>
                          <Badge variant={statusBadgeVariant[incident.status as keyof typeof statusBadgeVariant] || 'secondary'}>
                            {statusLabels[incident.status as keyof typeof statusLabels] || incident.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No incidents reported</p>
                  <Link href="/incidents">
                    <Button variant="link" className="mt-2">
                      Report your first incident
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Contract Details */}
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
