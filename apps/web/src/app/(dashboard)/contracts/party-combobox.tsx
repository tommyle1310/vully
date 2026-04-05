import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Check, ChevronsUpDown, UserPlus } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
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
import { User, UsersResponse } from './contract-form-schema';
import { QuickCreateResident } from './quick-create-resident';

interface PartyComboboxProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  partyLabel: string;
}

export function PartyCombobox({ value, onChange, disabled, partyLabel }: PartyComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showQuickCreate, setShowQuickCreate] = useState(false);

  const { data: usersData, isLoading, error, isError } = useQuery<UsersResponse>({
    queryKey: ['users', 'all'],
    queryFn: () => apiClient.get<UsersResponse>('/users?limit=500'),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  if (isError) {
    console.error('[PartyCombobox] Failed to fetch users:', error);
  }

  const users = usersData?.data || [];

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const searchLower = search.toLowerCase();
    return users.filter(
      (u) =>
        u.firstName.toLowerCase().includes(searchLower) ||
        u.lastName.toLowerCase().includes(searchLower) ||
        u.email.toLowerCase().includes(searchLower),
    );
  }, [users, search]);

  const selectedUser = useMemo(
    () => users.find((u) => u.id === value),
    [users, value],
  );

  const handleCreated = useCallback(
    (user: User) => {
      onChange(user.id);
      setShowQuickCreate(false);
      setOpen(false);
    },
    [onChange],
  );

  if (showQuickCreate) {
    return (
      <QuickCreateResident
        onCreated={handleCreated}
        onCancel={() => setShowQuickCreate(false)}
      />
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
          disabled={disabled}
        >
          {selectedUser ? (
            <span className="truncate">
              {selectedUser.firstName} {selectedUser.lastName}
              <span className="text-muted-foreground ml-2">
                ({selectedUser.email})
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground">
              Search or select {partyLabel.toLowerCase()}...
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start" side="bottom" sideOffset={4}>
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={`Search by name or email...`}
            value={search}
            onValueChange={setSearch}
          />
          <div className="border-b px-2 py-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                setShowQuickCreate(true);
                setOpen(false);
              }}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Create New Resident
            </Button>
          </div>
          <CommandList className="max-h-[300px] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : isError ? (
              <div className="text-center py-4 px-2">
                <p className="text-sm text-destructive">
                  Failed to load users
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {error instanceof Error ? error.message : 'Please try again'}
                </p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <CommandEmpty>
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">
                    {users.length === 0
                      ? 'No users in system. Create one above.'
                      : 'No users found matching your search'}
                  </p>
                </div>
              </CommandEmpty>
            ) : (
              <CommandGroup heading="Select existing user">
                {filteredUsers.slice(0, 50).map((user) => (
                  <CommandItem
                    key={user.id}
                    value={user.id}
                    onSelect={() => {
                      onChange(user.id);
                      setOpen(false);
                    }}
                    className="flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex flex-col">
                      <span>
                        {user.firstName} {user.lastName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {user.email}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {user.roles.map((role) => (
                        <Badge
                          key={role}
                          variant="secondary"
                          className="text-xs"
                        >
                          {role}
                        </Badge>
                      ))}
                      {value === user.id && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  </CommandItem>
                ))}
                {filteredUsers.length > 50 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Showing first 50 results. Refine your search.
                  </p>
                )}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
