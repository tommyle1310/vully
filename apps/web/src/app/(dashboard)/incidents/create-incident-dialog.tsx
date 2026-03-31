'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useCreateIncident, CreateIncidentData } from '@/hooks/use-incidents';
import { useApartments } from '@/hooks/use-apartments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';

// Create incident dialog component
interface CreateIncidentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const createIncidentSchema = z.object({
  title: z
    .string()
    .min(5, 'Title must be at least 5 characters')
    .max(255, 'Title must be less than 255 characters'),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters'),
  category: z.enum([
    'plumbing',
    'electrical',
    'hvac',
    'structural',
    'appliance',
    'pest',
    'noise',
    'security',
    'other',
  ]),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  apartmentId: z.string().uuid('Please select an apartment'),
});

type FormData = z.infer<typeof createIncidentSchema>;

const categoryOptions = [
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'hvac', label: 'HVAC (Heating/Cooling)' },
  { value: 'structural', label: 'Structural' },
  { value: 'appliance', label: 'Appliance' },
  { value: 'pest', label: 'Pest Control' },
  { value: 'noise', label: 'Noise Complaint' },
  { value: 'security', label: 'Security' },
  { value: 'other', label: 'Other' },
];

const priorityOptions = [
  { value: 'low', label: 'Low - Can wait a few days' },
  { value: 'medium', label: 'Medium - Needs attention soon' },
  { value: 'high', label: 'High - Urgent but not emergency' },
  { value: 'urgent', label: 'Urgent - Emergency situation' },
];

export function CreateIncidentDialog({
  open,
  onOpenChange,
}: CreateIncidentDialogProps) {
  const { toast } = useToast();
  const createIncident = useCreateIncident();
  const { data: apartmentsData, isLoading: loadingApartments } = useApartments();

  const form = useForm<FormData>({
    resolver: zodResolver(createIncidentSchema),
    defaultValues: {
      title: '',
      description: '',
      category: undefined,
      priority: 'medium',
      apartmentId: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await createIncident.mutateAsync(data as CreateIncidentData);
      toast({
        title: 'Incident reported',
        description: 'Your incident has been submitted successfully.',
      });
      form.reset();
      onOpenChange(false);
    } catch (error: unknown) {
      const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create incident.';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const apartments = apartmentsData?.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Report an Incident
          </DialogTitle>
          <DialogDescription>
            Describe the issue you&apos;re experiencing and we&apos;ll get it resolved.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="apartmentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Apartment</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={loadingApartments}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select apartment" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {apartments.map((apt) => (
                        <SelectItem key={apt.id} value={apt.id}>
                          {apt.unitNumber}
                          {apt.building?.name && ` - ${apt.building.name}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Brief description of the issue"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categoryOptions.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {priorityOptions.map((pri) => (
                        <SelectItem key={pri.value} value={pri.value}>
                          {pri.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose based on how urgent the issue is
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Provide details about the issue, including any relevant information that might help resolve it..."
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset();
                  onOpenChange(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createIncident.isPending}>
                {createIncident.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Submit Incident
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
