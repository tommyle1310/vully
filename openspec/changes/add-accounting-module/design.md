# Design: Accounting Module

## Context

Vully needs a full-featured accounting module for Vietnamese apartment management. The module must comply with Vietnamese Accounting Standards (VAS) under Circular TT200/2014/TT-BTC and TT133/2016/TT-BTC, support multi-building/portfolio operations, double-entry bookkeeping, and produce legally-mandated books and reports.

### Current State
- **Existing billing**: `apps/api/src/modules/billing/` handles invoices, meter readings, utility tiers, and billing jobs via BullMQ.
- **Existing models**: Building, Apartment, Contract, Invoice, InvoiceLineItem, MeterReading, UtilityType, UtilityTier, BillingJob.
- **Existing RBAC**: UserRole enum with `admin`, `technician`, `resident`. Permission + RolePermission tables for fine-grained access.
- **Existing audit**: AuditLog model tracks all sensitive operations.

### Stakeholders
- **Management Board (Ban quản lý)**: Primary users — manage building finances.
- **Accountant (Kế toán)**: Day-to-day bookkeeping, voucher entry, report generation.
- **Portfolio Admin**: Oversees multiple management boards/buildings.
- **Maintenance Staff**: Inventory & work-order visibility only.
- **Residents**: No direct accounting UI (API-only for payment QR, receipts).

## Goals / Non-Goals

### Goals
- Double-entry bookkeeping engine with Vietnamese chart of accounts (TT200/133).
- Multi-building tenant isolation via `buildingId` + `managementBoardId` on all accounting tables.
- Automated monthly bill generation integrating management fees, utilities, parking, and miscellaneous charges.
- Complete Vietnamese accounting books (Output 1): General Journal, General Ledger, Cash Book, Bank Book, sub-ledgers.
- Management & financial reports (Output 2): Balance Sheet, Income Statement, Cash Flow, fund reports, aging.
- E-invoice integration (VNPT/BKAV/Misa/Fast) and CSV import for utility readings.
- Immutable journal entries after posting (audit-trail compliant).

### Non-Goals
- Resident-facing accounting UI (expose REST API only for resident app).
- Bank webhook auto-reconciliation (deferred to Phase 2).
- Digital signature (chữ ký số) integration with CA providers (Phase 2).
- HTKK XML export for tax authority (Phase 2).
- Separate `apps/accounting` NestJS application — module stays within `apps/api`.

## Architecture Decisions

### Decision 1: NestJS modules under `apps/api`, not a separate app
- **Why**: The accounting module shares the same database, auth, audit, and Prisma client. A separate app would duplicate infrastructure and complicate transactions.
- **Alternative**: `apps/accounting` as a dedicated NestJS app with its own Prisma client. Rejected — adds deployment complexity, cross-service calls for shared entities, and Prisma schema duplication.
- **Migration path**: If needed later, modules can be extracted to a standalone service since NestJS modular architecture already enforces boundaries.

### Decision 2: Extend existing Prisma schema (single schema file)
- **Why**: The spec mandates "cùng Prisma schema" — reuse existing Building, Apartment, Contract, Invoice models. New accounting models (ManagementBoard, JournalEntry, LedgerAccount, etc.) are added alongside.
- **Risk**: Schema file grows large. Mitigate by organizing with comments/sections.

### Decision 3: Extend UserRole enum for accounting roles
- **Why**: Accounting introduces `portfolio_admin`, `accountant`, `maintenance_staff` roles. These integrate with the existing Permission/RolePermission system.
- **Alternative**: Separate accounting-specific role table. Rejected — fragmenting RBAC systems creates confusion.

### Decision 4: JournalEntry with JSON entries array (not normalized)
- **Why**: Each journal entry contains debit/credit lines. Using a `Json[]` field for entries keeps writes atomic and reads simple for book generation. The accounting spec explicitly defines `entries: Json[] {accountCode, debit, credit, description}`.
- **Trade-off**: Cannot query individual debit/credit lines with SQL joins. Mitigate with a denormalized `AccountingTransaction` link table for cross-referencing and materialized views for reporting.

### Decision 5: ReportCache table + materialized views for <2s report performance
- **Why**: Complex financial reports (balance sheet, income statement) aggregate many journal entries. Pre-computing into cache tables ensures sub-2-second rendering.
- **Refresh strategy**: BullMQ scheduled job refreshes caches nightly + on-demand after journal posting.

### Decision 6: Vietnamese Chart of Accounts as seed data
- **Why**: TT200/TT133 define standard account codes (111-Cash, 112-Bank, 131-Receivable, etc.). These are seeded into LedgerAccount at module init, not hardcoded.
- **Customization**: Buildings can add sub-accounts but cannot modify standard accounts.

## Module Structure

```
apps/api/src/modules/
├── accounting/                     # Core accounting engine
│   ├── accounting.module.ts
│   ├── chart-of-accounts/         # LedgerAccount CRUD + seeding
│   ├── journal-entries/           # Double-entry posting engine
│   ├── vouchers/                  # Cash receipt/disbursement forms
│   └── dto/
├── accounting-billing/            # Monthly bill generation extension
│   ├── accounting-billing.module.ts
│   ├── bill-generation.service.ts
│   └── bill-generation.processor.ts  # BullMQ job
├── accounting-operations/         # Inventory, Payroll, Maintenance
│   ├── inventory/
│   ├── payroll/
│   └── maintenance-costs/
├── accounting-books/              # Output 1: Vietnamese accounting books
│   ├── books.controller.ts
│   ├── books.service.ts
│   └── export/                    # PDF/Excel generators
├── accounting-reports/            # Output 2: Financial & management reports
│   ├── reports.controller.ts
│   ├── reports.service.ts
│   ├── report-cache.service.ts
│   └── export/
├── accounting-integrations/       # E-invoice, CSV import
│   ├── e-invoice/
│   ├── csv-import/
│   └── notifications/
└── management-board/              # ManagementBoard + Investor CRUD
    ├── management-board.module.ts
    ├── management-board.controller.ts
    └── management-board.service.ts
```

## Tenant Isolation Strategy

All accounting tables include `buildingId` and `managementBoardId`. Isolation is enforced via:

1. **Prisma middleware**: Automatically appends `WHERE buildingId IN (...)` based on the authenticated user's board membership.
2. **@CurrentUser() decorator**: Extracts user + board context from JWT.
3. **@Roles() guard**: Restricts access by role. Accountant sees only their board's buildings. PortfolioAdmin sees all.

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| Schema.prisma grows very large | Dev experience degrades | Section comments, consider Prisma multi-file schema (preview) |
| JSON journal entries limit query flexibility | Complex report queries harder | AccountingTransaction link table + materialized views |
| E-invoice vendor API instability | Bill delivery fails | BullMQ retry with exponential backoff + dead letter queue |
| Report performance on large datasets | >2s response times | ReportCache + scheduled refresh + pagination |
| Vietnamese accounting regulation changes | Books/reports become non-compliant | Chart of accounts as configurable seed data, report templates as versioned config |

## Open Questions

1. **E-invoice vendor selection**: Should we integrate multiple vendors (VNPT + BKAV + Misa) from the start, or pick one for MVP and add others later?
2. **Notification channels**: The spec mentions Zalo OA, SMS, Email — which are available in current Vully infrastructure?
3. **Report templates**: Are there specific Bộ Tài chính template files (PDF/Excel) we should match exactly, or is the data structure sufficient?
