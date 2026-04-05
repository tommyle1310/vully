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
import { Textarea } from '@/components/ui/textarea';
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

interface BillingTabProps {
  form: UseFormReturn<ApartmentFormValues>;
  isEditing: boolean;
  effectiveConfig: ApartmentEffectiveConfig | null | undefined;
}

export function ApartmentFormBillingTab({
  form,
  isEditing,
  effectiveConfig,
}: BillingTabProps) {
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold">Billing Configuration</h4>

      {/* Billing Cycle with policy inheritance */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">Billing Cycle</Label>
              {effectiveConfig && (
                <Badge
                  variant="outline"
                  className={`text-[10px] px-1.5 py-0 h-5 font-normal ${
                    effectiveConfig.billingCycle.source === 'apartment'
                      ? 'bg-blue-100 text-blue-700'
                      : effectiveConfig.billingCycle.source === 'building'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {effectiveConfig.billingCycle.source === 'apartment'
                    ? 'Overridden'
                    : effectiveConfig.billingCycle.source === 'building'
                    ? 'From policy'
                    : 'Default'}
                </Badge>
              )}
            </div>
            {isEditing && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Override</span>
                <Switch
                  checked={form.watch('billingCycleOverride')}
                  onCheckedChange={(checked) => {
                    form.setValue('billingCycleOverride', checked);
                    if (!checked) {
                      form.setValue('billingCycle', undefined);
                    }
                  }}
                  className="scale-75"
                />
              </div>
            )}
          </div>
          <FormField
            control={form.control}
            name="billingCycle"
            render={({ field }) => (
              <FormItem>
                <Select
                  onValueChange={field.onChange}
                  value={field.value || effectiveConfig?.billingCycle.value || 'monthly'}
                  disabled={isEditing && !form.watch('billingCycleOverride')}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
                {isEditing && !form.watch('billingCycleOverride') && effectiveConfig && (
                  <FormDescription>
                    Using policy value: {effectiveConfig.billingCycle.value}
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="billingStartDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Billing Start Date</FormLabel>
              <FormControl>
                <DatePicker
                  value={field.value ? parseISO(field.value) : undefined}
                  onChange={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                  placeholder="Select date"
                />
              </FormControl>
              <FormDescription>Date from which invoices will be generated</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="bankAccountVirtual"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Virtual Bank Account</FormLabel>
            <FormControl>
              <Input placeholder="For payment matching" {...field} disabled />
            </FormControl>
            <FormDescription>System-generated for automated payment matching</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="lateFeeWaived"
        render={({ field }) => (
          <FormItem className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <FormLabel>Waive Late Fees</FormLabel>
              <FormDescription>Exempt this unit from late payment penalties</FormDescription>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />

      <Separator />
      <h4 className="text-sm font-semibold">System</h4>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="syncStatus"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sync Status</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || 'disconnected'} disabled>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="synced">Synced</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="disconnected">Disconnected</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="portalAccessEnabled"
        render={({ field }) => (
          <FormItem className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <FormLabel>Portal Access</FormLabel>
              <FormDescription>Allow residents to access the web portal</FormDescription>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="isMerged"
        render={({ field }) => (
          <FormItem className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <FormLabel>Merged Unit</FormLabel>
              <FormDescription>This unit has been merged with another</FormDescription>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="notesAdmin"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Admin Notes</FormLabel>
            <FormControl>
              <Textarea placeholder="Private notes for administrators..." rows={3} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
