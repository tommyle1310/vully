# Trust Accounting & Escrow Management Specification

## Overview

This capability enables fiduciary-compliant management of tenant funds, ensuring legal separation between operating funds, security deposits (trust/escrow), and maintenance funds.

---

## ADDED Requirements

### Requirement: Financial Account Segregation

The system SHALL maintain separate financial accounts for operating funds, trust funds (security deposits), and maintenance funds.

#### Scenario: Create trust account for security deposits
- **GIVEN** An organization without a trust account
- **WHEN** Admin creates a FinancialAccount with type `trust_security`
- **THEN** Account is created
- **AND** Account is linked to organization
- **AND** Account balance starts at 0

#### Scenario: Trust account balance reflects escrow ledgers
- **GIVEN** A trust account with 2 active escrow ledgers (10,000,000 VND each)
- **WHEN** Trust account balance is queried
- **THEN** Balance equals sum of escrow ledger current_balance (20,000,000 VND)

---

### Requirement: Escrow Ledger per Contract

The system SHALL create and maintain an escrow ledger for each contract that collects security deposits or prepaid rent.

#### Scenario: Auto-create escrow ledger on contract creation
- **GIVEN** A new rental contract with deposit_amount = 20,000,000 VND
- **WHEN** Contract is created
- **THEN** EscrowLedger is created automatically
- **AND** escrow_type = `security_deposit`
- **AND** original_amount = 20,000,000 VND
- **AND** current_balance = 0 (awaiting deposit)
- **AND** status = `held`

#### Scenario: Record security deposit received
- **GIVEN** An escrow ledger with current_balance = 0
- **WHEN** Admin records deposit_received transaction of 20,000,000 VND
- **THEN** current_balance increases to 20,000,000 VND
- **AND** EscrowTransaction is created with type `deposit_received`
- **AND** Trust account balance increases by 20,000,000 VND
- **AND** Journal entry is auto-posted (Debit TK 111/112, Credit TK 344)

#### Scenario: Record damage deduction from escrow
- **GIVEN** An escrow ledger with current_balance = 20,000,000 VND
- **AND** Contract is terminated
- **WHEN** Admin records damage_deduction of 2,000,000 VND with description "Wall repair"
- **THEN** current_balance decreases to 18,000,000 VND
- **AND** EscrowTransaction is created with type `damage_deduction`
- **AND** Journal entry is auto-posted (Debit TK 344, Credit TK 511)
- **AND** Audit log records the deduction with itemization

#### Scenario: Return remaining escrow balance
- **GIVEN** An escrow ledger with current_balance = 18,000,000 VND
- **AND** All deductions have been recorded
- **WHEN** Admin processes full_return
- **THEN** current_balance becomes 0
- **AND** status changes to `returned`
- **AND** EscrowTransaction is created with type `full_return`
- **AND** Journal entry is auto-posted (Debit TK 344, Credit TK 111/112)

---

### Requirement: Trust Fund Co-Mingling Prevention

The system SHALL prevent trust/escrow funds from being used for operating expenses.

#### Scenario: Block journal entry that co-mingles trust funds
- **GIVEN** A draft journal entry
- **AND** Entry debits trust account (TK 344) for 5,000,000 VND
- **AND** Entry credits operating expense account (TK 642) for 5,000,000 VND
- **WHEN** Entry is validated for posting
- **THEN** Validation fails with error "TRUST_FUND_COMINGLE"
- **AND** Error message: "Trust/escrow funds cannot be used for operating expenses"

#### Scenario: Allow proper trust fund usage
- **GIVEN** A draft journal entry
- **AND** Entry debits trust account (TK 344) for escrow return
- **AND** Entry credits cash account (TK 111) for tenant refund
- **WHEN** Entry is validated for posting
- **THEN** Validation passes
- **AND** Entry can be posted

---

### Requirement: Escrow Interest Calculation

The system SHALL calculate and accrue interest on escrow balances for jurisdictions that require it.

#### Scenario: Monthly interest accrual (interest-bearing escrow)
- **GIVEN** An escrow ledger with current_balance = 20,000,000 VND
- **AND** interest_rate = 0.0002 (0.02% monthly, ~2.4% annual)
- **AND** Jurisdiction requires interest payment (e.g., Iowa, US)
- **WHEN** Monthly interest calculation job runs
- **THEN** accrued_interest increases by 4,000 VND
- **AND** EscrowTransaction is created with type `interest_accrual`
- **AND** Journal entry is auto-posted (Debit TK 642, Credit TK 344)

---

### Requirement: Escrow Reconciliation

The system SHALL support reconciliation of escrow ledgers against trust account bank balance.

#### Scenario: Generate escrow reconciliation report
- **GIVEN** Trust account with bank balance 50,000,000 VND
- **AND** 3 active escrow ledgers totaling 48,000,000 VND
- **WHEN** Admin generates reconciliation report
- **THEN** Report shows:
  - Book balance: 48,000,000 VND
  - Bank balance: 50,000,000 VND
  - Variance: 2,000,000 VND
  - Variance items (unrecorded deposits, pending transfers)

---

## Data Model

### FinancialAccount
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| organization_id | UUID | FK to Organization |
| account_type | Enum | operating, trust_security, trust_prepaid, maintenance_fund |
| name | VARCHAR(255) | Account display name |
| bank_name | VARCHAR(255) | Bank institution name |
| account_number | VARCHAR(50) | Last 4 digits only |
| bank_token | VARCHAR | Encrypted Plaid processor token |
| balance | Decimal(15,2) | Calculated balance |
| is_active | Boolean | Active flag |
| created_at | Timestamp | Creation time |

### EscrowLedger
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| financial_account_id | UUID | FK to FinancialAccount (trust) |
| contract_id | UUID | FK to Contract |
| escrow_type | Enum | security_deposit, prepaid_rent, option_fee, maintenance_fund_2pct |
| original_amount | Decimal(15,2) | Initial deposit amount |
| current_balance | Decimal(15,2) | Balance after deductions |
| interest_rate | Decimal(5,4) | Jurisdiction-required rate |
| accrued_interest | Decimal(15,2) | Total interest accrued |
| return_deadline | Date | Compliance deadline |
| status | Enum | held, partially_applied, fully_applied, returned, forfeited |
| created_at | Timestamp | Creation time |
| updated_at | Timestamp | Last update time |

### EscrowTransaction
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| escrow_id | UUID | FK to EscrowLedger |
| transaction_type | Enum | deposit_received, interest_accrual, damage_deduction, cleaning_deduction, rent_application, partial_return, full_return |
| amount | Decimal(15,2) | Transaction amount |
| description | VARCHAR(255) | Itemization description |
| reference_id | UUID | Link to invoice/claim |
| created_by | UUID | FK to User |
| created_at | Timestamp | Transaction time |

---

## API Endpoints

| Method | Path | Description | Min Role |
|--------|------|-------------|----------|
| GET | /api/accounting/financial-accounts | List accounts | accountant |
| POST | /api/accounting/financial-accounts | Create account | portfolio_admin |
| GET | /api/accounting/escrow | List escrow ledgers | accountant |
| GET | /api/accounting/escrow/:id | Get escrow detail | accountant |
| POST | /api/accounting/escrow/:id/deposit | Record deposit | accountant |
| POST | /api/accounting/escrow/:id/deduction | Record deduction | accountant |
| POST | /api/accounting/escrow/:id/return | Process return | accountant |
| GET | /api/accounting/escrow/reconciliation | Generate reconciliation | accountant |

---

## Related Capabilities
- **Accounting**: Journal entry auto-posting, co-mingling validation
- **Compliance**: Return deadline enforcement, interest requirements
- **Contracts**: Auto-create escrow on contract creation
