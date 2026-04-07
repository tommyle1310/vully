# Overhaul Billing & Invoicing — Tasks

## Phase 1: Critical Bug Fixes (Authorization + Data Flow)

- [x] **1.1** Fix `payment-schedule.controller.ts` auth: replace all `user.role === 'admin'` with `user.roles?.includes('admin')` across all methods that do manual role checks (`findSchedulesByContract`, `getFinancialSummary`, `generateRentSchedule`, `generatePurchaseMilestones`)
- [x] **1.2** Verify admin can access `GET /contracts/:id/payment-schedules` and `GET /contracts/:id/financial-summary` (manual test or e2e)
- [ ] **1.3** Wire up `PaymentGeneratorService.updateOverdueStatuses()` — call on `billing.module.ts` `onModuleInit()` and optionally via a daily cron job

## Phase 2: Database Migration

- [x] **2.1** Create Prisma migration: add `category VARCHAR(50)`, `vat_rate DECIMAL(5,4) DEFAULT 0`, `vat_amount DECIMAL(12,2) DEFAULT 0`, `environment_fee DECIMAL(12,2) DEFAULT 0` to `invoice_line_items`
- [x] **2.2** Backfill existing `invoice_line_items`: set `category = 'utility'` where `utility_type_id IS NOT NULL`, else `category = 'rent'`
- [x] **2.3** Update Prisma schema and run `prisma generate`

## Phase 3: Invoice Calculator Rewrite (Backend)

- [x] **3.1** Refactor `invoice-calculator.service.ts` — extract category-specific builders:
  - `buildRentLineItem()` — add VAT calculation (10%)
  - `buildInstallmentLineItem()` — for lease-to-own (principal + interest + VAT on interest)
  - `buildMilestoneLineItem()` — for purchase (check payment_schedules due in period)
  - `buildManagementFeeLineItem()` — query `management_fee_configs` by building, compute area × rate + VAT
- [x] **3.2** Fix `buildUtilityLineItems()`:
  - Resolve utility type codes (e.g., `'electric'`) to `utility_type_id` via `utility_types` table lookup
  - Query `meter_readings` by `apartment_id + billing_period + utility_type_id`
  - Add environment fee (10%) for water and gas
  - Set `vat_rate = 0` for electricity (thu hộ), `vat_rate = 0.08` for gas
- [x] **3.3** Fix `calculateTieredAmount()` — rewrite to process tiers sequentially (consume from each tier until total consumption exhausted)
- [x] **3.4** Update `calculateInvoice()` main method:
  - Accept contract type to determine which line items to build
  - For purchase: query `contract_payment_schedules` for milestones due in billing period
  - Don't throw if only some categories have no data; only error if zero line items total
  - Calculate `subtotal` (sum of pre-tax amounts), `tax_amount` (sum of vat_amount), `total` = subtotal + tax
- [x] **3.5** Add payment reference code generation: `{UNIT}_{TYPE}_{PERIOD}` (e.g., `A101_RENT_052026`)

## Phase 4: Billing Processor Fix (Backend)

- [x] **4.1** Update `billing.processor.ts` to include `purchase` contracts in the query (currently only `rental` and `lease_to_own`)
- [x] **4.2** For purchase contracts: only create invoice if there are milestones due OR utility/management items exist
- [x] **4.3** Pass `contract_type` to `InvoiceCalculatorService.calculateInvoice()` so it knows which line item builders to call
- [x] **4.4** Update `billing-queue.service.ts` to track counts by contract type in `errorLog` (createdByType: { rental: N, purchase: N, lease_to_own: N })
- [x] **4.5** Remove the `throw BadRequestException('Purchase contracts use payment schedules')` from `invoices.service.ts` — purchase contracts now get invoices too

## Phase 5: VietQR Backend (Mock Adapter)

- [x] **5.1** Create `apps/api/src/modules/billing/vietqr.service.ts` with Strategy pattern:
  - `IPaymentQRAdapter` interface: `generateQR(invoiceId, amount, reference) → { qrImageUrl, bankId, accountNo, amount, addInfo }`
  - `VietQRAdapter`: builds `https://img.vietqr.io/image/{BANK_ID}-{ACCOUNT_NO}-{TEMPLATE}.png?amount=...&addInfo=...`
  - `MockQRAdapter`: returns placeholder URL
  - Service reads `PAYMENT_GATEWAY` env to select adapter
- [x] **5.2** Add `GET /invoices/:id/payment-qr` endpoint to `invoices.controller.ts`
  - Roles: `admin`, `resident` (resident must own the invoice's contract)
  - Returns 400 if invoice is already paid/cancelled
- [x] **5.3** Add env variables to `.env.example`: `PAYMENT_GATEWAY`, `VIETQR_BANK_ID`, `VIETQR_ACCOUNT_NO`, `VIETQR_ACCOUNT_NAME`, `VIETQR_TEMPLATE`
- [x] **5.4** Register VietQR service in `billing.module.ts`

## Phase 6: DTO & Mapper Updates (Backend)

- [x] **6.1** Update `invoice.dto.ts`:
  - Add `category`, `vatRate`, `vatAmount`, `environmentFee` to `InvoiceLineItemDto`
  - Add `paymentReference` to `InvoiceResponseDto`
  - Add VietQR response DTO
- [x] **6.2** Update `invoices.mapper.ts` to map new fields
- [ ] **6.3** Update `payment.dto.ts` — ensure `ContractFinancialSummaryDto` calculates correct duration for rental contracts

## Phase 7: Backend Tests

- [x] **7.1** Update `billing.processor.spec.ts` — test all 3 contract types, verify purchase milestones are checked
- [ ] **7.2** Update `invoices.service.spec.ts` — test utility line item creation, management fee calculation, VAT separation
- [x] **7.3** Add unit tests for `calculateTieredAmount()` with Vietnamese EVN electricity tiers
- [x] **7.4** Add unit test for lease-to-own installment calculation (principal + interest)
- [x] **7.5** Add unit test for VietQR URL generation (correct encoding of amount and reference)
- [ ] **7.6** Test authorization: admin can access financial-summary, resident blocked from other's data

## Phase 8: Frontend — RecordPaymentDialog Fix

- [x] **8.1** Add `max-h-[85dvh] overflow-y-auto` to `DialogContent` in `RecordPaymentDialog.tsx`
- [x] **8.2** Replace native `<input type="date">` with Shadcn `DatePicker` component (use `Popover + Calendar` pattern from `contract-form-dialog.tsx`)
- [x] **8.3** Add role-based payment method filtering:
  - Get user role from `useAuthStore()`
  - If resident: filter to `bank_transfer` and `cash` only
  - If admin/technician: show all methods
- [x] **8.4** Create `VietQRDisplay` component (`components/payments/VietQRDisplay.tsx`):
  - Props: `invoiceId`, `amount`, `reference`
  - Calls `GET /invoices/:id/payment-qr` to get QR URL
  - Displays QR image with amount and reference text below
  - Shows "(Mock)" label when `PAYMENT_GATEWAY=mock`
- [x] **8.5** In RecordPaymentDialog: when payment method is `bank_transfer` and user is resident, show `VietQRDisplay` below the method selector
- [x] **8.6** Add `usePaymentQR(invoiceId)` hook to `use-billing.ts`

## Phase 9: Frontend — Payment Schedule Table Fix

- [x] **9.1** Enable "Edit Schedule" dropdown item for admin users (remove hardcoded `disabled`)
- [x] **9.2** Create `EditPaymentScheduleDialog` component with form for `periodLabel`, `dueDate`, `expectedAmount`, `status`, `notes`
- [x] **9.3** Fix "Add Entry" button state — should be enabled whenever the user is admin (not dependent on schedule count or deletion state)
- [x] **9.4** After `useDeletePaymentSchedule` mutation succeeds, ensure query invalidation triggers re-render that enables Add Entry
- [x] **9.5** Add role checks: hide delete/edit/add for non-admin users, show only "Record Payment" for residents on their own schedules

## Phase 10: Frontend — Invoice Detail Sheet Enhancement

- [x] **10.1** Group line items by `category` in the invoice detail sheet
- [x] **10.2** Add rent section: show base rent, VAT rate, VAT amount, net rent, payment reference
- [x] **10.3** Add utility section: show per-utility details (meter ID, previous/current reading, consumption, tier breakdown, env fee)
- [x] **10.4** Add management fee section: show area, rate per m², included services, VAT
- [x] **10.5** Add installment section (lease-to-own): show installment number, principal, interest, remaining principal
- [x] **10.6** Add milestone section (purchase): show milestone name, % of contract, contract value
- [x] **10.7** Update totals section: show subtotal, total VAT, grand total separately
- [x] **10.8** Show payment reference code prominently for bank transfer reconciliation

## Phase 11: Frontend — Bulk Generate Dialog Fix

- [x] **11.1** Fix category matching: ensure utility type codes from the API match what's sent to the bulk generate endpoint
- [x] **11.2** Show "Management Fee" as an always-present category option (in addition to rent + utility types)
- [x] **11.3** Update job summary display to show counts by contract type (rental, purchase, lease-to-own)
- [x] **11.4** Improve error log display: show human-readable messages for each failed contract

## Phase 12: Frontend — Contract Detail Page

- [x] **12.1** Ensure admin users can view payment schedules and financial summary (no 403 after backend fix)
- [x] **12.2** Add VietQR display option in the financial summary card for pending payments (link to invoice QR)

## Phase 13: Integration Testing

- [ ] **13.1** Test end-to-end: create contracts (all 3 types), add meter readings, generate invoices, verify line items
- [ ] **13.2** Test: admin can view/edit/delete payment schedules for any contract
- [ ] **13.3** Test: resident sees limited payment methods and VietQR on bank transfer
- [ ] **13.4** Test: bulk generate creates correct invoices for mixed contract types in same building
- [ ] **13.5** Test: invoice detail sheet renders correctly for each contract type
