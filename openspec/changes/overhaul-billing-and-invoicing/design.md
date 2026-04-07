# Overhaul Billing & Invoicing — Design Document

## 1. Architecture Overview

The billing system is restructured into a **unified invoice pipeline** that handles all contract types, utility charges, and management fees in a single monthly invoice per apartment.

```
┌─────────────────────────────────────────────────────────┐
│                  Monthly Invoice Pipeline                │
├─────────────┬──────────────┬──────────────┬─────────────┤
│  Rent/LTO   │  Purchase    │  Utilities   │ Mgmt Fee    │
│  Calculator  │  Milestone   │  Calculator  │ Calculator  │
│             │  Detector    │             │             │
├─────────────┴──────────────┴──────────────┴─────────────┤
│              InvoiceCalculatorService                     │
│   - Builds line items per category                       │
│   - Applies VAT per category rules                       │
│   - Calculates environment fees (water/gas)              │
│   - Generates payment reference codes                    │
├──────────────────────────────────────────────────────────┤
│              BillingProcessor (BullMQ)                    │
│   - Processes ALL active contracts (incl. purchase)      │
│   - Per-contract: collect applicable line items          │
│   - Skip only if truly nothing billable                  │
├──────────────────────────────────────────────────────────┤
│              VietQR Adapter (Strategy)                   │
│   - Generates QR URL for bank transfer                   │
│   - Mock adapter for dev/test                            │
└──────────────────────────────────────────────────────────┘
```

## 2. Invoice Line Item Categories

Each `invoice_line_item` gets a `category` field to identify its type:

| Category | Contract Types | VAT Rate | Description |
|----------|---------------|----------|-------------|
| `rent` | rental | 10% | Monthly rent (base_rent + VAT) |
| `installment` | lease_to_own | 10% on interest | Principal + Interest breakdown |
| `milestone` | purchase | 10% | Milestone payment due this month |
| `utility_electric` | all | 0% | Electricity (tiered, thu hộ) |
| `utility_water` | all | 0% | Water (tiered + 10% env fee, thu hộ) |
| `utility_gas` | all | 8% | Gas (tiered + 10% env fee) |
| `management_fee` | all (occupied) | 10% | Per-m² management fee (BQL revenue) |

### 2.1 Rent Line Item (Rental Contracts)

```
Line Item:
  category: "rent"
  description: "Rent for 2026-05 (CONT-2026-045)"
  quantity: 1
  unit_price: base_rent (before VAT)
  vat_rate: 0.10
  vat_amount: base_rent × 0.10
  amount: base_rent + vat_amount
  metadata: { paymentReference: "A101_RENT_052026" }
```

### 2.2 Lease-to-Own Line Item

Per billing period, calculate principal + interest from the amortization schedule:

```
Line Item:
  category: "installment"
  description: "Installment 18/60 - LTO-2024-112"
  quantity: 1
  unit_price: principal + interest
  vat_rate: 0.10  (on interest portion only)
  vat_amount: interest × 0.10
  amount: principal + interest + vat_on_interest
  metadata: {
    installmentNumber: "18/60",
    principalPayment: 22000000,
    interestPayment: 3200000,
    remainingPrincipal: 1280000000
  }
```

The amortization is calculated from contract fields:
- `purchase_option_price` = total principal
- `rent_amount` as monthly installment base (or calculated from contract duration)
- Interest rate derived from `termsNotes` or a new field (future: `interest_rate` column)
- For MVP: use simple equal-installment with interest = (remaining × annual_rate / 12)

### 2.3 Purchase Milestone Line Item

Purchase milestones are tracked in `contract_payment_schedules`. During monthly invoice generation, check if any milestone has `due_date` within the billing period:

```
Line Item:
  category: "milestone"
  description: "Milestone: Cất nóc tầng 35 (10% contract value)"
  quantity: 1
  unit_price: milestone_expected_amount
  vat_rate: 0.10
  vat_amount: milestone_expected_amount × 0.10
  amount: milestone_expected_amount + vat_amount
  metadata: {
    milestoneName: "Cất nóc tầng 35",
    paymentPercentage: 10,
    contractValue: 4200000000,
    scheduleId: "uuid-of-payment-schedule"
  }
```

### 2.4 Utility Line Items

Fixed: The current bug is that `calculateInvoice()` receives `categories` as an array of strings (e.g., `['rent', 'electric']`) but queries meter readings by `utility_type_id`, not by category code. The fix:

1. When `categories` includes a utility type code (e.g., `'electric'`), resolve it to the `utility_type_id`
2. Query `meter_readings` by `apartment_id + billing_period + utility_type_id`
3. Calculate tiered amount using the correct tier lookup (building-specific first, then global)
4. Add environment fee (10%) for water and gas

```
Line Item (Electricity):
  category: "utility_electric"
  description: "Electricity for 2026-05 (Meter: E-220501)"
  quantity: 440  (consumption in kWh)
  unit_price: weighted average per kWh
  vat_rate: 0.00  (thu hộ = pass-through, no VAT)
  vat_amount: 0
  amount: tiered_total
  meter_reading_id: "uuid"
  utility_type_id: "uuid"
  tier_breakdown: [{"tier":1,"qty":200,"price":1866,"amount":373200}, ...]
```

### 2.5 Management Fee Line Item

Query `management_fee_configs` for the apartment's building with `effective_from <= billing_month_start` and `effective_to IS NULL OR >= billing_month_end`:

```
Line Item:
  category: "management_fee"
  description: "Management Fee (82.5 m² × 15,000 VND/m²)"
  quantity: 82.5  (apartment.area)
  unit_price: 15000  (rate_per_sqm from config)
  vat_rate: 0.10  (BQL revenue)
  vat_amount: 82.5 × 15000 × 0.10
  amount: 82.5 × 15000 + vat_amount
```

## 3. Authorization Fix

### Problem

The `RolesGuard` checks `user.roles` (multi-role array) correctly. But controller business logic uses `user.role` (singular legacy field):

```typescript
// BROKEN: user.role may not reflect all roles
const isAdmin = user.role === 'admin' || user.role === 'technician';
```

### Solution

Replace all `user.role` checks in `payment-schedule.controller.ts` with:

```typescript
const isAdmin = user.roles?.includes('admin') || user.roles?.includes('technician');
```

This matches the guard's behavior and supports multi-role users.

## 4. Payment Schedule UI Fixes

### 4.1 Edit Schedule Button

Currently hardcoded `disabled`. Enable it for admins — clicking opens a dialog with the schedule's `periodLabel`, `dueDate`, `expectedAmount`, and `notes` pre-filled.

### 4.2 Delete + Add Flow

After deleting a schedule entry, the "Add Entry" button should enable. The current issue is that the button's disabled state depends on a stale `schedules` array. Fix: use the query cache's latest state after invalidation.

### 4.3 RecordPaymentDialog Fixes

| Issue | Fix |
|-------|-----|
| Full viewport height | Add `max-h-[85dvh] overflow-y-auto` to `DialogContent` |
| Native date input | Replace with Shadcn `DatePicker` (already used in `contract-form-dialog.tsx`) |
| Payment method too basic | For `resident` role: only show `bank_transfer` and `cash`. For `admin`: show all 5 methods |
| VietQR for bank transfer | When resident selects `bank_transfer`, show `VietQRDisplay` component with QR image |

### 4.4 VietQR Integration (Mock)

Use the free public URL format from `docs/sample_integrate_vietqr.md`:

```
https://img.vietqr.io/image/{BANK_ID}-{ACCOUNT_NO}-{TEMPLATE}.png
  ?amount={amount}
  &addInfo={paymentReference}
  &accountName={ACCOUNT_NAME}
```

For dev/test, use environment variables:
```env
PAYMENT_GATEWAY=mock          # or "vietqr" for prod
VIETQR_BANK_ID=vietinbank
VIETQR_ACCOUNT_NO=123456789012
VIETQR_ACCOUNT_NAME=VULLY%20APARTMENT%20MANAGEMENT
VIETQR_TEMPLATE=compact2
```

The mock adapter returns a placeholder image URL instead of a real QR.

## 5. Invoice Detail Sheet Redesign

The sheet should adapt its display based on the contract type (detected from invoice line items):

### Rent Invoice
- Rent section: Base rent, VAT rate, VAT amount, net rent, payment reference
- Utility section(s): Per utility type with meter reading details, tier breakdown, env fee
- Management fee section: Area, rate per m², services included, VAT
- Totals: Subtotal, total VAT, grand total, amount paid, remaining

### Purchase Invoice
- Milestone section: Milestone name, % of contract, contract value, amount due, VAT
- Utility section(s): Same as rent
- Management fee section: Same as rent

### Lease-to-Own Invoice
- Installment section: Installment number (e.g., 18/60), principal, interest, remaining principal, VAT on interest
- Utility section(s): Same as rent
- Management fee section: Same as rent

## 6. Bulk Generation Flow Fix

### Current Bug

The processor only handles `rental` and `lease_to_own` types. The categories filter (`['rent', 'electric', 'water']`) is passed but:
1. `'rent'` matches the hardcoded check for rent line items
2. Utility codes like `'electric'` should resolve to `utility_type_id` but the code compares code strings incorrectly

### Fix

1. **Include purchase contracts** — When a purchase contract has a payment schedule milestone due within the billing period, generate an invoice with that milestone as a line item
2. **Fix utility code resolution** — Before querying meter readings, resolve utility type codes to UUIDs using the `utility_types` table
3. **Always include management fee** — Unless explicitly excluded from categories, add management fee if `management_fee_configs` exists for the building
4. **Don't fail if only some categories have data** — Current logic throws if `lineItems.length === 0`. Instead, only fail if no line items at all after checking ALL categories (rent + utilities + management fee)

## 7. Database Migration Plan

### New columns on `invoice_line_items`:

```sql
ALTER TABLE invoice_line_items 
  ADD COLUMN category VARCHAR(50),
  ADD COLUMN vat_rate DECIMAL(5,4) DEFAULT 0,
  ADD COLUMN vat_amount DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN environment_fee DECIMAL(12,2) DEFAULT 0;

-- Backfill existing data
UPDATE invoice_line_items 
  SET category = CASE
    WHEN utility_type_id IS NOT NULL THEN 'utility'
    ELSE 'rent'
  END;
```

### No breaking changes:
- All new columns have defaults
- Existing invoices maintain backward compatibility
- No columns removed or renamed

## 8. Tiered Calculation Fix

The current `calculateTieredAmount()` has a logic error in tier boundary handling:

```typescript
// BROKEN: remainingUsage - tierMin doesn't work when tiers are consecutive
const tierUsage = Math.min(
  Math.max(0, remainingUsage - tierMin),
  tierMax - tierMin,
);
```

### Correct algorithm:

```typescript
let remaining = totalConsumption;
for (const tier of sortedTiers) {
  const tierCapacity = (tier.max_usage ?? Infinity) - tier.min_usage;
  const usedInTier = Math.min(remaining, tierCapacity);
  if (usedInTier <= 0) break;
  totalCost += usedInTier * tier.unit_price;
  remaining -= usedInTier;
  breakdown.push({ tier: tier.tier_number, qty: usedInTier, price: tier.unit_price, amount: usedInTier * tier.unit_price });
}
```

This processes tiers sequentially, consuming from each tier until the total consumption is exhausted.
