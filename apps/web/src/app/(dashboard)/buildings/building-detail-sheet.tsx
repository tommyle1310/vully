'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Building as BuildingIcon,
  MapPin,
  Layers,
  Home,
  Edit,
  Calendar,
  Map,
} from 'lucide-react';
import { Building } from '@/hooks/use-buildings';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface BuildingDetailSheetProps {
  buildings: Building | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (buildings: Building) => void;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function BuildingDetailSheet({
  building,
  open,
  onOpenChange,
  onEdit,
}: BuildingDetailSheetProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  if (!building) return null;

  const handleViewFloorPlan = () => {
    router.push(`/buildings/${building.id}`);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle className="text-left flex items-center gap-2">
            <BuildingIcon className="h-5 w-5" />
            {building.name}
          </SheetTitle>
          <SheetDescription className="text-left">
            Building details and information
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-6 py-4"
          >
            {/* Status */}
            <div>
              <Badge variant={building.is_active ? 'success' : 'secondary'}>
                {building.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>

            {/* Location */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Location</h4>
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm">{building.address}</p>
                    <p className="text-sm text-muted-foreground">{building.city}</p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Building Info */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Building Information</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Floors</p>
                    <p className="text-sm text-muted-foreground">
                      {building.floorCount} floors
                    </p>
                  </div>
                </div>

                {building.apartmentCount !== undefined && (
                  <div className="flex items-center gap-3">
                    <Home className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Apartments</p>
                      <p className="text-sm text-muted-foreground">
                        {building.apartmentCount} total units
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Amenities */}
            {building.amenities && building.amenities.length > 0 && (
              <>
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Amenities</h4>
                  <div className="flex flex-wrap gap-2">
                    {building.amenities.map((amenity) => (
                      <Badge key={amenity} variant="secondary">
                        {amenity}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Timestamps */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Record Information</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>Created: {formatDate(building.created_at)}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>Updated: {formatDate(building.updatedAt)}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </ScrollArea>

        <div className="space-y-2 pt-4 border-t">
          {/* Primary Action - View Floor Plan */}
          <Button
            className="w-full"
            onClick={handleViewFloorPlan}
          >
            <Map className="h-4 w-4 mr-2" />
            View Floor Plan & Units
          </Button>
          
          {/* Secondary Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className={isAdmin ? 'flex-1' : 'w-full'}
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            {isAdmin && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onEdit(building)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
