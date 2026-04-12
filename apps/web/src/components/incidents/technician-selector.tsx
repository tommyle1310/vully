'use client';

import { useState } from 'react';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useTechnicians, TechnicianListItem } from '@/hooks/use-technicians';

interface TechnicianSelectorProps {
  value?: string;
  onChange: (technicianId: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function getAvailabilityColor(status?: string): string {
  switch (status) {
    case 'available':
      return 'bg-green-500';
    case 'busy':
      return 'bg-yellow-500';
    case 'off_duty':
      return 'bg-gray-400';
    default:
      return 'bg-green-500';
  }
}

export function TechnicianSelector({
  value,
  onChange,
  disabled = false,
  placeholder = 'Select technician...',
  className,
}: TechnicianSelectorProps) {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useTechnicians();

  const technicians = data?.data ?? [];
  const selected = technicians.find((t) => t.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn('w-full justify-between', className)}
        >
          {selected ? (
            <span className="flex items-center gap-2 truncate">
              <span
                className={cn(
                  'h-2 w-2 rounded-full',
                  getAvailabilityColor(selected.profileData.availabilityStatus),
                )}
              />
              {selected.firstName} {selected.lastName}
              <span className="text-muted-foreground text-xs">
                ({selected.workload.total} active)
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search technician..." />
          <CommandList>
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : (
              <>
                <CommandEmpty>No technician found.</CommandEmpty>
                <CommandGroup>
                  {technicians.map((tech) => (
                    <TechnicianOption
                      key={tech.id}
                      technician={tech}
                      isSelected={tech.id === value}
                      onSelect={() => {
                        onChange(tech.id);
                        setOpen(false);
                      }}
                    />
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function TechnicianOption({
  technician,
  isSelected,
  onSelect,
}: {
  technician: TechnicianListItem;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { firstName, lastName, profileData, workload } = technician;
  const availabilityStatus = profileData.availabilityStatus || 'available';

  return (
    <CommandItem value={`${firstName} ${lastName}`} onSelect={onSelect}>
      <Check
        className={cn('mr-2 h-4 w-4', isSelected ? 'opacity-100' : 'opacity-0')}
      />
      <Avatar className="mr-2 h-7 w-7">
        <AvatarImage src={profileData.avatarUrl} alt={`${firstName} ${lastName}`} />
        <AvatarFallback className="text-xs">
          {getInitials(firstName, lastName)}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-1 items-center justify-between">
        <div className="flex flex-col">
          <span className="text-sm font-medium">
            {firstName} {lastName}
          </span>
          {profileData.specialties && profileData.specialties.length > 0 && (
            <span className="text-muted-foreground text-xs">
              {profileData.specialties.slice(0, 2).join(', ')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={availabilityStatus === 'available' ? 'default' : 'secondary'}
            className="text-xs"
          >
            {workload.total}
          </Badge>
          <span
            className={cn(
              'h-2 w-2 rounded-full',
              getAvailabilityColor(availabilityStatus),
            )}
          />
        </div>
      </div>
    </CommandItem>
  );
}
