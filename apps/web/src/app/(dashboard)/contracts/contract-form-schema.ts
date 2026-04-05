import { z } from 'zod';
import { Key, ShoppingBag, Home } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  roles: string[];
  isActive: boolean;
}

export interface UsersResponse {
  data: User[];
  meta: { total: number; page: number; limit: number };
}

export const CONTRACT_TYPES = {
  rental: {
    label: 'Rental',
    description: 'Monthly/yearly lease agreement',
    icon: Key,
    partyLabel: 'Tenant',
  },
  purchase: {
    label: 'Purchase',
    description: 'Property sale/ownership transfer',
    icon: ShoppingBag,
    partyLabel: 'Buyer',
  },
  lease_to_own: {
    label: 'Lease to Own',
    description: 'Rent with option to purchase',
    icon: Home,
    partyLabel: 'Lessee/Buyer',
  },
} as const;

export type ContractType = keyof typeof CONTRACT_TYPES;

// ============================================================================
// Schema
// ============================================================================

export const contractFormSchema = z.object({
  contractType: z.enum(['rental', 'purchase', 'lease_to_own']),
  apartmentId: z.string().uuid('Please select an apartment'),
  partyId: z.string().uuid('Please select a party'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  rentAmount: z.coerce.number().min(0).optional(),
  depositMonths: z.coerce.number().int().min(0).optional(),
  depositAmount: z.preprocess(
    (v) => (v === '' || v == null ? undefined : v),
    z.coerce.number().min(0).optional(),
  ),
  paymentDueDay: z.coerce.number().int().min(1).max(28).optional(),
  purchasePrice: z.coerce.number().min(0).optional(),
  downPayment: z.coerce.number().min(0).optional(),
  paymentSchedule: z.string().optional(),
  transferDate: z.string().optional(),
  optionFee: z.coerce.number().min(0).optional(),
  optionPeriodMonths: z.coerce.number().int().min(1).optional(),
  purchaseOptionPrice: z.coerce.number().min(0).optional(),
  rentCreditPercent: z.coerce.number().min(0).max(100).optional(),
  citizenId: z.string().max(30).optional(),
  numberOfResidents: z.coerce.number().int().min(1).optional(),
  termsNotes: z.string().optional(),
  issueBuildingCard: z.boolean().optional(),
  issueParkingCard: z.boolean().optional(),
  requestedFacilities: z.array(z.string()).optional(),
});

export type ContractFormValues = z.infer<typeof contractFormSchema>;

export const quickCreateSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
});

export type QuickCreateValues = z.infer<typeof quickCreateSchema>;
