## 1. Schema & Data Migration (Billing Stream Separation)

- [ ] 1.1 Add `InvoiceStream` enum (`operational`, `property`) to Prisma schema
- [ ] 1.2 Add `invoice_stream` column (nullable, default `operational`) to `invoices` table
- [ ] 1.3 Add `PaymentRejectionReason` enum to Prisma schema (`insufficient_amount`, `wrong_reference`, `blurry_receipt`, `duplicate_payment`, `expired_receipt`, `other`)
- [ ] 1.4 Add `rejection_reason` column (nullable) to `contract_payments` table
- [ ] 1.5 Create Prisma migration and apply
- [ ] 1.6 Write and run data backfill: tag invoices containing milestone/installment line items OR total_amount > 100M VND as `property`, all others as `operational`; log all auto-tagged rows for manual review
- [ ] 1.7 Verify: query `SELECT invoice_stream, COUNT(*) FROM invoices GROUP BY invoice_stream` shows correct distribution

## 2. Backend — Remove Property Payments from Bulk Generate

- [ ] 2.1 Update `InvoiceCalculatorService` to skip `milestone` and `installment` categories during bulk generation
- [ ] 2.2 Update `BillingProcessor` to set `invoice_stream = 'operational'` on newly created invoices
- [ ] 2.3 Update `InvoicesService.findAll()` to accept optional `stream` query parameter and filter by `invoice_stream`
- [ ] 2.4 Update `InvoicesController` to expose `stream` query param in the list endpoint with Swagger docs
- [ ] 2.5 Write unit tests: bulk generate with purchase contract does NOT produce milestone line items
- [ ] 2.6 Write unit tests: invoice list filters by `stream` correctly

## 3. Backend — Structured Rejection Reasons

- [ ] 3.1 Update `VerifyPaymentDto` to include optional `rejectionReason` field (enum); when reason is `other`, `notes` becomes required
- [ ] 3.2 Update `VerifyInvoicePaymentDto` to include optional `rejectionReason` field (enum); when reason is `other`, `notes` becomes required
- [ ] 3.3 Update `PaymentScheduleService.verifyPayment()` to store `rejection_reason` on the payment record
- [ ] 3.4 Update `InvoicesService.verifyInvoicePayment()` to store rejection reason in `priceSnapshot.rejectedPayment`
- [ ] 3.5 Emit WebSocket event `payment:rejected` to resident room on rejection (via `IncidentsGateway` or new `PaymentsGateway`)
- [ ] 3.6 Write unit tests: rejection stores reason and emits WebSocket event

## 4. Frontend — Bulk Generate Dialog Cleanup

- [ ] 4.1 Remove `milestone` and `installment` from `BASE_CATEGORIES` in `bulk-generate-dialog.tsx`
- [ ] 4.2 Update dialog description text to clarify "operational/service fees only"
- [ ] 4.3 Verify: dialog no longer shows property payment categories

## 5. Frontend — Invoices Page Filters

- [ ] 5.1 Add `stream` filter (Operational / Property / All) to the invoices page URL state via nuqs
- [ ] 5.2 Add category filter chips (Rent, Utilities, Management Fee, Parking, Trash) below the existing filter bar
- [ ] 5.3 Wire filters to the `useInvoices` hook query parameters
- [ ] 5.4 Update `InvoicesController` API call to pass `stream` and `categories` params
- [ ] 5.5 Verify: switching filters updates the displayed invoices correctly

## 6. Frontend — Inline Quick-Action Buttons (Pending Payments)

- [ ] 6.1 Add ✓ (Confirm) and ✗ (Reject) icon buttons in the Actions column of both Contract Payments and Invoice Payments tables
- [ ] 6.2 Implement inline confirm: calls verify API with reported amount, shows 10-second undo toast with revert capability
- [ ] 6.3 Implement inline reject: opens a compact Popover with rejection reason select + notes (mandatory for `other`), then calls verify API
- [ ] 6.4 Keep existing "Review" button for full dialog access
- [ ] 6.5 Verify: inline confirm/reject works, undo toast reverts confirmation

## 7. Frontend — Verification Dialog Enhancements

- [ ] 7.1 Add receipt image link/thumbnail to `VerifyInvoicePaymentDialog` (match `VerifyPaymentDialog` behavior)
- [ ] 7.2 Add structured rejection reason dropdown to both verify dialogs
- [ ] 7.3 Implement explicit partial payment confirmation step: show "Partial payment: ₫X of ₫Y, remaining ₫Z" warning when `actualAmount < expectedAmount`
- [ ] 7.4 Verify: partial payment sets schedule to `partially_paid`, full payment sets to `paid`

## 8. Frontend — Auto-Match Badge

- [ ] 8.1 Create `isAutoMatched(referenceNumber, contract/invoice)` utility function with fuzzy regex: strip prefixes (`p`, `#`), normalize separators (`-`/`.` → `_`), uppercase, then match pattern `{unit}_{type}_{period}`
- [ ] 8.2 Display green "Auto-matched" Badge next to reference number in pending payments table when matched
- [ ] 8.3 Verify: matching references show badge, non-matching references show plain text

## 9. Integration Testing & Validation

- [ ] 9.1 E2E: Bulk generate for a building with mixed contract types produces only operational invoices
- [ ] 9.2 E2E: Admin inline-confirms a payment, undo toast appears, payment list refreshes
- [ ] 9.3 E2E: Admin rejects with structured reason, resident receives WebSocket event
- [ ] 9.4 E2E: Partial payment confirmation flow shows warning and sets correct status
- [ ] 9.5 Verify invoice list filters by stream and category work correctly with pagination
