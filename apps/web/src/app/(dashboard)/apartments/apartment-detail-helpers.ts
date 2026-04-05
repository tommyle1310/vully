export const statusVariants: Record<string, 'default' | 'success' | 'warning' | 'destructive'> = {
  VACANT: 'success',
  OCCUPIED: 'default',
  MAINTENANCE: 'warning',
  vacant: 'success',
  occupied: 'default',
  maintenance: 'warning',
  reserved: 'default',
};

export const statusActions: Record<string, { label: string; newStatus: string }[]> = {
  VACANT: [
    { label: 'Mark as Occupied', newStatus: 'OCCUPIED' },
    { label: 'Set Maintenance', newStatus: 'MAINTENANCE' },
  ],
  OCCUPIED: [
    { label: 'Mark as Vacant', newStatus: 'VACANT' },
    { label: 'Set Maintenance', newStatus: 'MAINTENANCE' },
  ],
  MAINTENANCE: [
    { label: 'Mark as Vacant', newStatus: 'VACANT' },
    { label: 'Mark as Occupied', newStatus: 'OCCUPIED' },
  ],
  vacant: [
    { label: 'Mark as Occupied', newStatus: 'occupied' },
    { label: 'Set Maintenance', newStatus: 'maintenance' },
  ],
  occupied: [
    { label: 'Mark as Vacant', newStatus: 'vacant' },
    { label: 'Set Maintenance', newStatus: 'maintenance' },
  ],
  maintenance: [
    { label: 'Mark as Vacant', newStatus: 'vacant' },
    { label: 'Mark as Occupied', newStatus: 'occupied' },
  ],
};

export const UNIT_TYPE_LABELS: Record<string, string> = {
  studio: 'Studio',
  one_bedroom: '1 Bedroom',
  two_bedroom: '2 Bedrooms',
  three_bedroom: '3 Bedrooms',
  duplex: 'Duplex',
  penthouse: 'Penthouse',
  shophouse: 'Shophouse',
};

export const ORIENTATION_LABELS: Record<string, string> = {
  north: 'North',
  south: 'South',
  east: 'East',
  west: 'West',
  northeast: 'Northeast',
  northwest: 'Northwest',
  southeast: 'Southeast',
  southwest: 'Southwest',
};

const BILLING_CYCLE_DESCRIPTIONS: Record<string, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

export function getBillingCycleDescription(cycle: string): string {
  return BILLING_CYCLE_DESCRIPTIONS[cycle] || cycle.charAt(0).toUpperCase() + cycle.slice(1);
}

export function getContractType(termsNotes?: string): 'rental' | 'purchase' | 'lease_to_own' {
  if (!termsNotes) return 'rental';
  if (termsNotes.includes('[Contract Type: Purchase]')) return 'purchase';
  if (termsNotes.includes('[Contract Type: Lease to Own]')) return 'lease_to_own';
  return 'rental';
}

export interface ParsedContractDetails {
  purchasePrice?: number;
  downPayment?: number;
  transferDate?: string;
  paymentSchedule?: string;
  optionFee?: number;
  purchaseOptionPrice?: number;
  optionPeriodMonths?: number;
  rentCreditPercent?: number;
  paymentDueDay?: number;
}

function parseVndAmount(str: string): number | undefined {
  const cleaned = str.replace(/\s*VND\s*/gi, '').trim();
  if (cleaned.includes('.') && !cleaned.includes(',')) {
    const num = parseInt(cleaned.replace(/\./g, ''), 10);
    return isNaN(num) ? undefined : num;
  }
  const num = parseInt(cleaned.replace(/,/g, ''), 10);
  return isNaN(num) ? undefined : num;
}

export function parseContractDetails(termsNotes?: string): ParsedContractDetails {
  const details: ParsedContractDetails = {};
  if (!termsNotes) return details;

  const purchasePriceMatch = termsNotes.match(/Purchase Price:\s*([\d.,]+)\s*VND/i);
  if (purchasePriceMatch) details.purchasePrice = parseVndAmount(purchasePriceMatch[1]);

  const downPaymentMatch = termsNotes.match(/Down Payment:\s*([\d.,]+)\s*VND/i);
  if (downPaymentMatch) details.downPayment = parseVndAmount(downPaymentMatch[1]);

  const transferDateMatch = termsNotes.match(/Transfer Date:\s*(\d{4}-\d{2}-\d{2})/i);
  if (transferDateMatch) details.transferDate = transferDateMatch[1];

  const paymentScheduleMatch = termsNotes.match(/Payment Schedule:\s*(.+?)(?:\n|$)/i);
  if (paymentScheduleMatch) details.paymentSchedule = paymentScheduleMatch[1].trim();

  const optionFeeMatch = termsNotes.match(/Option Fee:\s*([\d.,]+)\s*VND/i);
  if (optionFeeMatch) details.optionFee = parseVndAmount(optionFeeMatch[1]);

  const purchaseOptionPriceMatch = termsNotes.match(/Purchase Option Price:\s*([\d.,]+)\s*VND/i);
  if (purchaseOptionPriceMatch) details.purchaseOptionPrice = parseVndAmount(purchaseOptionPriceMatch[1]);

  const optionPeriodMatch = termsNotes.match(/Option Period:\s*(\d+)\s*months/i);
  if (optionPeriodMatch) details.optionPeriodMonths = parseInt(optionPeriodMatch[1], 10);

  const rentCreditMatch = termsNotes.match(/Rent Credit:\s*(\d+)%/i);
  if (rentCreditMatch) details.rentCreditPercent = parseInt(rentCreditMatch[1], 10);

  const paymentDueDayMatch = termsNotes.match(/Payment Due:\s*Day\s*(\d+)/i);
  if (paymentDueDayMatch) details.paymentDueDay = parseInt(paymentDueDayMatch[1], 10);

  return details;
}
