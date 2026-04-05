import { UseFormReturn } from 'react-hook-form';
import Link from 'next/link';
import { Zap, Droplets, Flame, ExternalLink, Car, Info, ShieldCheck } from 'lucide-react';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ApartmentFormValues } from './apartment-form-schema';
import { Apartment, ApartmentParkingSlot } from '@/hooks/use-apartments';
import { UtilityType } from '@/hooks/use-billing';

interface UtilityTabProps {
  form: UseFormReturn<ApartmentFormValues>;
  isEditing: boolean;
  isResident: boolean;
  apartment?: Apartment | null;
  activeUtilityTypes: UtilityType[];
  utilityTypesLoading: boolean;
  parkingSlots: ApartmentParkingSlot[];
  onOpenParkingDialog: () => void;
}

export function ApartmentFormUtilityTab({
  form,
  isEditing,
  isResident,
  apartment,
  activeUtilityTypes,
  utilityTypesLoading,
  parkingSlots,
  onOpenParkingDialog,
}: UtilityTabProps) {
  return (
    <div className="space-y-4">
      {/* Available Utility Types */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold">Available Utility Types</h4>
          {!isResident && (
            <Link href="/utility-types">
              <Button variant="ghost" size="sm" className="h-7 text-xs">
                Manage
                <ExternalLink className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          )}
        </div>

        {utilityTypesLoading ? (
          <div className="flex gap-2">
            <div className="h-6 w-24 bg-muted animate-pulse rounded-md" />
            <div className="h-6 w-20 bg-muted animate-pulse rounded-md" />
            <div className="h-6 w-22 bg-muted animate-pulse rounded-md" />
          </div>
        ) : activeUtilityTypes.length === 0 ? (
          <Alert>
            <Zap className="h-4 w-4" />
            <AlertDescription>
              No utility types configured.{' '}
              <Link href="/utility-types" className="underline font-medium">
                Create utility types
              </Link>{' '}
              to enable meter tracking.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="flex flex-wrap gap-2">
            {activeUtilityTypes.map((ut) => {
              const Icon = ut.code === 'electric' ? Zap
                : ut.code === 'water' ? Droplets
                : ut.code === 'gas' ? Flame : Zap;
              return (
                <Badge key={ut.id} variant="secondary" className="flex items-center gap-1.5 py-1">
                  <Icon className="h-3 w-3" />
                  {ut.name} ({ut.unit})
                </Badge>
              );
            })}
          </div>
        )}
      </div>

      <Separator />
      <h4 className="text-sm font-semibold">Assigned Meters</h4>
      {isEditing && apartment ? (
        <div className="space-y-3">
          {(apartment.electricMeterId || apartment.waterMeterId || apartment.gasMeterId) ? (
            <div className="flex flex-wrap gap-2">
              {apartment.electricMeterId && (
                <Badge variant="outline" className="flex items-center gap-1.5 py-1.5 px-3">
                  <Zap className="h-3.5 w-3.5 text-yellow-500" />
                  <span className="text-xs text-muted-foreground">Electric:</span>
                  <code className="text-xs font-mono">{apartment.electricMeterId}</code>
                </Badge>
              )}
              {apartment.waterMeterId && (
                <Badge variant="outline" className="flex items-center gap-1.5 py-1.5 px-3">
                  <Droplets className="h-3.5 w-3.5 text-blue-500" />
                  <span className="text-xs text-muted-foreground">Water:</span>
                  <code className="text-xs font-mono">{apartment.waterMeterId}</code>
                </Badge>
              )}
              {apartment.gasMeterId && (
                <Badge variant="outline" className="flex items-center gap-1.5 py-1.5 px-3">
                  <Flame className="h-3.5 w-3.5 text-orange-500" />
                  <span className="text-xs text-muted-foreground">Gas:</span>
                  <code className="text-xs font-mono">{apartment.gasMeterId}</code>
                </Badge>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No meters assigned yet. Meter IDs are auto-generated when the first reading is recorded.
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Meter IDs will be auto-generated after the apartment is created.
        </p>
      )}

      <Separator />
      <h4 className="text-sm font-semibold">Infrastructure</h4>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="powerCapacity"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-2">
                <FormLabel>Circuit Breaker Rating (Amps)</FormLabel>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-xs">Maximum amperage for the unit&#39;s main circuit breaker</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <FormControl>
                <Input type="number" min={0} placeholder="32" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="acUnitCount"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-2">
                <FormLabel>AC Connection Points</FormLabel>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-xs">Number of pre-installed AC connection points in this unit</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <FormControl>
                <Input type="number" min={0} placeholder="3" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <Separator />
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-red-500" />
        <h4 className="text-sm font-semibold">Safety Equipment (PCCC Compliance)</h4>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="fireDetectorId"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-2">
                <FormLabel>Fire Detector ID</FormLabel>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-xs">Required per Vietnamese fire safety regulations (Nghị định 136/2020/NĐ-CP)</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <FormControl>
                <Input placeholder="FD-1205" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="sprinklerCount"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-2">
                <FormLabel>Sprinkler Count</FormLabel>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-xs">Number of fire sprinklers installed in this unit</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <FormControl>
                <Input type="number" min={0} placeholder="2" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="internetTerminalLoc"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Internet Terminal Location</FormLabel>
              <FormControl>
                <Input placeholder="Living room wall" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <Separator />
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Parking Slots</h4>
        {isEditing && apartment && (
          <Button type="button" variant="outline" size="sm" onClick={onOpenParkingDialog}>
            <Car className="mr-2 h-4 w-4" />
            Manage Parking
          </Button>
        )}
      </div>
      {isEditing && parkingSlots.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {parkingSlots.map((slot) => (
            <Badge key={slot.id} variant="outline" className="py-1.5 px-3">
              <Car className="mr-1.5 h-3.5 w-3.5" />
              {slot.fullCode}
              <span className="ml-1.5 text-xs text-muted-foreground">
                ({new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', notation: 'compact' }).format(slot.monthlyFee)}/mo)
              </span>
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {isEditing ? 'No parking slots assigned. Click "Manage Parking" to assign slots.' : 'Parking can be assigned after the apartment is created.'}
        </p>
      )}

      <h4 className="text-sm font-semibold mt-4">Other Assets</h4>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="mailboxNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mailbox Number</FormLabel>
              <FormControl>
                <Input placeholder="MB-1205" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="storageUnitId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Storage Unit</FormLabel>
              <FormControl>
                <Input placeholder="SU-023" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
