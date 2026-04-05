'use client';

import { motion } from 'framer-motion';
import { Home, Users, DollarSign, AlertCircle } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface ApartmentDetailPanelProps {
  apartment: {
    id: string;
    unit_number: string;
    floorIndex: number;
    status: 'vacant' | 'occupied' | 'maintenance' | 'reserved';
    grossArea?: number | null;
    bedroomCount: number;
    bathroomCount: number;
    building?: {
      id: string;
      name: string;
    };
    activeContract?: {
      id: string;
      tenant: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
      };
      startDate: string;
      endDate?: string | null;
      monthlyRent: number;
    } | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusConfig = {
  vacant: { label: 'Vacant', variant: 'default' as const, color: 'text-green-600' },
  occupied: { label: 'Occupied', variant: 'secondary' as const, color: 'text-blue-600' },
  maintenance: { label: 'Maintenance', variant: 'warning' as const, color: 'text-yellow-600' },
  reserved: { label: 'Reserved', variant: 'outline' as const, color: 'text-purple-600' },
};

export function ApartmentDetailPanel({ apartment, open, onOpenChange }: ApartmentDetailPanelProps) {
  if (!apartment) return null;

  const config = statusConfig[apartment.status];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        className="w-full sm:max-w-md overflow-y-auto"
        side="right"
        // On mobile, use bottom sheet behavior
        data-mobile-bottom-sheet="true"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Apartment {apartment.unit_number}
          </SheetTitle>
          <SheetDescription>
            {apartment.building?.name || 'Building'} - Floor {apartment.floorIndex}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Status Badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h3 className="text-sm font-medium mb-2">Status</h3>
            <Badge variant={config.variant} className="text-base">
              {config.label}
            </Badge>
          </motion.div>

          <Separator />

          {/* Apartment Details */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h3 className="text-sm font-medium mb-3">Details</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Area</span>
                <span className="font-medium">
                  {apartment.grossArea ? `${apartment.grossArea} m²` : 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Bedrooms</span>
                <span className="font-medium">{apartment.bedroomCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Bathrooms</span>
                <span className="font-medium">{apartment.bathroomCount}</span>
              </div>
            </div>
          </motion.div>

          {/* Active Contract (if occupied) */}
          {apartment.status === 'occupied' && apartment.activeContract && (
            <>
              <Separator />
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Current Tenant
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium">
                      {apartment.activeContract.tenant.firstName}{' '}
                      {apartment.activeContract.tenant.lastName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Rent</span>
                    <span className="font-medium">
                      ${apartment.activeContract.monthlyRent.toLocaleString()}/mo
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Lease Start</span>
                    <span className="font-medium">
                      {new Date(apartment.activeContract.startDate).toLocaleDateString()}
                    </span>
                  </div>
                  {apartment.activeContract.endDate && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Lease End</span>
                      <span className="font-medium">
                        {new Date(apartment.activeContract.endDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            </>
          )}

          {/* Quick Actions */}
          <Separator />
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-2"
          >
            <Button variant="outline" className="w-full justify-start" asChild>
              <a href={`/apartments/${apartment.id}`}>
                <Home className="mr-2 h-4 w-4" />
                View Full Details
              </a>
            </Button>
            {apartment.status === 'occupied' && apartment.activeContract && (
              <Button variant="outline" className="w-full justify-start" asChild>
                <a href={`/invoices?apartmentId=${apartment.id}`}>
                  <DollarSign className="mr-2 h-4 w-4" />
                  View Invoices
                </a>
              </Button>
            )}
            {apartment.status === 'maintenance' && (
              <Button variant="outline" className="w-full justify-start" asChild>
                <a href={`/incidents?apartmentId=${apartment.id}`}>
                  <AlertCircle className="mr-2 h-4 w-4" />
                  View Incidents
                </a>
              </Button>
            )}
          </motion.div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
