'use client';

import { useState, useMemo, useEffect } from 'react';
import { Check, ChevronsUpDown, Building2, Loader2 } from 'lucide-react';
import { useBuildings } from '@/hooks/use-buildings';
import { useApartments } from '@/hooks/use-apartments';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ApartmentComboboxProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Only show apartments with this status (e.g. 'vacant') */
  statusFilter?: string;
  /** Label shown when the combobox is disabled (edit mode) */
  existingApartmentLabel?: string;
}

export function ApartmentCombobox({
  value,
  onChange,
  disabled,
  statusFilter,
  existingApartmentLabel,
}: ApartmentComboboxProps) {
  const [open, setOpen] = useState(false);
  const [buildingSearch, setBuildingSearch] = useState('');
  const [aptSearch, setAptSearch] = useState('');
  const [debouncedAptSearch, setDebouncedAptSearch] = useState('');
  const [selectedBuildingId, setSelectedBuildingId] = useState<
    string | undefined
  >(undefined);

  // Debounce the apartment search for server-side query (500ms for API calls)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedAptSearch(aptSearch), 500);
    return () => clearTimeout(timer);
  }, [aptSearch]);

  // Load all buildings for the filter header
  const { data: buildingsData } = useBuildings({ limit: 200 });
  const allBuildings = buildingsData?.data ?? [];

  // Client-side building search
  const filteredBuildings = useMemo(() => {
    if (!buildingSearch.trim()) return allBuildings;
    const s = buildingSearch.toLowerCase();
    return allBuildings.filter(
      (b) =>
        b.name.toLowerCase().includes(s) || b.city.toLowerCase().includes(s),
    );
  }, [allBuildings, buildingSearch]);

  // Load apartments with server-side search (debounced)
  const { data: apartmentsData, isLoading: loadingApts, isFetching } = useApartments({
    buildingId: selectedBuildingId,
    status: statusFilter,
    search: debouncedAptSearch || undefined, // Server-side search
    limit: 100,
  });
  const apartments = apartmentsData?.data ?? [];

  // Show searching indicator when input differs from debounced value
  const isSearching = aptSearch !== debouncedAptSearch || isFetching;

  // Resolve display label for the trigger button
  const selectedApt = useMemo(
    () => apartments.find((a) => a.id === value),
    [apartments, value],
  );

  const displayLabel =
    existingApartmentLabel ||
    (selectedApt
      ? `${selectedApt.unit_number}${selectedApt.building?.name ? ` — ${selectedApt.building.name}` : ''}`
      : '');

  const selectedBuilding = allBuildings.find((b) => b.id === selectedBuildingId);

  if (disabled) {
    return (
      <Button
        variant="outline"
        disabled
        className="w-full justify-start font-normal"
      >
        {displayLabel || 'Select apartment'}
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">
            {displayLabel || 'Select apartment...'}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-0" align="start" side="bottom" sideOffset={4}>
        {/* ── Building filter ── */}
        <div className="border-b p-2">
          <Command className="border-none shadow-none">
            <CommandInput
              placeholder="Search buildings..."
              value={buildingSearch}
              onValueChange={setBuildingSearch}
            />
            <CommandList className="max-h-[120px] overflow-y-auto">
              <CommandEmpty>No buildings found.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="__all__"
                  onSelect={() => setSelectedBuildingId(undefined)}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      !selectedBuildingId ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <span className="text-sm">All Buildings</span>
                </CommandItem>
                {filteredBuildings.map((b) => (
                  <CommandItem
                    key={b.id}
                    value={b.id}
                    onSelect={() => setSelectedBuildingId(b.id)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        selectedBuildingId === b.id
                          ? 'opacity-100'
                          : 'opacity-0',
                      )}
                    />
                    <Building2 className="mr-2 h-3 w-3 text-muted-foreground" />
                    <span className="text-sm">{b.name}</span>
                    <Badge variant="outline" className="ml-auto text-xs">
                      {b.city}
                    </Badge>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>

        {/* ── Apartment list ── */}
        <Command shouldFilter={false}>
          <div className="relative">
            <CommandInput
              placeholder="Search unit number..."
              value={aptSearch}
              onValueChange={setAptSearch}
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
          <CommandList className="max-h-[280px] overflow-y-auto">
            {loadingApts ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : apartments.length === 0 ? (
              <CommandEmpty>
                {debouncedAptSearch 
                  ? `No apartments found for "${debouncedAptSearch}"`
                  : 'No apartments found.'}
              </CommandEmpty>
            ) : (
              <CommandGroup
                heading={selectedBuilding ? selectedBuilding.name : 'Apartments'}
              >
                {apartments.map((apt) => (
                  <CommandItem
                    key={apt.id}
                    value={apt.id}
                    onSelect={() => {
                      onChange(apt.id);
                      setOpen(false);
                    }}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === apt.id ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    <span className="font-medium">{apt.unit_number}</span>
                    {apt.building?.name && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        — {apt.building.name}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
