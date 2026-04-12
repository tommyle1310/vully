# Design: Separate Billing Streams & Refine Payment Verification

## Context

Vully's billing pipeline currently generates a single monthly invoice per apartment containing ALL charges: operational fees (utilities, management, trash) AND large property payments (milestones, installments). Vietnamese apartment management (BQL) best practice — and Vietnamese Ministry of Finance (Bộ Tài chính) accounting circulars — require separating operational revenue from investment/property revenue for accurate reporting, resident clarity, and payment-gateway compatibility.

The payment verification workflow already supports confirm/reject with notes and partial amounts, but daily reconciliation for 100+ units requires faster inline actions, proof-of-payment visibility, and auto-matching against VietQR reference codes.

### Stakeholders
- **BQL Accountant**: Needs clean separation for monthly financial reports and tax filings
- **Residents**: Should only see operational fees in their monthly invoice; property payments tracked via contract schedule
- **Admin/Developer**: Maintains the Bulk Generate pipeline and Pending Payments page

## Goals / Non-Goals

### Goals
1. Bulk Generate produces only **operational** invoices (rent, utilities, management fee, parking, trash)
2. Property payments (milestones, installments, down payments) are exclusively managed via `contract_payment_schedules`
3. Historical invoices that contain milestone/installment line items remain queryable but tagged as `property` stream
4. Payment verification UX supports inline quick-actions, proof images for invoices, structured rejection reasons, auto-match badges, and explicit partial-payment flow

### Non-Goals
- No new database tables for the billing separation — reuse existing `invoices` + `contract_payment_schedules`
- No push notification infrastructure (the rejection notification requirement is deferred to the Communication Hub module; for now, use in-app toast + WebSocket event)
- No mobile-specific UI changes (responsive existing design is sufficient)
- No changes to VietQR generation itself (already implemented via adapter pattern)

## Decisions

### D1: Invoice Stream Discriminator

**Decision**: Add an `InvoiceStream` enum (`operational`, `property`) and a nullable `invoice_stream` column to the `invoices` table. Default is `operational`. A data migration backfills existing invoices: any invoice containing a line item with category `milestone` or `installment` is tagged `property`.

**Alternatives considered**:
- *Separate tables for operational vs property invoices*: Rejected — creates schema duplication and breaks existing queries.
- *Filter by line item category at query time*: Rejected — expensive join on every list query; a column is cheaper and indexable.

### D2: Remove Milestone/Installment from Bulk Generate

**Decision**: The `BillingProcessor` and `InvoiceCalculatorService` skip `milestone` and `installment` categories during bulk generation. The Bulk Generate dialog removes those checkboxes. Milestone payments are triggered manually or by the contract payment schedule system reaching a due date.

**Rationale**: Milestones are event-driven (handover date, construction progress), not calendar-driven. Mixing them with monthly utility billing is a domain error.

### D3: Inline Quick-Action Buttons

**Decision**: Add `✓` (Confirm) and `✗` (Reject) icon buttons in the Actions column of the pending payments table. Clicking `✓` immediately confirms with the reported amount (no dialog). Clicking `✗` opens a compact popover for rejection reason selection. The full "Review" button remains for complex cases (amount override, notes). An undo toast with a **10-second** window appears after inline confirm to guard against accidental approvals. A "Recently Processed" section in the History tab (sorted by most recent first) also allows admins to revisit and revert if the undo window has passed.

**Alternatives considered**:
- *Bulk select + batch confirm*: Deferred — adds complexity; inline buttons handle the 80% case.
- *Swipe gestures*: Not applicable to desktop-first admin workflow.

### D4: Structured Rejection Reasons

**Decision**: Define a `PaymentRejectionReason` enum with common values: `insufficient_amount`, `wrong_reference`, `blurry_receipt`, `duplicate_payment`, `expired_receipt`, `other`. The reject popover shows a select dropdown + optional free-text note. When reason is `other`, the free-text note becomes **mandatory** so the resident always receives a clear explanation. The reason is stored alongside the existing `notes` field.

### D5: Auto-Match Badge

**Decision**: When a `referenceNumber` on a reported payment matches the expected VietQR pattern (`{unit}_{type}_{period}`, e.g., `501_RENT_202604`), display a green "Auto-matched" badge on the row. Matching uses a **fuzzy regex** that strips common prefixes/suffixes (`p`, `#`, spaces) and normalizes separators (`-`, `.`, `_`) before comparing against the expected reference. This tolerates typical resident typos (e.g., `p501_RENT_202604`, `501-rent-202604`). Matching is done client-side. No backend change needed.

### D6: Partial Payment Explicit Flow

**Decision**: When admin confirms a payment where `actualAmount < schedule.expectedAmount`, show a confirmation step: "This is a partial payment (₫X of ₫Y). The remaining ₫Z will stay outstanding." The schedule status becomes `partially_paid` (already supported in schema). The existing `actualAmount` field in the verify DTO handles this — no schema change needed.

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| Historical invoices with mixed line items become harder to report on | Backfill migration tags them as `property`; dashboard queries filter by `invoice_stream` |
| Removing milestone from bulk generate means admins must create them manually | Contract payment schedule system already handles milestone creation; add a reminder/alert when a milestone due date approaches |
| Inline confirm without dialog may cause accidental approvals | Add an undo toast (10-second window) after inline confirm; "Recently Processed" in History tab as fallback |
| Rejection notifications not sent (Communication Hub not built) | WebSocket `payment:rejected` event + in-app toast as interim |

## Migration Plan

1. **Schema migration**: Add `invoice_stream` enum + column (nullable, default `operational`)
2. **Data backfill**: UPDATE invoices SET `invoice_stream = 'property'` WHERE id IN (SELECT invoice_id FROM invoice_line_items WHERE category IN ('milestone', 'installment')) OR total_amount > 100,000,000 (heuristic: invoices over 100M VND are likely property payments; script logs all auto-tagged rows for manual review)
3. **Backend changes**: Filter bulk generate to operational-only categories; update invoice list API to accept `stream` query param
4. **Frontend changes**: Update Bulk Generate dialog, Invoices page filters, Pending Payments table
5. **No rollback risk**: Column addition is backward-compatible; removal of milestone from bulk generate doesn't delete data

## Open Questions

1. Should **rent** remain in the bulk-generated operational invoice, or should it also move to `contract_payment_schedules`? Current decision: keep rent in invoices since it's a monthly recurring operational charge, aligned with BQL accounting practice.
2. Should the "Auto-matched" badge auto-confirm without admin review? Current decision: No — always require human confirmation for audit compliance.
