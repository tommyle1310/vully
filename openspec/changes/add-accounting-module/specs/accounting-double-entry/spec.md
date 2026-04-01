## ADDED Requirements

### Requirement: Vietnamese Chart of Accounts
The system SHALL maintain a chart of accounts compliant with Vietnamese Circular TT200/2014/TT-BTC and TT133/2016/TT-BTC, including standard accounts: TK 111 (Cash), TK 112 (Bank Deposits), TK 131 (Receivables), TK 152 (Inventory/Materials), TK 331 (Payables), TK 334 (Payroll Payable), TK 338 (Social Insurance Payable), TK 511 (Revenue), TK 627 (Production Overhead), TK 632 (COGS), TK 642 (Admin Expenses).

#### Scenario: List chart of accounts
- **WHEN** an Accountant requests the chart of accounts for a building
- **THEN** the system returns the tree of ledger accounts with codes, names, types, and balances
- **AND** system accounts are marked as non-editable

#### Scenario: Filter accounts by type
- **WHEN** an Accountant filters by account type (e.g., "expense")
- **THEN** only accounts of that type are returned (TK 627, 632, 642, etc.)

### Requirement: Create Journal Entry
The system SHALL allow authorized users to create journal entries with date, description, and a balanced set of debit/credit lines referencing valid ledger account codes.

#### Scenario: Create balanced journal entry
- **WHEN** an Accountant submits a journal entry with total debits = total credits
- **THEN** the entry is persisted in draft status
- **AND** an auto-generated sequential entry number is assigned

#### Scenario: Reject unbalanced journal entry
- **WHEN** a journal entry is submitted where total debits ≠ total credits
- **THEN** the system rejects the entry with a validation error indicating the imbalance amount

#### Scenario: Reject invalid account code
- **WHEN** a journal entry line references a non-existent account code
- **THEN** the system rejects the entry with a validation error

### Requirement: Post Journal Entry (Immutable)
The system SHALL allow posting a draft journal entry, after which the entry becomes immutable (cannot be edited or deleted). Corrections MUST be made via reversing entries.

#### Scenario: Post draft entry
- **WHEN** an Accountant posts a draft journal entry
- **THEN** the entry status changes to "posted"
- **AND** postedAt timestamp and postedById are recorded
- **AND** the entry becomes immutable

#### Scenario: Reject edit of posted entry
- **WHEN** a user attempts to modify a posted journal entry
- **THEN** the system returns 400 Bad Request with message "Posted entries are immutable"

#### Scenario: Reverse posted entry
- **WHEN** an Accountant reverses a posted journal entry
- **THEN** a new journal entry is created with debits and credits swapped
- **AND** both entries are cross-referenced

### Requirement: Cash Receipt Voucher (Phiếu Thu)
The system SHALL provide API and form for recording cash receipts with: payer, amount, reason, ledger accounts (debit TK 111, credit counterpart), and auto-generation of a journal entry upon posting.

#### Scenario: Record cash receipt
- **WHEN** an Accountant records a cash receipt of 5,000,000 VND from resident for management fee
- **THEN** a voucher is created with debit TK 111 and credit TK 131
- **AND** a draft journal entry is auto-generated
- **AND** the voucher number follows the sequential format (PT-YYYY-NNNN)

### Requirement: Cash Disbursement Voucher (Phiếu Chi)
The system SHALL provide API and form for recording cash disbursements with: payee, amount, reason, ledger accounts (credit TK 111, debit counterpart), and auto-generation of a journal entry upon posting.

#### Scenario: Record cash disbursement
- **WHEN** an Accountant records a cash payment of 2,000,000 VND for office supplies
- **THEN** a voucher is created with debit TK 642 and credit TK 111
- **AND** a draft journal entry is auto-generated
- **AND** the voucher number follows the sequential format (PC-YYYY-NNNN)

### Requirement: Bank Transfer Recording
The system SHALL provide API and form for recording bank transfers (deposits and withdrawals on TK 112) with: bank account, counterparty, amount, reference number, and auto-generation of journal entries.

#### Scenario: Record bank deposit
- **WHEN** a resident pays via bank transfer
- **THEN** a bank receipt is recorded with debit TK 112 and credit TK 131
- **AND** the corresponding invoice is updated if matched

### Requirement: Auto-Post Journal Entries from Source Documents
The system SHALL automatically generate draft journal entries when source documents (invoices, payroll, inventory movements, maintenance costs) are created, following the Vietnamese account mapping rules.

#### Scenario: Invoice triggers journal entry
- **WHEN** a monthly invoice is issued for an apartment
- **THEN** a journal entry is auto-generated: debit TK 131 (Receivable), credit TK 511 (Revenue)
- **AND** the AccountingTransaction links the journal entry to the invoice

#### Scenario: Payment triggers journal entry
- **WHEN** a payment is recorded against an invoice
- **THEN** a journal entry is auto-generated: debit TK 111/112 (Cash/Bank), credit TK 131 (Receivable)

### Requirement: Audit Trail for Journal Entries
The system SHALL log all journal entry operations (create, post, reverse) to the existing AuditLog table with full before/after values.

#### Scenario: Audit journal posting
- **WHEN** a journal entry is posted
- **THEN** an AuditLog record is created with action "journal_entry.posted", the entry ID, and the posting user
