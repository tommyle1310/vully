## ADDED Requirements

### Requirement: Management Board Entity
The system SHALL provide a ManagementBoard entity representing the legal management body of one or more buildings, with fields: name, ownerInvestorId, contact info, address, taxCode, and buildingId associations.

#### Scenario: Create management board
- **WHEN** a PortfolioAdmin creates a ManagementBoard with name, investor reference, and building assignments
- **THEN** the system persists the board and associates it with the specified buildings

#### Scenario: Board-building association
- **WHEN** a ManagementBoard is created with buildingIds
- **THEN** each referenced Building is linked to that board
- **AND** all accounting records for those buildings are scoped to the board

### Requirement: Investor Entity
The system SHALL provide an Investor entity representing the building investor/developer, with fields: name, taxCode, legalRepresentative, address, contactInfo.

#### Scenario: Create investor
- **WHEN** a PortfolioAdmin creates an Investor with tax code and legal representative
- **THEN** the system persists the investor record
- **AND** the investor can be linked to ManagementBoards

### Requirement: Ledger Account (Chart of Accounts)
The system SHALL provide a LedgerAccount entity following Vietnamese Circular TT200/2014/TT-BTC and TT133/2016/TT-BTC, with fields: accountCode, name, parentCode, accountType (asset/liability/equity/revenue/expense), isSystemAccount, buildingId.

#### Scenario: Seed standard chart of accounts
- **WHEN** the accounting module initializes for a new building
- **THEN** the system seeds standard Vietnamese accounts (TK 111, 112, 131, 152, 334, 511, 632, 642, etc.)
- **AND** system accounts are marked immutable

#### Scenario: Add custom sub-account
- **WHEN** an Accountant creates a sub-account under a standard parent (e.g., 1111 under 111)
- **THEN** the system persists the sub-account linked to the parent
- **AND** the sub-account inherits the parent's account type

### Requirement: Journal Entry Model
The system SHALL provide a JournalEntry entity with fields: id, entryNumber (auto-generated sequential), date, description, buildingId, managementBoardId, status (draft/posted), postedAt, postedById, entries (JSON array of {accountCode, debit, credit, description}).

#### Scenario: Journal entry structure
- **WHEN** a journal entry is created with debit/credit lines
- **THEN** each line references a valid LedgerAccount code
- **AND** the sum of debits equals the sum of credits (balanced)

### Requirement: Accounting Transaction Link
The system SHALL provide an AccountingTransaction entity that links JournalEntries to their source documents (Invoice, PayrollRecord, InventoryMovement, MaintenanceWorkOrder), with fields: journalEntryId, sourceType, sourceId.

#### Scenario: Trace transaction source
- **WHEN** a JournalEntry is posted from an Invoice
- **THEN** an AccountingTransaction record links the journal entry to the invoice
- **AND** the source is retrievable for audit purposes

### Requirement: Inventory Item and Movement Models
The system SHALL provide InventoryItem (code, name, unit, category, buildingId, managementBoardId) and InventoryMovement (inventoryItemId, movementType: in/out/adjustment, quantity, unitCost, totalCost, referenceNumber, date, buildingId, managementBoardId) entities.

#### Scenario: Record inventory movement
- **WHEN** materials are received or issued
- **THEN** an InventoryMovement is created
- **AND** a corresponding JournalEntry is auto-posted (TK 152 debit for in, credit for out)

### Requirement: Payroll Record and Salary Slip Models
The system SHALL provide PayrollRecord (month, buildingId, managementBoardId, status, totalGross, totalDeductions, totalNet) and SalarySlip (payrollRecordId, employeeName, baseSalary, allowances, bhxhEmployee, bhxhEmployer, tncnTax, netSalary, bankAccount) entities.

#### Scenario: Generate payroll
- **WHEN** an Accountant generates payroll for a month
- **THEN** salary slips are created per employee with BHXH and TNCN calculations
- **AND** a JournalEntry is auto-posted (debit TK 642, credit TK 334/338)

### Requirement: Maintenance Work Order and Cost Models
The system SHALL provide MaintenanceWorkOrder (title, description, contractorName, buildingId, managementBoardId, status, scheduledDate, completedDate) and MaintenanceCost (workOrderId, description, amount, category, invoiceRef, buildingId, managementBoardId) entities.

#### Scenario: Record maintenance cost
- **WHEN** a maintenance work order is completed with associated costs
- **THEN** MaintenanceCost records are created
- **AND** a JournalEntry is auto-posted (debit TK 627/642, credit TK 111/112/331)

### Requirement: Report Cache Model
The system SHALL provide a ReportCache entity (reportType, buildingId, managementBoardId, periodKey, generatedAt, data JSON, expiresAt) for pre-computed report data.

#### Scenario: Cache report data
- **WHEN** a report is generated or refreshed
- **THEN** the computed data is stored in ReportCache
- **AND** subsequent reads return cached data if not expired

### Requirement: Extended User Roles for Accounting
The system SHALL extend the UserRole enum with `portfolio_admin`, `accountant`, and `maintenance_staff` roles, integrated with the existing Permission/RolePermission system.

#### Scenario: Accountant role assignment
- **WHEN** an Admin assigns the `accountant` role to a user
- **THEN** the user gains permissions for journal entries, vouchers, books, and reports scoped to their ManagementBoard's buildings

#### Scenario: Portfolio admin cross-board access
- **WHEN** a user with `portfolio_admin` role queries accounting data
- **THEN** the system returns data across all ManagementBoards and buildings

#### Scenario: Maintenance staff limited access
- **WHEN** a user with `maintenance_staff` role accesses accounting
- **THEN** they can only view inventory items and maintenance work orders for their assigned buildings

### Requirement: Tenant Isolation on All Accounting Tables
The system SHALL enforce that every accounting table includes `buildingId` (UUID) and `managementBoardId` (UUID) columns, and all queries are automatically scoped via Prisma middleware based on the authenticated user's board membership.

#### Scenario: Cross-board data isolation
- **WHEN** an Accountant of Board A queries journal entries
- **THEN** only entries belonging to Board A's buildings are returned
- **AND** entries from Board B are never visible

#### Scenario: Missing scope rejection
- **WHEN** an API request is made without valid board context
- **THEN** the system returns 403 Forbidden
