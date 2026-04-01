# Change: Add Accounting Module for Vietnamese Apartment Management

## Why

Vully currently handles basic billing (invoices, meter readings, utility tiers) but lacks a proper accounting system. Vietnamese apartment management requires legally-compliant double-entry bookkeeping (TT200/TT133), standardized accounting books (sổ sách kế toán), financial reports, payroll, inventory, and maintenance cost tracking. Without this, management boards cannot produce audit-ready financials or comply with Vietnamese accounting regulations.

## What Changes

### New Capabilities
- **accounting-data-model**: New Prisma models — ManagementBoard, Investor, LedgerAccount, JournalEntry, AccountingTransaction, InventoryItem, InventoryMovement, PayrollRecord, SalarySlip, MaintenanceWorkOrder, MaintenanceCost, ReportCache. Extended UserRole enum with `portfolio_admin`, `accountant`, `maintenance_staff`.
- **accounting-double-entry**: Double-entry bookkeeping engine with Vietnamese chart of accounts (TK 111-999), immutable journal entries, cash/bank vouchers, and auto-posting from transactions.
- **accounting-monthly-billing**: Extended bill generation that aggregates management fees, utilities, parking, and miscellaneous charges into monthly bills per apartment, with auto-generation of corresponding journal entries.
- **accounting-operations**: Inventory tracking (materials in/out, TK 152), payroll management (BHXH, TNCN tax calculations, TK 334), and maintenance work-order cost tracking linked to contractors.
- **accounting-books**: All Vietnamese accounting books (Output 1) — General Journal, General Ledger, Cash Book (TK 111), Bank Book (TK 112), sub-ledgers for receivables (TK 131), payables (TK 331), inventory (TK 152), and payroll (TK 334). Filterable by period/building/account, exportable to PDF/Excel per Bộ Tài chính templates.
- **accounting-reports**: Financial reports (Balance Sheet, Income Statement, Cash Flow Statement per VAS) and management reports (fund reports, aging, budget vs. actual, utility consumption). Dashboard with Recharts. ReportCache for <2s performance.
- **accounting-integrations**: E-invoice API (VNPT/BKAV/Misa), CSV/Excel import for utility readings, bill notification via BullMQ (Email, SMS, Zalo OA).

### Modified Capabilities
- **Existing billing module**: Extended to serve as input source for accounting journal entries. Invoice creation triggers double-entry posting.
- **RBAC**: UserRole enum extended with 3 new roles. Permission seeds updated for accounting-specific permissions.
- **Building model**: New relation to ManagementBoard.

## Impact

- **Affected specs**: None (specs directory is currently empty — all deltas are ADDED)
- **Affected code**:
  - `apps/api/prisma/schema.prisma` — ~15 new models, 3 new enums, extended relations on Building
  - `apps/api/src/modules/` — 7 new module directories
  - `apps/api/src/modules/billing/` — extended to emit accounting events
  - `packages/shared-types/` — new entity types, enum exports
  - `apps/web/src/app/(dashboard)/` — new accounting pages (books, reports, vouchers, inventory, payroll)
- **Database**: New migration with ~15 tables. Non-breaking (additive only).
- **Breaking changes**: UserRole enum extension requires migration. No API breaking changes.

## Phasing

| Phase | Scope | Priority |
|-------|-------|----------|
| Phase 1 (MVP) | Data model, double-entry engine, monthly billing, books, core reports | High |
| Phase 2 | Inventory, payroll, maintenance costs, e-invoice integration | Medium |
| Phase 3 | Digital signature, HTKK XML export, bank auto-reconciliation | Low |
