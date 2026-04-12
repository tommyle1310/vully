# Change: Separate Billing Streams & Refine Payment Verification

## Why

The current billing pipeline treats operational fees (electricity, water, trash, management) and large property payments (down payments, purchase milestones, lease-to-own installments) as a single invoice stream. This causes three real-world problems:

1. **Resident shock** — A resident expecting a ₫2M utility bill sees ₫2.2B because a milestone payment is bundled in.
2. **Corrupted analytics** — Property sale revenue (billions) drowns out operational fee trends (millions), making financial dashboards meaningless for BQL.
3. **VietQR/NAPAS limits** — Vietnamese fast-transfer caps at ~₫500M per transaction; a bundled ₫2B invoice cannot be paid via QR scan.

Additionally, the payment verification workflow (Pending Payments page) is functionally complete but missing several UX refinements that real-world BQL accountants need for efficient daily reconciliation.

## What Changes

### Stream A — Billing Separation

- **Remove** milestone and installment line items from the monthly bulk-generate pipeline; bulk generation ONLY produces operational invoices (rent, utilities, management fee, parking, trash).
- **Keep** milestones & installment tracking in the existing `contract_payment_schedules` system (already implemented), with clear sidebar separation.
- **Add** an `invoiceStream` discriminator (`operational` | `property`) to the Invoice model so any invoice that was historically generated for milestones can be filtered/categorized.
- **Update** the Bulk Generate dialog to remove milestone/installment category checkboxes — those are not "bulk-generatable" operational charges.
- **Add** category filter chips on the Invoices list page so admins can quickly filter by type: Utilities, Management Fee, Rent, Parking, Trash.

### Stream B — Verification UX Refinements

- **Add** proof-of-payment image preview to the Invoice Payment verification dialog (contract payment dialog already has it via `receiptUrl`).
- **Add** inline quick-action buttons (✓ Confirm / ✗ Reject) on each row of the pending payments table, so admins can process without opening the full dialog for obvious cases.
- **Add** structured rejection reasons (select from predefined list; free-text notes mandatory when reason is `other`) and send push notification to the resident upon rejection.
- **Add** "Auto-matched" badge when a payment's `referenceNumber` matches the expected VietQR reference pattern (e.g., `501_PUR_202604`), using fuzzy regex matching to tolerate common resident typos (e.g., `p501` → `501`), signaling the admin that manual verification is unnecessary.
- **Support** explicit partial-payment confirmation flow — when `actualAmount < expectedAmount`, show remaining balance and allow the admin to confirm the partial with a note; the schedule entry stays `partially_paid` instead of `paid`.

## Impact

- Affected specs: `billing-stream-separation` (new), `payment-verification-ux` (new)
- Relates to existing changes: `overhaul-billing-and-invoicing` (modifies its approach to milestone/purchase invoices), `add-payment-tracking` (builds on its verification flow)
- Affected code:
  - Backend: `billing.processor.ts`, `invoice-calculator.service.ts`, `invoices.service.ts`, `invoices.controller.ts`, `payment-schedule.service.ts`, Prisma schema
  - Frontend: `bulk-generate-dialog.tsx`, `invoices/page.tsx`, `payments/pending/page.tsx`, `VerifyPaymentDialog.tsx`, `VerifyInvoicePaymentDialog.tsx`, `use-payments.ts`, `use-billing.ts`
  - Database: Add `invoice_stream` enum + column to `invoices`, add `rejection_reason` enum
