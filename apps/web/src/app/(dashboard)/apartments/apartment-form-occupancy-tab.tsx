import { UseFormReturn } from 'react-hook-form';
import { format, parseISO } from 'date-fns';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/date-picker';
import { ApartmentFormValues } from './apartment-form-schema';
import { ApartmentEffectiveConfig } from '@/hooks/use-apartments';

interface OccupancyTabProps {
  form: UseFormReturn<ApartmentFormValues>;
  isEditing: boolean;
  effectiveConfig?: ApartmentEffectiveConfig;
}

function SourceBadge({ source }: { source: 'apartment' | 'building' | 'default' }) {
  const classes = source === 'apartment'
    ? 'bg-blue-100 text-blue-700'
    : source === 'building'
    ? 'bg-green-100 text-green-700'
    : 'bg-gray-100 text-gray-600';
  const label = source === 'apartment' ? 'Overridden' : source === 'building' ? 'From policy' : 'Default';
  return (
    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 font-normal ${classes}`}>
      {label}
    </Badge>
  );
}

export function ApartmentFormOccupancyTab({
  form,
  isEditing,
  effectiveConfig,
}: OccupancyTabProps) {
  return (
    <div className="space-y-4">
      {/* Ownership & Legal */}
      <h4 className="text-sm font-semibold">Ownership & Legal</h4>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="ownershipType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ownership Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ''}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="permanent">Permanent</SelectItem>
                  <SelectItem value="fifty_year">50-Year</SelectItem>
                  <SelectItem value="leasehold">Leasehold</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>Type of ownership rights</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="vatRate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>VAT Rate (%)</FormLabel>
              <FormControl>
                <Input type="number" step="0.1" min={0} max={100} placeholder="10" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormDescription>Standard rate is 10%</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="handoverDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Handover Date</FormLabel>
              <FormControl>
                <DatePicker
                  value={field.value ? parseISO(field.value) : undefined}
                  onChange={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                  placeholder="Select date"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="warrantyExpiryDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Warranty Expiry</FormLabel>
              <FormControl>
                <DatePicker
                  value={field.value ? parseISO(field.value) : undefined}
                  onChange={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                  placeholder="Select date"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="isRented"
        render={({ field }) => (
          <FormItem className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <FormLabel>Currently Rented</FormLabel>
              <FormDescription>This unit is being rented out</FormDescription>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />

      <Separator />

      {/* Residents */}
      <h4 className="text-sm font-semibold">Residents</h4>

      {/* Max Residents with override */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">Max Residents</Label>
              {effectiveConfig && <SourceBadge source={effectiveConfig.maxResidents.source} />}
            </div>
            {isEditing && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Override</span>
                <Switch
                  checked={form.watch('maxResidentsOverride')}
                  onCheckedChange={(checked) => {
                    form.setValue('maxResidentsOverride', checked);
                    if (!checked) form.setValue('maxResidents', undefined);
                  }}
                  className="scale-75"
                />
              </div>
            )}
          </div>
          <FormField
            control={form.control}
            name="maxResidents"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    placeholder={String(effectiveConfig?.maxResidents.value ?? 6)}
                    {...field}
                    value={field.value ?? ''}
                    disabled={isEditing && !form.watch('maxResidentsOverride')}
                  />
                </FormControl>
                {isEditing && !form.watch('maxResidentsOverride') && effectiveConfig && (
                  <FormDescription>Using policy value: {effectiveConfig.maxResidents.value}</FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="currentResidentCount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Current Residents</FormLabel>
              <FormControl>
                <Input type="number" min={0} {...field} disabled />
              </FormControl>
              <FormDescription>Synced from contract</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Access Card Limit with override */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">Access Card Limit</Label>
              {effectiveConfig && <SourceBadge source={effectiveConfig.accessCardLimit.source} />}
            </div>
            {isEditing && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Override</span>
                <Switch
                  checked={form.watch('accessCardLimitOverride')}
                  onCheckedChange={(checked) => {
                    form.setValue('accessCardLimitOverride', checked);
                    if (!checked) form.setValue('accessCardLimit', undefined);
                  }}
                  className="scale-75"
                />
              </div>
            )}
          </div>
          <FormField
            control={form.control}
            name="accessCardLimit"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    placeholder={String(effectiveConfig?.accessCardLimit.value ?? 4)}
                    {...field}
                    value={field.value ?? ''}
                    disabled={isEditing && !form.watch('accessCardLimitOverride')}
                  />
                </FormControl>
                {isEditing && !form.watch('accessCardLimitOverride') && effectiveConfig && (
                  <FormDescription>Using policy value: {effectiveConfig.accessCardLimit.value}</FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="intercomCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Intercom Code</FormLabel>
              <FormControl>
                <Input placeholder="Typically matches unit number" {...field} />
              </FormControl>
              <FormDescription>Typically matches unit number</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Pets Allowed with override */}
      <div className="space-y-2">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="flex items-center gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Pets Allowed</Label>
                {effectiveConfig && <SourceBadge source={effectiveConfig.petAllowed.source} />}
              </div>
              {isEditing && !form.watch('petAllowedOverride') && effectiveConfig && (
                <p className="text-xs text-muted-foreground">
                  Policy: {effectiveConfig.petAllowed.value ? 'Yes' : 'No'}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isEditing && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Override</span>
                <Switch
                  checked={form.watch('petAllowedOverride')}
                  onCheckedChange={(checked) => {
                    form.setValue('petAllowedOverride', checked);
                    if (!checked) form.setValue('petAllowed', effectiveConfig?.petAllowed.value ?? false);
                  }}
                  className="scale-75"
                />
              </div>
            )}
            <FormField
              control={form.control}
              name="petAllowed"
              render={({ field }) => (
                <FormItem className="flex items-center m-0">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isEditing && !form.watch('petAllowedOverride')}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>
      </div>

      {(form.watch('petAllowed') || effectiveConfig?.petAllowed.value) && (
        <FormField
          control={form.control}
          name="petLimit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Pet Limit</FormLabel>
              <FormControl>
                <Input type="number" min={0} placeholder="2" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  );
}
