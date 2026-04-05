import { z } from 'zod';
import { Zap, Droplets, Flame } from 'lucide-react';

// Get current billing period (YYYY-MM format)
export function getCurrentBillingPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// Form schema
export const meterReadingSchema = z.object({
  apartmentId: z.string().min(1, 'Select an apartment'),
  utilityTypeId: z.string().min(1, 'Select a utility type'),
  currentValue: z.number().min(0, 'Current value must be positive'),
  previousValue: z.number().min(0, 'Previous value must be positive').optional(),
  billingPeriod: z.string().regex(/^\d{4}-\d{2}$/, 'Invalid billing period format'),
  readingDate: z.date({ required_error: 'Reading date is required' }),
});

export type MeterReadingFormValues = z.infer<typeof meterReadingSchema>;

// Icon mapping for utility types
export const UTILITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  electric: Zap,
  water: Droplets,
  gas: Flame,
};
