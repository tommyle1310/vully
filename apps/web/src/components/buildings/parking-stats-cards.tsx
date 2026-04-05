'use client';

import { Car, Bike } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ParkingStatsCardsProps {
  stats: {
    totalSlots: number;
    totalZones: number;
    availableSlots: number;
    assignedSlots: number;
    byType: {
      car: { total: number };
      motorcycle: { total: number };
    };
  };
}

export function ParkingStatsCards({ stats }: ParkingStatsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Slots
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalSlots}</div>
          <p className="text-xs text-muted-foreground">
            across {stats.totalZones} zones
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Available
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{stats.availableSlots}</div>
          <p className="text-xs text-muted-foreground">
            {stats.totalSlots > 0 
              ? Math.round((stats.availableSlots / stats.totalSlots) * 100) 
              : 0}% free
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Assigned
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{stats.assignedSlots}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            By Type
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1">
              <Car className="h-3 w-3" /> Car
            </span>
            <span>{stats.byType.car.total}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1">
              <Bike className="h-3 w-3" /> Moto
            </span>
            <span>{stats.byType.motorcycle.total}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
