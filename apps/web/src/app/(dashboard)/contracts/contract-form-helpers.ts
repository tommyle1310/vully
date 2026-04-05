import { ContractFormValues, ContractType, CONTRACT_TYPES } from './contract-form-schema';

// ============================================================================
// Terms Notes Parsing
// ============================================================================

export function parseContractType(termsNotes?: string): ContractType {
  if (!termsNotes) return 'rental';
  const match = termsNotes.match(/\[Contract Type: ([^\]]+)\]/);
  if (match) {
    const type = match[1].toLowerCase().replace(/ /g, '_');
    if (type === 'purchase') return 'purchase';
    if (type === 'lease_to_own') return 'lease_to_own';
  }
  return 'rental';
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

export function parseTermsNotesFields(termsNotes?: string): Partial<ContractFormValues> {
  const fields: Partial<ContractFormValues> = {};
  if (!termsNotes) return fields;

  const purchasePriceMatch = termsNotes.match(/Purchase Price:\s*([\d.,]+)\s*VND/i);
  if (purchasePriceMatch) fields.purchasePrice = parseVndAmount(purchasePriceMatch[1]);

  const downPaymentMatch = termsNotes.match(/Down Payment:\s*([\d.,]+)\s*VND/i);
  if (downPaymentMatch) fields.downPayment = parseVndAmount(downPaymentMatch[1]);

  const transferDateMatch = termsNotes.match(/Transfer Date:\s*(\d{4}-\d{2}-\d{2})/i);
  if (transferDateMatch) fields.transferDate = transferDateMatch[1];

  const paymentScheduleMatch = termsNotes.match(/Payment Schedule:\s*(.+?)(?:\n|$)/i);
  if (paymentScheduleMatch) fields.paymentSchedule = paymentScheduleMatch[1].trim();

  const optionFeeMatch = termsNotes.match(/Option Fee:\s*([\d.,]+)\s*VND/i);
  if (optionFeeMatch) fields.optionFee = parseVndAmount(optionFeeMatch[1]);

  const purchaseOptionPriceMatch = termsNotes.match(/Purchase Option Price:\s*([\d.,]+)\s*VND/i);
  if (purchaseOptionPriceMatch) fields.purchaseOptionPrice = parseVndAmount(purchaseOptionPriceMatch[1]);

  const optionPeriodMatch = termsNotes.match(/Option Period:\s*(\d+)\s*months/i);
  if (optionPeriodMatch) fields.optionPeriodMonths = parseInt(optionPeriodMatch[1], 10);

  const rentCreditMatch = termsNotes.match(/Rent Credit:\s*(\d+)%/i);
  if (rentCreditMatch) fields.rentCreditPercent = parseInt(rentCreditMatch[1], 10);

  const paymentDueDayMatch = termsNotes.match(/Payment Due:\s*Day\s*(\d+)/i);
  if (paymentDueDayMatch) fields.paymentDueDay = parseInt(paymentDueDayMatch[1], 10);

  return fields;
}

export function getCleanTermsNotes(termsNotes?: string): string {
  if (!termsNotes) return '';
  return termsNotes
    .replace(/\[Contract Type: [^\]]+\]\n?/g, '')
    .replace(/Purchase Price:\s*[\d.,]+\s*VND\n?/gi, '')
    .replace(/Down Payment:\s*[\d.,]+\s*VND\n?/gi, '')
    .replace(/Transfer Date:\s*\d{4}-\d{2}-\d{2}\n?/gi, '')
    .replace(/Payment Schedule:\s*.+?(?:\n|$)/gi, '')
    .replace(/Option Fee:\s*[\d.,]+\s*VND\n?/gi, '')
    .replace(/Purchase Option Price:\s*[\d.,]+\s*VND\n?/gi, '')
    .replace(/Option Period:\s*\d+\s*months\n?/gi, '')
    .replace(/Rent Credit:\s*\d+%\n?/gi, '')
    .replace(/Payment Due:\s*Day\s*\d+.*\n?/gi, '')
    .replace(/^---\n?/gm, '')
    .trim();
}

// ============================================================================
// Terms Notes Building
// ============================================================================

export function buildTermsNotes(values: ContractFormValues): string {
  const parts: string[] = [];

  parts.push(`[Contract Type: ${CONTRACT_TYPES[values.contractType].label}]`);

  if (values.contractType === 'purchase') {
    if (values.purchasePrice) parts.push(`Purchase Price: ${values.purchasePrice.toLocaleString()} VND`);
    if (values.downPayment) parts.push(`Down Payment: ${values.downPayment.toLocaleString()} VND`);
    if (values.transferDate) parts.push(`Transfer Date: ${values.transferDate}`);
    if (values.paymentSchedule) parts.push(`Payment Schedule: ${values.paymentSchedule}`);
  } else if (values.contractType === 'lease_to_own') {
    if (values.optionFee) parts.push(`Option Fee: ${values.optionFee.toLocaleString()} VND`);
    if (values.purchaseOptionPrice) parts.push(`Purchase Option Price: ${values.purchaseOptionPrice.toLocaleString()} VND`);
    if (values.optionPeriodMonths) parts.push(`Option Period: ${values.optionPeriodMonths} months`);
    if (values.rentCreditPercent) parts.push(`Rent Credit: ${values.rentCreditPercent}%`);
  } else if (values.contractType === 'rental') {
    if (values.paymentDueDay) parts.push(`Payment Due: Day ${values.paymentDueDay} of each month`);
  }

  if (values.termsNotes) {
    parts.push('---');
    parts.push(values.termsNotes);
  }

  return parts.join('\n');
}

export function getSuccessMessage(type: ContractType): string {
  switch (type) {
    case 'purchase':
      return 'The purchase contract has been created.';
    case 'lease_to_own':
      return 'The lease-to-own contract has been created.';
    default:
      return 'The rental contract has been created and apartment marked as occupied.';
  }
}
