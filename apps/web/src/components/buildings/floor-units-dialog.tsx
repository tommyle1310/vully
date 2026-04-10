'use client';

import { Home } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Apartment {
  id: string;
  unit_number: string;
  status: string;
  grossArea?: number | string | null;
  bedroomCount: number;
  bathroomCount: number;
}

interface FloorUnitsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  floor: number;
  apartments: Apartment[];
  onApartmentClick: (id: string) => void;
}

export function FloorUnitsDialog({
  open,
  onOpenChange,
  floor,
  apartments,
  onApartmentClick,
}: FloorUnitsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Floor {floor} — {apartments.length} Units</DialogTitle>
          <DialogDescription>
            {apartments.filter(a => a.status === 'occupied').length} occupied · {apartments.filter(a => a.status === 'vacant').length} vacant
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-1 pr-3">
            {apartments.map((apt) => (
              <button
                key={apt.id}
                onClick={() => {
                  onApartmentClick(apt.id);
                  onOpenChange(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-md hover:bg-muted/50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <Home className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">Unit {apt.unit_number}</span>
                  {apt.grossArea && (
                    <span className="text-xs text-muted-foreground">
                      {Number(apt.grossArea).toFixed(0)}m²
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {apt.bedroomCount}BR / {apt.bathroomCount}BA
                  </span>
                </div>
                <Badge
                  variant={
                    apt.status === 'vacant' ? 'outline' :
                    apt.status === 'occupied' ? 'default' :
                    apt.status === 'maintenance' ? 'secondary' : 'outline'
                  }
                  className={
                    apt.status === 'vacant' ? 'text-green-600 border-green-300' :
                    apt.status === 'maintenance' ? 'text-yellow-600' : ''
                  }
                >
                  {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                </Badge>
              </button>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
