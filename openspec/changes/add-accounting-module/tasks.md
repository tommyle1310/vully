## 1. Data Model & Foundation (accounting-data-model)

- [ ] 1.1 Add new enums to Prisma schema: `AccountingRole`, `JournalEntryStatus`, `VoucherType`, `MovementType`, `WorkOrderStatus`, `PayrollStatus`
- [ ] 1.2 Extend `UserRole` enum with `portfolio_admin`, `accountant`, `maintenance_staff`
- [ ] 1.3 Add Prisma models: `ManagementBoard`, `Investor`, `LedgerAccount`, `JournalEntry`, `AccountingTransaction`
- [ ] 1.4 Add Prisma models: `Voucher` (cash receipt/disbursement)
- [ ] 1.5 Add Prisma models: `InventoryItem`, `InventoryMovement`
- [ ] 1.6 Add Prisma models: `PayrollRecord`, `SalarySlip`
- [ ] 1.7 Add Prisma models: `MaintenanceWorkOrder`, `MaintenanceCost`
- [ ] 1.8 Add Prisma model: `ReportCache`
- [ ] 1.9 Add relation from `Building` → `ManagementBoard`
- [ ] 1.10 Run `prisma migrate dev` and verify migration applies cleanly
- [ ] 1.11 Add new entity types and enums to `packages/shared-types`
- [ ] 1.12 Create `ManagementBoardModule` with CRUD controller/service/DTOs + Swagger
- [ ] 1.13 Create `InvestorModule` with CRUD controller/service/DTOs + Swagger
- [ ] 1.14 Implement Prisma middleware for tenant isolation (`buildingId`/`managementBoardId` scoping)
- [ ] 1.15 Seed accounting-specific permissions into `Permission`/`RolePermission` tables
- [ ] 1.16 Unit tests: ManagementBoard CRUD, tenant isolation middleware

## 2. Double-Entry Bookkeeping Engine (accounting-double-entry)

- [ ] 2.1 Create `AccountingModule` (core) with `ChartOfAccountsService`
- [ ] 2.2 Implement chart of accounts seeding (VN TT200/133 standard accounts)
- [ ] 2.3 Implement `LedgerAccountController` — list, get, create sub-account + Swagger
- [ ] 2.4 Create `JournalEntryService` — create (draft), validate balance, post (immutable), reverse
- [ ] 2.5 Create `JournalEntryController` — CRUD + post/reverse endpoints + Swagger
- [ ] 2.6 Implement auto-generated sequential entry numbers per building
- [ ] 2.7 Implement `VoucherService` — cash receipt (PT) and disbursement (PC) with voucher numbering
- [ ] 2.8 Implement `VoucherController` + Swagger
- [ ] 2.9 Implement bank transfer recording service
- [ ] 2.10 Implement auto-posting: source document → draft JournalEntry + AccountingTransaction link
- [ ] 2.11 Add AuditLog integration for journal entry create/post/reverse
- [ ] 2.12 Unit tests: balanced entry validation, post immutability, reversal logic (>70% coverage)

## 3. Monthly Billing Extension (accounting-monthly-billing)

- [ ] 3.1 Create `AccountingBillingModule`
- [ ] 3.2 Implement `BillGenerationService` — aggregate mgmt fees + utilities + parking + misc per apartment
- [ ] 3.3 Implement bill preview endpoint (dry-run without persistence)
- [ ] 3.4 Implement bill confirm-and-post endpoint (persist invoices + auto-post journal entries)
- [ ] 3.5 Create `BillGenerationProcessor` (BullMQ) for scheduled monthly runs
- [ ] 3.6 Implement receivables tracking per apartment (TK 131 balance queries)
- [ ] 3.7 Implement late fee calculation (configurable, respects `lateFeeWaived`)
- [ ] 3.8 Unit tests: bill calculation accuracy, VAT application, late fee logic (>70% coverage)

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

## 7. Accounting Books — Output 1 (accounting-books)

- [ ] 7.1 Create `AccountingBooksModule` with controller/service
- [ ] 7.2 Implement General Journal query (filtered by period/building/account) + Swagger
- [ ] 7.3 Implement General Ledger query per account (opening/closing balance, running balance)
- [ ] 7.4 Implement Cash Book (TK 111) and Bank Book (TK 112) queries
- [ ] 7.5 Implement sub-ledger queries: Receivables (TK 131), Payables (TK 331), Inventory (TK 152), Payroll (TK 334)
- [ ] 7.6 Implement Operating Fund and Maintenance Fund separate book queries
- [ ] 7.7 Implement PDF export (Vietnamese Bộ Tài chính template format) using pdf-lib
- [ ] 7.8 Implement Excel export using exceljs
- [ ] 7.9 Unit tests: balance accuracy, cross-book consistency (General Ledger TK 111 = Cash Book closing)

## 8. Accounting Reports — Output 2 (accounting-reports)

- [ ] 8.1 Create `AccountingReportsModule` with controller/service
- [ ] 8.2 Implement `ReportCacheService` — cache read/write, invalidation, BullMQ scheduled refresh
- [ ] 8.3 Implement Balance Sheet report (assets/liabilities/equity per VAS)
- [ ] 8.4 Implement Income Statement report (revenue/expenses/net per VAS)
- [ ] 8.5 Implement Cash Flow Statement report (operating/investing/financing)
- [ ] 8.6 Implement Operating Fund report (itemized income/expenses)
- [ ] 8.7 Implement Maintenance Fund report (2% compliance per Bộ Xây dựng)
- [ ] 8.8 Implement Aging Report (receivables by apartment with 30/60/90+ day buckets)
- [ ] 8.9 Implement Bill Payment Rate report
- [ ] 8.10 Implement Maintenance Cost by Category report
- [ ] 8.11 Implement Payroll Summary report
- [ ] 8.12 Implement Utility Consumption report with anomaly detection (>30% increase flag)
- [ ] 8.13 Implement Budget vs. Actual comparison report
- [ ] 8.14 Implement Overdue Debt and Reminder report
- [ ] 8.15 Implement report PDF/Excel export
- [ ] 8.16 Performance test: verify all cached reports return within 2 seconds

## 9. Integrations (accounting-integrations)

- [ ] 9.1 Create `AccountingIntegrationsModule`
- [ ] 9.2 Implement e-invoice provider adapter (abstract interface + one provider implementation)
- [ ] 9.3 Implement e-invoice BullMQ job with retry and dead-letter queue
- [ ] 9.4 Implement CSV/Excel import endpoint for utility readings + validation
- [ ] 9.5 Implement import template download (pre-filled apartment codes)
- [ ] 9.6 Implement bill notification job (BullMQ) — email, SMS, Zalo OA channels
- [ ] 9.7 Implement overdue reminder notification job
- [ ] 9.8 Implement `GET /api/accounting/invoices/{id}/payment-qr` (VietQR format)
- [ ] 9.9 Implement `GET /api/accounting/invoices/{id}/receipt` (PDF receipt)
- [ ] 9.10 Unit tests: CSV parsing, QR generation, receipt PDF content

## 10. Frontend — Accounting Pages

- [ ] 10.1 Create accounting layout and navigation under `(dashboard)/accounting/`
- [ ] 10.2 Accounting Dashboard page (KPI cards + Recharts trend charts)
- [ ] 10.3 Voucher forms (Phiếu thu/Phiếu chi) — React Hook Form + Zod + Shadcn/UI
- [ ] 10.4 Journal entry listing and detail pages with TanStack Table
- [ ] 10.5 Chart of accounts tree view
- [ ] 10.6 Books listing pages (General Journal, Ledger, Cash Book, etc.) with filters + export buttons
- [ ] 10.7 Reports pages with filter controls and Recharts visualizations
- [ ] 10.8 Inventory management pages (items + movements)
- [ ] 10.9 Payroll management pages (monthly generation + salary slips)
- [ ] 10.10 Maintenance work order + cost pages
- [ ] 10.11 CSV import page with drag-and-drop upload
- [ ] 10.12 Management Board admin page
- [ ] 10.13 Skeleton loaders for all async sections (CLS = 0)
- [ ] 10.14 Framer Motion page transitions and list animations
- [ ] 10.15 Responsive design validation (mobile + desktop)

## 11. Testing & Validation

- [ ] 11.1 E2E test: Create ManagementBoard → add buildings → input transactions → verify books & reports
- [ ] 11.2 E2E test: Monthly bill generation flow (meter readings → bill preview → confirm → payment → receipt)
- [ ] 11.3 Multi-tenant isolation test: Board A accountant cannot see Board B data
- [ ] 11.4 Portfolio admin cross-board access test
- [ ] 11.5 Performance test: reports with 1000+ journal entries render < 2s
- [ ] 11.6 Verify Swagger docs complete for all new endpoints

### Dependencies
- Tasks 1.x MUST complete before all other tasks (data model is foundation)
- Tasks 2.x MUST complete before 3.x, 7.x, 8.x (journal engine required)
- Tasks 4.x, 5.x, 6.x can run in parallel after 2.x
- Tasks 7.x depends on 2.x + 3.x (books need journal data)
- Tasks 8.x depends on 7.x (reports aggregate book data)
- Tasks 9.x can start after 3.x (billing integration needed)
- Tasks 10.x can start incrementally as backend endpoints complete
- Tasks 11.x run after all backend tasks complete
