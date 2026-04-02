'use client';

import { useState, useMemo, useEffect } from 'react';
import { Check, ChevronsUpDown, Building2 } from 'lucide-react';
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

  // Debounce the apartment text filter (triggers re-filter, not new API call)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedAptSearch(aptSearch), 300);
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

  // Load apartments — server-side filtered by building when one is selected
  const { data: apartmentsData, isLoading: loadingApts } = useApartments({
    buildingId: selectedBuildingId,
    status: statusFilter,
    limit: 200,
  });
  const apartments = apartmentsData?.data ?? [];

  // Client-side apartment text filter (debounced)
  const filteredApts = useMemo(() => {
    if (!debouncedAptSearch.trim()) return apartments;
    const s = debouncedAptSearch.toLowerCase();
    return apartments.filter((a) =>
      a.unit_number.toLowerCase().includes(s),
    );
  }, [apartments, debouncedAptSearch]);

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
      <PopoverContent className="w-[420px] p-0" align="start">
        {/* ── Building filter ── */}
        <div className="border-b p-2">
          <Command className="border-none shadow-none">
            <CommandInput
              placeholder="Search buildings..."
              value={buildingSearch}
              onValueChange={setBuildingSearch}
            />
            <CommandList className="max-h-[110px]">
              <CommandEmpty>No buildings found.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="__all__"
                  onSelect={() => setSelectedBuildingId(undefined)}
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
        <Command>
          <CommandInput
            placeholder="Search unit number..."
            value={aptSearch}
            onValueChange={setAptSearch}
          />
          <CommandList>
            <CommandEmpty>
              {loadingApts ? 'Loading apartments…' : 'No apartments found.'}
            </CommandEmpty>
            <CommandGroup
              heading={selectedBuilding ? selectedBuilding.name : 'Apartments'}
            >
              {filteredApts.map((apt) => (
                <CommandItem
                  key={apt.id}
                  value={apt.id}
                  onSelect={() => {
                    onChange(apt.id);
                    setOpen(false);
                  }}
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
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
