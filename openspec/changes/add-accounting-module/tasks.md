## 1. Data Model & Foundation (accounting-data-model)

- [x] 1.1 Add new enums to Prisma schema: `AccountingRole`, `JournalEntryStatus`, `VoucherType`, `MovementType`, `WorkOrderStatus`, `PayrollStatus`, `DepreciationMethod`, `AssetStatus`, `VatType`, `ReminderLevel`, `AdvancePaymentStatus`
- [x] 1.2 Extend `UserRole` enum with `portfolio_admin`, `accountant`, `maintenance_staff`
- [x] 1.3 Add Prisma models: `ManagementBoard` (include `fiscalYearStartMonth` field, default 1 — supports non-calendar fiscal years common in VN), `Investor`, `LedgerAccount`, `JournalEntry`, `AccountingTransaction`
- [x] 1.4 Add Prisma models: `Voucher` (cash receipt/disbursement)
- [x] 1.5 Add Prisma models: `InventoryItem`, `InventoryMovement`
- [x] 1.6 Add Prisma models: `PayrollRecord`, `SalarySlip`
- [x] 1.7 Add Prisma models: `MaintenanceWorkOrder`, `MaintenanceCost`
- [x] 1.8 Add Prisma model: `ReportCache`
- [x] 1.9 Add Prisma models: `FixedAsset`, `DepreciationSchedule` (TK 211/214)
- [x] 1.10 Add Prisma model: `BadDebtProvision` (TK 139)
- [x] 1.11 Add Prisma model: `DynamicReportTemplate` (JSON query config, saved templates)
- [x] 1.12 Add Prisma model: `VatRecord` (VAT input TK 133, output TK 333, with invoice ref)
- [x] 1.13 Add Prisma model: `MaintenanceFundContribution` (per-apartment 2% tracking)
- [x] 1.14 Add Prisma model: `AdvancePayment` (TK 141 — employee advance tracking with settlement workflow)
- [x] 1.15 Add Prisma model: `DebtReminderLog` (multi-level reminder tracking per apartment)
- [x] 1.16 Add Prisma model: `Vendor` (contractor/supplier with payment terms, tax code, bank details)
- [x] 1.17 Add relation from `Building` → `ManagementBoard`
- [x] 1.18 Run `prisma migrate dev` and verify migration applies cleanly
- [x] 1.19 Add new entity types and enums to `packages/shared-types`
- [x] 1.20 Create `ManagementBoardModule` with CRUD controller/service/DTOs + Swagger (include fiscal year configuration endpoint)
- [x] 1.21 Create `InvestorModule` with CRUD controller/service/DTOs + Swagger
- [x] 1.22 Create `VendorModule` with CRUD controller/service/DTOs + Swagger
- [x] 1.23 Implement Prisma middleware for tenant isolation (`buildingId`/`managementBoardId` scoping)
- [x] 1.24 Seed accounting-specific permissions into `Permission`/`RolePermission` tables
- [x] 1.25 Unit tests: ManagementBoard CRUD, Vendor CRUD, tenant isolation middleware, fiscal year config

## 2. Double-Entry Bookkeeping Engine (accounting-double-entry)

- [x] 2.1 Create `AccountingModule` (core) with `ChartOfAccountsService`
- [x] 2.2 Implement chart of accounts seeding (VN TT200/133 standard accounts)
- [x] 2.3 Implement `LedgerAccountController` — list, get, create sub-account + Swagger
- [x] 2.4 Create `JournalEntryService` — create (draft), validate balance, post (immutable), reverse
- [x] 2.5 Create `JournalEntryController` — CRUD + post/reverse endpoints + Swagger
- [x] 2.6 Implement auto-generated sequential entry numbers per building
- [x] 2.7 Implement `VoucherService` — cash receipt (PT) and disbursement (PC) with voucher numbering
- [x] 2.8 Implement `VoucherController` + Swagger
- [x] 2.9 Implement bank transfer recording service
- [x] 2.10 Implement auto-posting: source document → draft JournalEntry + AccountingTransaction link
- [x] 2.11 Implement **adjustment/correcting entries** (bút toán điều chỉnh) — reversing + correcting entry pair for post-posting corrections
- [x] 2.12 Implement **VAT input/output tracking** (TK 133/333) — VatRecord creation on applicable transactions with invoice reference
- [x] 2.13 Implement **maintenance fund cross-fund validation** in `JournalEntryService` — reject journal entries that debit maintenance fund accounts (TK 341 sub-accounts) for operating expense purposes; enforce at validation layer before posting
- [x] 2.14 Implement **fiscal-year-aware period management** — derive fiscal periods from `ManagementBoard.fiscalYearStartMonth`, use in period locking and year-end closing
- [x] 2.15 Add AuditLog integration for journal entry create/post/reverse/adjust
- [x] 2.16 Unit tests: balanced entry validation, post immutability, reversal logic, adjustment entries, VAT calculations, **maintenance fund cross-fund rejection**, **fiscal year period derivation** (>70% coverage)

## 3. Monthly Billing Extension (accounting-monthly-billing)

- [ ] 3.1 Create `AccountingBillingModule`
- [ ] 3.2 Implement `BillGenerationService` — aggregate mgmt fees + utilities + parking + misc per apartment
- [ ] 3.3 Implement bill preview endpoint (dry-run without persistence)
- [ ] 3.4 Implement bill confirm-and-post endpoint (persist invoices + auto-post journal entries)
- [ ] 3.5 Create `BillGenerationProcessor` (BullMQ) for scheduled monthly runs
- [ ] 3.6 Implement receivables tracking per apartment (TK 131 balance queries) with **payment history** and **debt classification** (current/overdue/doubtful/provision-required)
- [ ] 3.7 Implement **receivable reconciliation** (biên bản đối chiếu công nợ) per apartment — generate reconciliation statement with opening balance, invoices, payments, closing balance
- [ ] 3.8 Implement late fee calculation (configurable, respects `lateFeeWaived`)
- [ ] 3.9 Implement **multi-level automated debt reminders** — BullMQ job with configurable escalation levels (Level 1: 15d, Level 2: 30d, Level 3: 60d, Level 4: 90d+) and DebtReminderLog tracking
- [ ] 3.10 Implement **advance payment management** (TK 141) — record, settle, track outstanding employee advances
- [ ] 3.11 Unit tests: bill calculation accuracy, VAT application, late fee logic, debt classification, reminder escalation (>70% coverage)

## 4. Operations — Inventory (accounting-operations)

- [ ] 4.1 Create `InventoryModule` with controller/service/DTOs
- [ ] 4.2 Implement InventoryItem CRUD + Swagger
- [ ] 4.3 Implement InventoryMovement (in/out/adjustment) with stock validation
- [ ] 4.4 Auto-post journal entries from inventory movements (TK 152)
- [ ] 4.5 Unit tests: stock level calculations, reject over-issue

## 5. Operations — Payroll (accounting-operations)

- [ ] 5.1 Create `PayrollModule` with controller/service/DTOs
- [ ] 5.2 Implement PayrollRecord CRUD (generate/draft/post) + Swagger
- [ ] 5.3 Implement SalarySlip generation with BHXH and TNCN calculations per VN law
- [ ] 5.4 Auto-post journal entries from payroll (TK 642/334/338)
- [ ] 5.5 Unit tests: BHXH rates, TNCN progressive tax brackets, payroll totals

## 6. Operations — Maintenance Costs (accounting-operations)

- [ ] 6.1 Create `MaintenanceCostModule` with controller/service/DTOs
- [ ] 6.2 Implement MaintenanceWorkOrder CRUD + status workflow + Swagger
- [ ] 6.3 Implement MaintenanceCost recording linked to work orders
- [ ] 6.4 Auto-post journal entries from maintenance costs (TK 627/642 → TK 111/112/331)
- [ ] 6.5 Unit tests: cost aggregation, journal entry accuracy

## 7. Operations — Fixed Assets (accounting-operations)

- [ ] 7.1 Create `FixedAssetsModule` with controller/service/DTOs
- [ ] 7.2 Implement FixedAsset CRUD (register, dispose, transfer) + Swagger
- [ ] 7.3 Implement DepreciationSchedule calculation — straight-line and declining balance methods per VN law
- [ ] 7.4 Implement monthly depreciation BullMQ job (auto-post TK 214 credit, TK 627/642 debit)
- [ ] 7.5 Implement Fixed Asset Register report (listing all assets with acquisition value, accumulated depreciation, net book value)
- [ ] 7.6 Unit tests: depreciation calculations, asset lifecycle (acquire/depreciate/dispose)

## 8. Operations — Bad Debt Provisioning (accounting-operations)

- [ ] 8.1 Implement `BadDebtProvisionService` — age-based and individual assessment methods
- [ ] 8.2 Implement quarterly bad debt provision calculation BullMQ job (TK 642 debit, TK 139 credit)
- [ ] 8.3 Implement bad debt write-off workflow (TK 139 debit, TK 131 credit)
- [ ] 8.4 Implement bad debt provision report (provisioned amounts by apartment, aging category)
- [ ] 8.5 Unit tests: provision calculations, write-off accuracy

## 9. Accounting Books — Output 1 (accounting-books)

- [ ] 9.1 Create `AccountingBooksModule` with controller/service
- [ ] 9.2 Implement General Journal query (filtered by period/building/account) + Swagger
- [ ] 9.3 Implement General Ledger query per account (opening/closing balance, running balance)
- [ ] 9.4 Implement **Detailed General Ledger** (Sổ cái chi tiết) — per account with counterpart account codes visibility, cross-reference navigation
- [ ] 9.5 Implement Cash Book (TK 111) and Bank Book (TK 112) queries
- [ ] 9.6 Implement sub-ledger queries: Receivables (TK 131) with **payment history, debt classification, and reconciliation statement generation**
- [ ] 9.7 Implement sub-ledger queries: Payables (TK 331) with **aging by vendor, payment terms tracking**
- [ ] 9.8 Implement sub-ledger queries: Inventory (TK 152), Payroll (TK 334)
- [ ] 9.9 Implement **Advance Payment Book** (Sổ theo dõi tạm ứng — TK 141) — per-employee advance tracking with settlement history
- [ ] 9.10 Implement Operating Fund and Maintenance Fund separate book queries
- [ ] 9.11 Implement **Fund-Specific Detailed Books** (Sổ quỹ chi tiết) — per-fund cash/expense detail with running fund balance
- [ ] 9.12 Implement **Purchase and Sales Journal** (Sổ nhật ký mua bán) — all purchases and sales chronologically with VAT detail
- [ ] 9.13 Implement **Revenue Detail by Fee Category** (Sổ chi tiết doanh thu) — revenue breakdown by management fee, parking, electricity, water, late fees, other
- [ ] 9.14 Implement **Fixed Asset Register** (Sổ TSCĐ) — listing by asset category, acquisition date, depreciation status, net book value
- [ ] 9.15 Implement **VAT Input/Output Ledger** (Sổ theo dõi thuế GTGT) — TK 133 input and TK 333 output with invoice references
- [ ] 9.16 Implement **Capital Source Summary Book** (Sổ tổng hợp nguồn vốn) — equity, retained earnings, fund balances with period-over-period changes
- [ ] 9.17 Implement **Maintenance Fund Settlement Report** (Báo cáo quyết toán quỹ bảo trì) per Bộ Xây dựng — per-apartment 2% tracking, expenditures, compliance status, regulatory PDF export
- [ ] 9.18 Implement PDF export (Vietnamese Bộ Tài chính template format) using pdf-lib
- [ ] 9.19 Implement Excel export using exceljs
- [ ] 9.20 Unit tests: balance accuracy, cross-book consistency (General Ledger TK 111 = Cash Book closing, TK 131 = Receivables sub-ledger totals)

## 10. Accounting Reports — Output 2 (accounting-reports)

- [ ] 10.1 Create `AccountingReportsModule` with controller/service
- [ ] 10.2 Implement `ReportCacheService` — cache read/write, invalidation, BullMQ scheduled refresh
- [ ] 10.3 Implement Balance Sheet report (Mẫu B01-DN — assets/liabilities/equity per VAS)
- [ ] 10.4 Implement Income Statement report (Mẫu B02-DN — revenue/expenses/net per VAS)
- [ ] 10.5 Implement Cash Flow Statement report (Mẫu B03-DN — operating/investing/financing)
- [ ] 10.6 Implement Operating Fund report (itemized income/expenses)
- [ ] 10.7 Implement Maintenance Fund report (2% compliance per Bộ Xây dựng, **per-apartment detail**)
- [ ] 10.8 Implement Aging Report (receivables by apartment with **extended buckets**: current/1-30d/31-60d/61-90d/91-180d/181-360d/360d+, **debt classification**)
- [ ] 10.9 Implement **Receivable Reconciliation Report** (biên bản đối chiếu công nợ) — per-apartment and batch generation with PDF export for resident sign-off
- [ ] 10.10 Implement **Payables Aging Report** — vendor/contractor payables by overdue bucket (current/1-30d/31-60d/61-90d/90d+) with payment urgency flags
- [ ] 10.11 Implement **Multi-level Debt Reminder Report** — reminder status dashboard by escalation level with next action dates
- [ ] 10.12 Implement Bill Payment Rate report
- [ ] 10.13 Implement Maintenance Cost by Category report
- [ ] 10.14 Implement Payroll Summary report
- [ ] 10.15 Implement Utility Consumption report with anomaly detection (>30% increase flag)
- [ ] 10.16 Implement Budget vs. Actual comparison report
- [ ] 10.17 Implement Overdue Debt and Reminder report
- [ ] 10.18 Implement report PDF/Excel export
- [ ] 10.19 Performance test: verify all cached reports return within 2 seconds
- [ ] 10.20 Implement **Dynamic Report Builder** — API cho phép filter linh hoạt + aggregation theo nhiều chiều: building/floor/unit-type/period/account/category/contractor
- [ ] 10.21 Implement **Dynamic Report Template CRUD** — save, load, share report configurations (JSON templates) per ManagementBoard
- [ ] 10.22 Implement **Peak Season Analysis** report — tháng cao điểm thu tiền, tỷ lệ thanh toán theo tháng
- [ ] 10.23 Implement **Floor-wise / Tower-wise revenue breakdown** — doanh thu phí quản lý theo tầng, theo tòa
- [ ] 10.24 Implement **Maintenance Fund per-apartment tracking** report — 2% allocation per apartment value, contributions received, usage, remaining balance
- [ ] 10.25 Implement **Year-end Financial Statement Package** — combined B01/B02/B03 + thuyết minh BCTC for annual audit
- [ ] 10.26 Implement **Occupancy Rate Impact** report — occupancy rate vs management fee revenue correlation by building/period
- [ ] 10.27 Implement **Bad Debt Provision Summary** report — provisioned amounts, write-offs, recovery by period
- [ ] 10.28 Implement **Fixed Asset Depreciation Summary** report — assets by category, monthly depreciation, net book values
- [ ] 10.29 Implement **Revenue vs Expense 12-month Comparison** chart report — by building, by fund

## 11. Integrations (accounting-integrations)

- [ ] 11.1 Create `AccountingIntegrationsModule`
- [ ] 11.2 Implement e-invoice provider adapter (abstract interface + one provider implementation)
- [ ] 11.3 Implement e-invoice BullMQ job with retry and dead-letter queue
- [ ] 11.4 Implement CSV/Excel import endpoint for utility readings + validation
- [ ] 11.5 Implement import template download (pre-filled apartment codes)
- [ ] 11.6 Implement bill notification job (BullMQ) — email, SMS, Zalo OA channels
- [ ] 11.7 Implement **multi-level overdue reminder** notification job — configurable escalation (Level 1-4), DebtReminderLog tracking, escalation checks
- [ ] 11.8 Implement `GET /api/accounting/invoices/{id}/payment-qr` (VietQR format)
- [ ] 11.9 Implement `GET /api/accounting/invoices/{id}/receipt` (PDF receipt)
- [ ] 11.10 Unit tests: CSV parsing, QR generation, receipt PDF content

## 12. Frontend — Accounting Pages

- [ ] 12.1 Create accounting layout and navigation under `(dashboard)/accounting/`
- [ ] 12.2 Accounting Dashboard page (KPI cards + Recharts trend charts) — **optimized for daily kế toán trưởng workflow**
- [ ] 12.3 Voucher forms (Phiếu thu/Phiếu chi) — React Hook Form + Zod + Shadcn/UI, **keyboard shortcut for quick entry**
- [ ] 12.4 Journal entry listing and detail pages with TanStack Table
- [ ] 12.5 Chart of accounts tree view
- [ ] 12.6 Books listing pages (General Journal, Ledger, Cash Book, etc.) with filters + export buttons
- [ ] 12.7 Reports pages with filter controls and Recharts visualizations
- [ ] 12.8 **Dynamic Report Builder UI** — drag-and-drop dimensions/measures, filter panel, preview, save as template
- [ ] 12.9 Inventory management pages (items + movements)
- [ ] 12.10 Payroll management pages (monthly generation + salary slips)
- [ ] 12.11 Maintenance work order + cost pages
- [ ] 12.12 **Fixed Asset management pages** (register, depreciation schedule view)
- [ ] 12.13 CSV import page with drag-and-drop upload
- [ ] 12.14 Management Board admin page (includes **fiscal year configuration**)
- [ ] 12.15 **Year-end closing workflow page** (preview, approve, execute with progress indicator)
- [ ] 12.16 **Maintenance Fund per-apartment tracking page** (2% contribution status per apartment)
- [ ] 12.17 **VAT summary page** (input/output by period, declaration readiness check)
- [ ] 12.18 **Receivable reconciliation page** — generate, preview, export reconciliation statements per apartment or batch
- [ ] 12.19 **Debt reminder management page** — view reminder history per apartment, configure escalation levels, manual escalation trigger
- [ ] 12.20 **Vendor/Contractor management page** — CRUD, payables summary per vendor
- [ ] 12.21 **Advance payment tracking page** — record advances, settle, view outstanding per employee
- [ ] 12.22 Skeleton loaders for all async sections (CLS = 0)
- [ ] 12.23 Framer Motion page transitions and list animations
- [ ] 12.24 Responsive design validation (mobile + desktop)
- [ ] 12.25 **Batch operations UI** — multi-select vouchers for bulk posting, bulk journal entry posting
- [ ] 12.26 **Favorites & recent items** — quick access to frequently used reports/books for daily workflow

## 13. Testing & Validation

- [ ] 13.1 E2E test: Create ManagementBoard → add buildings → input transactions → verify books & reports
- [ ] 13.2 E2E test: Monthly bill generation flow (meter readings → bill preview → confirm → payment → receipt)
- [ ] 13.3 Multi-tenant isolation test: Board A accountant cannot see Board B data
- [ ] 13.4 Portfolio admin cross-board access test
- [ ] 13.5 Performance test: reports with 1000+ journal entries render < 2s
- [ ] 13.6 Verify Swagger docs complete for all new endpoints
- [ ] 13.7 E2E test: Year-end closing flow (preview → approve → execute → verify carry-forward) with **non-calendar fiscal year** scenario
- [ ] 13.8 E2E test: Maintenance Fund isolation — **verify journal entry rejection** when attempting to debit maintenance fund for operating expenses
- [ ] 13.9 E2E test: Fixed asset lifecycle (acquire → depreciate monthly → dispose → verify journal entries)
- [ ] 13.10 E2E test: Multi-level debt reminder escalation (overdue → Level 1 → Level 2 → Level 3 → Level 4)
- [ ] 13.11 E2E test: Receivable reconciliation generation and export for apartment
- [ ] 13.12 E2E test: Advance payment workflow (advance → partial settlement → return remainder → fully settled)
- [ ] 13.13 E2E test: Payables aging accuracy against vendor payment terms

## 14. Compliance & Year-end (accounting-compliance)

- [ ] 14.1 Implement **Fiscal Year configuration** — derive fiscal year start/end from `ManagementBoard.fiscalYearStartMonth`, support non-calendar fiscal years (e.g., April–March), propagate to all period-dependent operations (closing, reports, period locking)
- [ ] 14.2 Implement **Year-end closing workflow** — validate all entries posted, generate closing entries (TK 511/632/642 → TK 911 → TK 421), carry forward balances, lock closed period — **respects configured fiscal year boundaries**
- [ ] 14.3 Implement year-end closing dry-run/preview (show what entries will be generated without committing)
- [ ] 14.4 Implement **HTKK XML export** for VAT tax declaration — generate XML per Vietnamese tax authority format
- [ ] 14.5 Implement **Maintenance Fund compliance report** per Bộ Xây dựng — per-apartment 2% contribution tracking, regulatory compliance checklist
- [ ] 14.6 Implement **closed period enforcement** — reject journal entry creation/posting in closed fiscal periods (fiscal-year-aware)
- [ ] 14.7 Implement **financial statement notes** (Thuyết minh BCTC) — auto-generated notes referencing VAS disclosures
- [ ] 14.8 Unit tests: year-end closing accuracy, period locking, HTKK XML format validation, **fiscal year boundary calculations**, **cross-fund validation enforcement**

### Dependencies
- Tasks 1.x MUST complete before all other tasks (data model is foundation)
- Tasks 2.x MUST complete before 3.x, 9.x, 10.x, 14.x (journal engine required)
- Tasks 3.x depends on 2.x (billing integration uses journal engine)
- Tasks 3.9 (debt reminders) depends on 3.6 (receivables tracking)
- Tasks 4.x, 5.x, 6.x, 7.x, 8.x can run in parallel after 2.x
- Tasks 9.x depends on 2.x + 3.x (books need journal data + receivables)
- Tasks 10.x depends on 9.x (reports aggregate book data)
- Tasks 10.20-10.21 (Dynamic Report Builder) can start after 2.x (query engine over journal data)
- Tasks 11.x can start after 3.x (billing integration needed)
- Tasks 12.x can start incrementally as backend endpoints complete
- Tasks 13.x run after all backend tasks complete
- Tasks 14.x depends on 2.x + 10.x (closing needs journal engine + report infrastructure)
