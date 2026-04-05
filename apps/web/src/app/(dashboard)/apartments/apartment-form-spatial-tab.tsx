import { UseFormReturn } from 'react-hook-form';
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
import {
  ApartmentFormValues,
  UNIT_TYPES,
  UNIT_TYPE_LABELS,
  ORIENTATIONS,
  ORIENTATION_LABELS,
} from './apartment-form-schema';
import { Building } from '@/hooks/use-apartments';

interface SpatialTabProps {
  form: UseFormReturn<ApartmentFormValues>;
  isEditing: boolean;
  buildings: Building[];
  buildingsLoading: boolean;
}

export function ApartmentFormSpatialTab({
  form,
  isEditing,
  buildings,
  buildingsLoading,
}: SpatialTabProps) {
  return (
    <div className="space-y-4">
      {/* Building Selection */}
      <FormField
        control={form.control}
        name="buildingId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Building</FormLabel>
            <Select
              onValueChange={field.onChange}
              value={field.value}
              disabled={isEditing || buildingsLoading || buildings.length === 0}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder={buildings.length === 0 ? "No buildings available" : "Select a building"} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {buildings.map((building) => (
                  <SelectItem key={building.id} value={building.id}>
                    {building.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isEditing && <FormDescription>Managed by building module</FormDescription>}
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Unit Number & Floor */}
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="unit_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unit Number</FormLabel>
              <FormControl>
                <Input placeholder="e.g., A-1201" {...field} disabled={isEditing} />
              </FormControl>
              {isEditing && <FormDescription>Managed by building module</FormDescription>}
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="floorIndex"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Floor Index</FormLabel>
              <FormControl>
                <Input type="number" min={0} {...field} disabled={isEditing} />
              </FormControl>
              {isEditing && <FormDescription>Managed by building module</FormDescription>}
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Apartment Code & Floor Label */}
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="apartmentCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Apartment Code</FormLabel>
              <FormControl>
                <Input placeholder="e.g., A-12.05" {...field} disabled={isEditing} />
              </FormControl>
              {isEditing && <FormDescription>Managed by building module</FormDescription>}
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="floorLabel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Floor Label</FormLabel>
              <FormControl>
                <Input placeholder="e.g., 12A" {...field} disabled={isEditing} />
              </FormControl>
              {isEditing && <FormDescription>Managed by building module</FormDescription>}
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Unit Type & Status */}
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="unitType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unit Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ''} disabled={isEditing}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {UNIT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{UNIT_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isEditing && <FormDescription>Managed by building module</FormDescription>}
              <FormMessage />
            </FormItem>
          )}
        />
        {isEditing && (
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="vacant">Vacant</SelectItem>
                    <SelectItem value="occupied">Occupied</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="reserved">Reserved</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>

      {/* Areas */}
      <div className="grid grid-cols-3 gap-4">
        <FormField
          control={form.control}
          name="grossArea"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Gross Area (m²)</FormLabel>
              <FormControl>
                <Input type="number" step="0.1" placeholder="75.5" {...field} value={field.value ?? ''} disabled={isEditing} />
              </FormControl>
              {isEditing && <FormDescription>From SVG</FormDescription>}
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="netArea"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Net Area (m²)</FormLabel>
              <FormControl>
                <Input type="number" step="0.1" placeholder="65.5" {...field} value={field.value ?? ''} disabled={isEditing} />
              </FormControl>
              {isEditing && <FormDescription>From SVG</FormDescription>}
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="ceilingHeight"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ceiling (m)</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" placeholder="2.85" {...field} value={field.value ?? ''} disabled={isEditing} />
              </FormControl>
              {isEditing && <FormDescription>Building default</FormDescription>}
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Bedrooms & Bathrooms */}
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="bedroomCount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bedrooms</FormLabel>
              <FormControl>
                <Input type="number" min={0} {...field} disabled={isEditing} />
              </FormControl>
              {isEditing && <FormDescription>Managed by building</FormDescription>}
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="bathroomCount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bathrooms</FormLabel>
              <FormControl>
                <Input type="number" min={0} {...field} disabled={isEditing} />
              </FormControl>
              {isEditing && <FormDescription>Managed by building</FormDescription>}
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Orientation & Balcony */}
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="orientation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Orientation</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ''} disabled={isEditing}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select direction" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {ORIENTATIONS.map((o) => (
                    <SelectItem key={o} value={o}>{ORIENTATION_LABELS[o]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isEditing && <FormDescription>Managed by building</FormDescription>}
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="balconyDirection"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Balcony Direction</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ''} disabled={isEditing}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select direction" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {ORIENTATIONS.map((o) => (
                    <SelectItem key={o} value={o}>{ORIENTATION_LABELS[o]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isEditing && <FormDescription>Managed by building</FormDescription>}
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Corner unit */}
      <FormField
        control={form.control}
        name="isCornerUnit"
        render={({ field }) => (
          <FormItem className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <FormLabel>Corner Unit</FormLabel>
              <FormDescription>{isEditing ? 'Managed by building module' : 'This unit is at a corner position'}</FormDescription>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isEditing} />
            </FormControl>
          </FormItem>
        )}
      />
    </div>
  );
}
