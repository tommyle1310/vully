'use client';

import { useBuildings } from '@/hooks/use-buildings';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Filter, Building, Home, Bed, Layers, Ruler } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface ApartmentFilterValues {
  buildingId: string | null;
  status: string[];
  unitType: string[];
  minBedrooms: number | null;
  maxBedrooms: number | null;
  minFloor: number | null;
  maxFloor: number | null;
  minArea: number | null;
  maxArea: number | null;
}

interface ApartmentFiltersProps {
  filters: ApartmentFilterValues;
  onFiltersChange: (filters: ApartmentFilterValues) => void;
}

const STATUS_OPTIONS = [
  { value: 'vacant', label: 'Vacant', color: 'bg-green-500' },
  { value: 'occupied', label: 'Occupied', color: 'bg-blue-500' },
  { value: 'maintenance', label: 'Maintenance', color: 'bg-amber-500' },
  { value: 'reserved', label: 'Reserved', color: 'bg-violet-500' },
];

const UNIT_TYPE_OPTIONS = [
  { value: 'studio', label: 'Studio' },
  { value: 'one_bedroom', label: '1 Bedroom' },
  { value: 'two_bedroom', label: '2 Bedrooms' },
  { value: 'three_bedroom', label: '3+ Bedrooms' },
  { value: 'duplex', label: 'Duplex' },
  { value: 'penthouse', label: 'Penthouse' },
];

const BEDROOM_OPTIONS = [
  { value: 0, label: 'Studio' },
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4+' },
];

export function ApartmentFilters({ filters, onFiltersChange }: ApartmentFiltersProps) {
  const { data: buildingsData } = useBuildings({ limit: 100 });
  const buildings = buildingsData?.data || [];

  const activeFilterCount = [
    filters.buildingId,
    filters.status.length > 0,
    filters.unitType.length > 0,
    filters.minBedrooms !== null || filters.maxBedrooms !== null,
    filters.minFloor !== null || filters.maxFloor !== null,
    filters.minArea !== null || filters.maxArea !== null,
  ].filter(Boolean).length;

  const handleStatusToggle = (status: string) => {
    const newStatus = filters.status.includes(status)
      ? filters.status.filter((s) => s !== status)
      : [...filters.status, status];
    onFiltersChange({ ...filters, status: newStatus });
  };

  const handleUnitTypeToggle = (unitType: string) => {
    const newTypes = filters.unitType.includes(unitType)
      ? filters.unitType.filter((t) => t !== unitType)
      : [...filters.unitType, unitType];
    onFiltersChange({ ...filters, unitType: newTypes });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      buildingId: null,
      status: [],
      unitType: [],
      minBedrooms: null,
      maxBedrooms: null,
      minFloor: null,
      maxFloor: null,
      minArea: null,
      maxArea: null,
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Building Filter */}
      <Select
        value={filters.buildingId || 'all'}
        onValueChange={(value) =>
          onFiltersChange({ ...filters, buildingId: value === 'all' ? null : value })
        }
      >
        <SelectTrigger className="w-[180px]">
          <Building className="h-4 w-4 mr-2 text-muted-foreground" />
          <SelectValue placeholder="All Buildings" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Buildings</SelectItem>
          {buildings.map((building) => (
            <SelectItem key={building.id} value={building.id}>
              {building.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status Multi-Select */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-10">
            <Home className="h-4 w-4 mr-2 text-muted-foreground" />
            Status
            {filters.status.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {filters.status.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56" align="start">
          <div className="space-y-2">
            {STATUS_OPTIONS.map((option) => (
              <div key={option.value} className="flex items-center gap-2">
                <Checkbox
                  id={`status-${option.value}`}
                  checked={filters.status.includes(option.value)}
                  onCheckedChange={() => handleStatusToggle(option.value)}
                />
                <Label
                  htmlFor={`status-${option.value}`}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <div className={cn('w-3 h-3 rounded', option.color)} />
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Unit Type Multi-Select */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-10">
            <Layers className="h-4 w-4 mr-2 text-muted-foreground" />
            Unit Type
            {filters.unitType.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {filters.unitType.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56" align="start">
          <div className="space-y-2">
            {UNIT_TYPE_OPTIONS.map((option) => (
              <div key={option.value} className="flex items-center gap-2">
                <Checkbox
                  id={`type-${option.value}`}
                  checked={filters.unitType.includes(option.value)}
                  onCheckedChange={() => handleUnitTypeToggle(option.value)}
                />
                <Label
                  htmlFor={`type-${option.value}`}
                  className="text-sm cursor-pointer"
                >
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Bedrooms Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-10">
            <Bed className="h-4 w-4 mr-2 text-muted-foreground" />
            Bedrooms
            {(filters.minBedrooms !== null || filters.maxBedrooms !== null) && (
              <Badge variant="secondary" className="ml-2">
                {filters.minBedrooms ?? '0'}-{filters.maxBedrooms ?? '4+'}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56" align="start">
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Min Bedrooms</Label>
              <div className="flex gap-1 mt-1">
                {BEDROOM_OPTIONS.map((opt) => (
                  <Button
                    key={`min-${opt.value}`}
                    variant={filters.minBedrooms === opt.value ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 w-10"
                    onClick={() =>
                      onFiltersChange({
                        ...filters,
                        minBedrooms: filters.minBedrooms === opt.value ? null : opt.value,
                      })
                    }
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Max Bedrooms</Label>
              <div className="flex gap-1 mt-1">
                {BEDROOM_OPTIONS.map((opt) => (
                  <Button
                    key={`max-${opt.value}`}
                    variant={filters.maxBedrooms === opt.value ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 w-10"
                    onClick={() =>
                      onFiltersChange({
                        ...filters,
                        maxBedrooms: filters.maxBedrooms === opt.value ? null : opt.value,
                      })
                    }
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Area Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-10">
            <Ruler className="h-4 w-4 mr-2 text-muted-foreground" />
            Area (m²)
            {(filters.minArea !== null || filters.maxArea !== null) && (
              <Badge variant="secondary" className="ml-2">
                {filters.minArea ?? '0'}-{filters.maxArea ?? '∞'}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="start">
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Min Area (m²)</Label>
              <Input
                type="number"
                placeholder="0"
                value={filters.minArea ?? ''}
                onChange={(e) => {
                  const val = e.target.value ? parseFloat(e.target.value) : null;
                  onFiltersChange({ ...filters, minArea: val });
                }}
                className="mt-1 h-8"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Max Area (m²)</Label>
              <Input
                type="number"
                placeholder="No limit"
                value={filters.maxArea ?? ''}
                onChange={(e) => {
                  const val = e.target.value ? parseFloat(e.target.value) : null;
                  onFiltersChange({ ...filters, maxArea: val });
                }}
                className="mt-1 h-8"
              />
            </div>
            {(filters.minArea !== null || filters.maxArea !== null) && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => onFiltersChange({ ...filters, minArea: null, maxArea: null })}
              >
                Clear Area Filter
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Active filter badges */}
      {filters.status.length > 0 && (
        <div className="flex gap-1">
          {filters.status.map((status) => (
            <Badge key={status} variant="secondary" className="gap-1">
              {STATUS_OPTIONS.find((o) => o.value === status)?.label || status}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleStatusToggle(status)}
              />
            </Badge>
          ))}
        </div>
      )}

      {/* Clear Filters */}
      {activeFilterCount > 0 && (
        <Button variant="ghost" size="sm" onClick={handleClearFilters}>
          <X className="h-4 w-4 mr-1" />
          Clear ({activeFilterCount})
        </Button>
      )}
    </div>
  );
}
