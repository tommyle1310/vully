'use client';

import { Filter, RotateCcw, Layers } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useMapStore } from '@/stores/mapStore';

interface MapControlsProps {
  floorCount: number;
  apartmentCounts: {
    total: number;
    vacant: number;
    occupied: number;
    maintenance: number;
    reserved: number;
  };
}

export function MapControls({ floorCount, apartmentCounts }: MapControlsProps) {
  const { filters, setFilters, resetView } = useMapStore();

  const handleStatusToggle = (status: string) => {
    const currentStatuses = filters.status;
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter((s) => s !== status)
      : [...currentStatuses, status];
    
    setFilters({ status: newStatuses });
  };

  const handleFloorChange = (value: string) => {
    setFilters({ floor: value === 'all' ? null : parseInt(value) });
  };

  const handleReset = () => {
    setFilters({ status: [], floor: null });
    resetView();
  };

  const activeFiltersCount = filters.status.length + (filters.floor !== null ? 1 : 0);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-medium">Filters</h3>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {activeFiltersCount}
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          disabled={activeFiltersCount === 0}
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          Reset
        </Button>
      </div>

      <div className="space-y-4">
        {/* Status Filter */}
        <div>
          <Label className="text-sm mb-2 block">Status</Label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleStatusToggle('vacant')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                filters.status.includes('vacant')
                  ? 'bg-green-600 text-white'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              Vacant ({apartmentCounts.vacant})
            </button>
            <button
              onClick={() => handleStatusToggle('occupied')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                filters.status.includes('occupied')
                  ? 'bg-blue-600 text-white'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              Occupied ({apartmentCounts.occupied})
            </button>
            <button
              onClick={() => handleStatusToggle('maintenance')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                filters.status.includes('maintenance')
                  ? 'bg-yellow-600 text-white'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              Maintenance ({apartmentCounts.maintenance})
            </button>
            <button
              onClick={() => handleStatusToggle('reserved')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                filters.status.includes('reserved')
                  ? 'bg-purple-600 text-white'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              Reserved ({apartmentCounts.reserved})
            </button>
          </div>
        </div>

        {/* Floor Filter */}
        <div>
          <Label className="text-sm mb-2 flex items-center gap-2">
            <Layers className="h-3 w-3" />
            Floor
          </Label>
          <Select
            value={filters.floor === null ? 'all' : String(filters.floor)}
            onValueChange={handleFloorChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Floors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Floors</SelectItem>
              {Array.from({ length: floorCount }, (_, i) => i + 1).map((floor) => (
                <SelectItem key={floor} value={String(floor)}>
                  Floor {floor}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Summary */}
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            Showing {apartmentCounts.total} apartments
          </p>
        </div>
      </div>
    </Card>
  );
}
