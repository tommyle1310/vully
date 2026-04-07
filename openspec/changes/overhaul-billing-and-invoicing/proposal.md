# Overhaul Billing & Invoicing System

## Summary

Comprehensive overhaul of the billing, invoicing, and payment tracking system to align with real-world Vietnamese apartment management (BQL) requirements per `docs/must_follow_monthly_invoice.md`. The current implementation is too basic for even a small-scale real estate operation — invoices only generate for rent, utility billing is always skipped, purchase/lease-to-own contracts produce no invoices, management fees are absent, VAT is not separated, and the UI for payment schedules and invoice details is broken or incomplete.

## Motivation

### Current Problems

1. **Invoice generation only works for rent** — `billing.processor.ts` processes `rental` and `lease_to_own` but the calculator only adds rent line items when `rent_amount > 0`. Purchase contracts are entirely excluded (`throw BadRequestException`). Lease-to-own contracts don't generate principal/interest breakdowns.

2. **Utility billing always skips** — Despite valid meter readings in the database, the `invoice-calculator.service.ts` fails to find matching readings because the category filter (`categories` param from bulk generation) compares utility type codes against a hardcoded `'rent'` category, and the meter reading query doesn't match properly against the contract's apartment.

3. **No management fee line item** — `management_fee_configs` table exists but is never used during invoice calculation. Vietnamese law requires BQL to itemize management fees per m² with VAT.

4. **No VAT separation** — Invoices have a `tax_amount` field but it's always 0. Vietnamese billing requires VAT to be separated per line item category (10% for rent/management, 0-8% for utilities depending on type).

5. **Authorization bug: admin gets 403** — `payment-schedule.controller.ts` uses `user.role` (singular legacy field) for authorization checks, but the `RolesGuard` uses `user.roles` (plural array). When a multi-role user's `role` field doesn't match, the business logic check fails even though the guard passes.

6. **Payment schedule UI is broken**:
   - Edit Schedule button is always disabled (hardcoded)
   - Delete schedule button works but Add Entry button doesn't re-enable after deletion
   - `RecordPaymentDialog` overflows viewport height (no max-height constraint)
   - Date picker uses native `<input type="date">` instead of the project's Shadcn DatePicker component
   - Payment method options don't differentiate between admin and resident flows

7. **No VietQR integration for resident payments** — Residents selecting "Bank Transfer" should see a VietQR QR code with pre-filled amount and reference. Currently there's no QR generation at all.

8. **Invoice detail sheet is too sparse** — No contract-type-specific details, no VAT breakdown, no meter reading details, no management fee breakdown. Cannot distinguish rent vs purchase vs lease-to-own invoice content.

### Expected Outcome

- Invoices generated correctly for all 3 contract types per `must_follow_monthly_invoice.md`
- Utility billing with tiered pricing actually produces line items when meter readings exist
- Management fee calculated per m² and included in monthly invoices
- VAT properly separated per line item category
- Payment schedule table fully functional (edit, delete, add)
- RecordPaymentDialog properly constrained, using Shadcn DatePicker, with VietQR for resident bank transfers
- Invoice detail sheet showing full breakdown per contract type
- Admin authorization working on all payment-schedule endpoints
- Bulk generate dialog supporting all contract types and utility categories

## Scope

### Backend (`apps/api/`)

| Area | Changes |
|------|---------|
| `billing/invoice-calculator.service.ts` | Rewrite to support rent/lease-to-own/purchase line items, utility billing fix, management fee calculation, VAT per category |
| `billing/billing.processor.ts` | Include purchase contracts (milestone-based), fix utility category matching |
| `billing/invoices.service.ts` | Remove purchase contract exclusion, add management fee config lookup |
| `billing/dto/invoice.dto.ts` | Add VAT fields to line items, management fee fields |
| `apartments/payment-schedule.controller.ts` | Fix auth: use `user.roles.includes()` instead of `user.role ===` |
| `apartments/payment-generator.service.ts` | Wire up `updateOverdueStatuses()` via cron/startup |
| New: `billing/vietqr.service.ts` | Mock VietQR adapter (Strategy pattern per `docs/sample_integrate_vietqr.md`) |
| New: `billing/vietqr.controller.ts` | `GET /invoices/:id/payment-qr` endpoint returning QR image URL |
| `prisma/schema.prisma` | Add `vat_rate`, `vat_amount` to `invoice_line_items`; add `line_item_category` enum |
| Tests | Update `billing.processor.spec.ts`, `invoices.service.spec.ts` for new logic |

### Frontend (`apps/web/`)

| Area | Changes |
|------|---------|
| `components/payments/RecordPaymentDialog.tsx` | Fix max-height, use Shadcn DatePicker, role-based payment methods, VietQR display for residents |
| `components/payments/PaymentScheduleTable.tsx` | Enable edit/add buttons, fix delete→add flow |
| `app/(dashboard)/invoices/invoice-detail-sheet.tsx` | Contract-type-specific display, VAT breakdown, utility details, management fee section |
| `app/(dashboard)/invoices/bulk-generate-dialog.tsx` | Fix category matching, show correct status for all contract types |
| `app/(dashboard)/contracts/[id]/page.tsx` | Fix auth for admin viewing, improve payment section |
| `hooks/use-billing.ts` | Add VietQR hook |
| New: `components/payments/VietQRDisplay.tsx` | QR code display component for bank transfer payments |

### Database

| Change | Description |
|--------|-------------|
| Add `vat_rate` Decimal to `invoice_line_items` | Per-line VAT rate (0%, 8%, 10%) |
| Add `vat_amount` Decimal to `invoice_line_items` | Calculated VAT amount per line |
| Add `category` String to `invoice_line_items` | Line item category: `rent`, `utility`, `management_fee`, `installment`, `milestone` |
| Add `environment_fee` Decimal to `invoice_line_items` | 10% for water/gas (Vietnamese regulation) |

## Dependencies

- Existing `management_fee_configs` table (already has `price_per_sqm`, `building_id`)
- Existing `utility_tiers` table (already has tiered pricing)
- Existing `meter_readings` table (already has valid data per `docs/current_tables.md`)
- `docs/sample_integrate_vietqr.md` for VietQR URL pattern (free public API, no key needed)

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Existing invoices have no VAT data | Migration sets `vat_rate=0, vat_amount=0` for existing records (backward-compatible) |
| VietQR public API may change | Strategy pattern allows swapping adapters; mock adapter for dev/test |
| Tiered utility calculation edge cases | Add comprehensive unit tests with real Vietnamese EVN/water tier schedules |
| Breaking existing payment schedule data | Schema changes are additive only (new columns, not removing any) |

## Acceptance Criteria

- [ ] Bulk invoice generation creates correct invoices for rental, purchase, and lease-to-own contracts
- [ ] Utility line items appear when meter readings exist for the billing period
- [ ] Management fee line item calculated from `management_fee_configs` per m²
- [ ] Each line item shows VAT rate and VAT amount separately
- [ ] Admin can access all payment-schedule and financial-summary endpoints (no 403)
- [ ] Payment schedule table: edit, delete, and add buttons all functional
- [ ] RecordPaymentDialog: max 85dvh height, Shadcn DatePicker, role-based payment methods
- [ ] Resident selecting "Bank Transfer" sees VietQR QR code with correct amount and reference
- [ ] Invoice detail sheet shows full breakdown per contract type (rent/purchase/LTO/utilities/management)
- [ ] All billing logic has >70% test coverage
