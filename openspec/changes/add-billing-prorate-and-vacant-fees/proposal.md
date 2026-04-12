# Change: Add Billing Pro-Rate & Vacant Apartment Fees

## Why

The current billing engine generates invoices only for apartments with active contracts and always charges a full month's management fee regardless of when the contract started. This creates two compliance gaps per Vietnamese apartment management regulations (BQL):

1. **Vacant apartments** still owe management fees (to the building fund), but the system has no mechanism to bill them — all invoices require a `contract_id`.
2. **Mid-month move-ins** are overcharged on the first billing cycle because the management fee is not pro-rated by calendar days.

Additionally, the frontend invoice detail sheet does not render the `tier_breakdown` JSON stored on utility line items, so residents cannot verify tiered pricing calculations.

## What Changes

### Backend
- **Pro-rate management fee**: When a contract's `start_date` falls within the billing period, charge `(days_remaining / total_days) × full_fee` instead of the full amount.
- **Vacant apartment billing**: Introduce a new building-level billing job that generates **standalone management-fee invoices** for apartments with status `vacant` (or occupied-but-no-active-contract). These invoices reference the apartment owner via their user record.
- **Vacant invoice model**: Create a `vacant_invoices` table (or make `contract_id` nullable on `invoices` with a new `apartment_id` FK) to support invoices not tied to a contract.

### Frontend
- **Tier breakdown display**: Show per-tier details (tier range, quantity consumed, unit price, amount) on the invoice detail sheet for utility line items that have `tier_breakdown` data.
- **Pro-rate indicator**: When a management fee line item is pro-rated, show the number of days and original full-month amount in a tooltip or sub-line.

### Database
- Add `apartment_id` column (nullable) to `invoices` table for vacant-apartment billing
- Make `contract_id` nullable on `invoices` (one of contract_id or apartment_id must be non-null)

## Impact

- **Affected specs (from existing changes)**:
  - `overhaul-billing-and-invoicing/specs/invoice-generation/spec.md` — extends REQ-BILL-003 (management fee) and REQ-BILL-005 (tiered pricing display)
  - `overhaul-billing-and-invoicing/specs/payment-ui-vietqr/spec.md` — extends REQ-UI-005 (invoice detail sheet)
- **Affected code**:
  - `apps/api/src/modules/billing/invoice-calculator.service.ts` — pro-rate logic in `buildManagementFeeLineItem()`
  - `apps/api/src/modules/billing/billing.processor.ts` — new vacant-apartment billing pass
  - `apps/api/src/modules/billing/invoices.service.ts` — support nullable `contract_id`
  - `apps/api/prisma/schema.prisma` — invoices table changes
  - `apps/web/src/components/` — invoice detail tier breakdown UI
- **Breaking changes**: None. `contract_id` becomes nullable but existing data remains intact; new `apartment_id` column is additive.

## Existing Coverage

> **Important**: Much of what the user described (management fee per m², tiered utility pricing, VAT handling, environment fees, invoice generation engine) is **already implemented** and covered by the `overhaul-billing-and-invoicing` change (50/59 tasks complete). This proposal addresses ONLY the gaps not covered:
>
> | Feature | Status | Where |
> |---------|--------|-------|
> | Management fee = net_area × price_per_sqm + 10% VAT | ✅ Done | `invoice-calculator.service.ts` → `buildManagementFeeLineItem()` |
> | `management_fee_configs` table (versioned, per-building, per-unit-type) | ✅ Done | Prisma schema |
> | Tiered utility calculation (sequential tier consumption) | ✅ Done | `invoice-calculator.service.ts` → `calculateTieredAmount()` |
> | `utility_tiers` table (per-utility, per-building, versioned) | ✅ Done | Prisma schema |
> | Environment fee 10% on water/gas | ✅ Done | `ENVIRONMENT_FEE_CATEGORIES` constant |
> | VAT rates per category (rent 10%, electric 0%, gas 8%, etc.) | ✅ Done | `VAT_RATES` constant |
> | BullMQ monthly invoice generation | ✅ Done | `billing.processor.ts` |
> | Tier breakdown stored in `tier_breakdown` JSON | ✅ Done | `invoice_line_items.tier_breakdown` |
> | **Pro-rate management fee (mid-month move-in)** | ❌ Gap | This proposal |
> | **Vacant apartment management fee billing** | ❌ Gap | This proposal |
> | **Frontend tier breakdown rendering** | ❌ Gap | This proposal |
