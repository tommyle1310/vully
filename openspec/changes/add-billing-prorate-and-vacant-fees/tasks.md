# Tasks: Add Billing Pro-Rate & Vacant Apartment Fees

## Phase 1: Database Migration (Schema Changes)

- [x] **1.1** Create Prisma migration: make `invoices.contract_id` nullable (`ALTER COLUMN contract_id DROP NOT NULL`)
- [x] **1.2** Add `apartment_id UUID REFERENCES apartments(id) ON DELETE CASCADE` to `invoices` table
- [x] **1.3** Add database CHECK constraint: `contract_id IS NOT NULL OR apartment_id IS NOT NULL`
- [x] **1.4** Create index on `invoices.apartment_id`
- [x] **1.5** Backfill `apartment_id` on existing invoices from their contract's `apartment_id`
- [x] **1.6** Update Prisma schema: make `contract_id` optional, add `apartment_id` relation to `apartments`
- [x] **1.7** Run `prisma generate` and verify no type errors

## Phase 2: Pro-Rate Management Fee (Backend)

- [x] **2.1** Update `buildManagementFeeLineItem()` signature to accept `contractStartDate?: Date` and `contractEndDate?: Date`
- [x] **2.2** Implement pro-rate factor calculation:
  - If `contractStartDate` is within billing period: `billableDays = endOfMonth - startDay + 1`
  - If `contractEndDate` is within billing period: `billableDays = endDay`
  - If both within period: `billableDays = endDay - startDay + 1`
  - Otherwise: factor = 1.0
- [x] **2.3** Apply pro-rate factor to management fee: `fee = area × ratePerSqm × proRateFactor`
- [x] **2.3a** Rounding rule: all pro-rated amounts MUST be rounded to nearest VND (`Math.round()`) per Vietnamese accounting standards — no fractional đồng
- [x] **2.4** Append "(Pro-rated: X/Y days)" to line item description when factor < 1.0
- [x] **2.5** Add pro-rate metadata to line item: `{ proRated, billableDays, totalDays, fullMonthAmount }`
- [x] **2.6** Update `calculateInvoice()` to fetch contract dates and pass them to management fee builder

## Phase 3: Vacant Apartment Billing (Backend)

- [x] **3.1** Create `VacantBillingService` (or extend `InvoicesService`) with method `generateVacantInvoice(apartmentId, buildingId, billingPeriod)`
  - Build management fee line item (full month, no pro-rate for vacant)
  - Build parking line items (if slots assigned)
  - Skip utilities and trash
  - Set `contract_id = null`, `apartment_id = apartmentId`
- [x] **3.2** Add vacant apartment query: find apartments where `status = 'vacant'` AND `owner_id IS NOT NULL` AND no active contract AND no existing invoice for the billing period
- [x] **3.3** Update `billing.processor.ts`: add Pass 2 after contract processing — iterate vacant apartments and generate invoices
- [x] **3.4** Update billing job tracking: add `vacant_count` to progress reporting
- [x] **3.5** Update `invoices.service.ts` `findAll()` to handle nullable `contract_id` — include apartment info when contract is null
- [x] **3.6** Update `InvoiceResponseDto` to include optional `apartment` data for vacant invoices
- [x] **3.7** VietQR payment reference for vacant invoices: use `{Unit_Number}_MGMT_{PERIOD}` format (e.g., `B205_MGMT_202604`) instead of contract-based reference so accounting can identify the unit immediately
- [x] **3.8** Owner notification: after generating vacant invoices, enqueue a notification (email/in-app) to the `owner_id` user, since owners of vacant units don't use the resident app regularly

## Phase 4: Backend Tests

- [x] **4.1** Unit test: pro-rate management fee for mid-month start (15/30 days)
- [x] **4.2** Unit test: pro-rate management fee for mid-month termination (20/30 days)
- [x] **4.3** Unit test: full-month management fee when contract spans entire period
- [x] **4.4** Unit test: vacant apartment gets management fee invoice
- [x] **4.5** Unit test: vacant apartment without owner is skipped
- [x] **4.6** Unit test: duplicate prevention for vacant invoices
- [x] **4.7** Unit test: vacant apartment with parking gets both line items
- [x] **4.8** Integration test: billing processor generates both contract and vacant invoices

## Phase 5: Frontend — Tier Breakdown Display

- [ ] **5.1** Update `InvoiceLineItem` TypeScript type to properly type `tierBreakdown` as `{ tiers?: Array<{ tier: number; qty: number; price: number; amount: number }>, flatRate?: boolean }`
- [ ] **5.2** Create `TierBreakdown` component: renders tier sub-rows under a utility line item
  - Each tier: "Tier N (range): qty × ₫price = ₫amount"
  - Environment fee sub-line (if > 0)
  - Use Shadcn `Collapsible` if > 3 tiers, otherwise always visible
- [ ] **5.3** Integrate `TierBreakdown` into the invoice detail sheet under utility line items
- [ ] **5.4** Format all amounts with Vietnamese currency formatting (₫, dot separators)

## Phase 6: Frontend — Pro-Rate & Vacant Display

- [ ] **6.1** Create `ProRateIndicator` component: shows "Pro-rated: X/Y days (full: ₫amount)" as a muted sub-line
- [ ] **6.2** Integrate `ProRateIndicator` into invoice detail sheet under management fee line item (when metadata.proRated is true)
- [ ] **6.3** Update invoices list table: handle rows where `contract_id` is null — show apartment unit number with "(Vacant)" badge
- [ ] **6.4** Add "Vacant" filter option to invoices list page (filter by `contract_id IS NULL`)

## Phase 7: Validation & Polish

- [ ] **7.1** Verify Swagger docs correctly reflect nullable `contract_id` and new `apartment_id` field
- [ ] **7.2** Test billing processor end-to-end: building with mix of occupied and vacant apartments
- [ ] **7.3** Verify no regressions in existing invoice generation flow (contract-based invoices unchanged)
- [ ] **7.4** Verify VietQR works for vacant-apartment invoices — confirm reference uses `{Unit_Number}_MGMT_{PERIOD}` format
- [ ] **7.5** Verify rounding: pro-rated amounts have no fractional đồng in DB, line items, and invoice totals
- [ ] **7.6** Verify owner notification is sent when vacant invoice is generated
