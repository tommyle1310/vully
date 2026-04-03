# Regional Compliance Engine Specification

## Overview

This capability provides a rules-based system for managing regional legal requirements including US security deposit escrow laws, Vietnamese 2% maintenance fund requirements, and automated deadline tracking.

---

## ADDED Requirements

### Requirement: Jurisdiction-Specific Compliance Rules

The system SHALL support configurable compliance rules per jurisdiction that can be updated without code deployment.

#### Scenario: Configure Vietnamese 2% maintenance fund rule
- **GIVEN** An organization operating in Vietnam
- **WHEN** Admin enables VN compliance rules
- **THEN** ComplianceRule for `VN_MAINTENANCE_FUND_2PCT` is created
- **AND** Rule parameters include:
  - rate: 0.02 (2%)
  - basis: "purchase_price"
  - allowed_uses: ["structural_repair", "common_area_upgrade", "elevator_replacement"]

#### Scenario: Configure US-Florida escrow return rule
- **GIVEN** An organization with properties in Florida
- **WHEN** Admin enables US-FL compliance rules
- **THEN** ComplianceRule for `US_FL_ESCROW_RETURN` is created
- **AND** Rule parameters include:
  - return_deadline_days_no_claim: 15
  - return_deadline_days_with_claim: 30
  - itemization_required: true

#### Scenario: Multiple jurisdictions per organization
- **GIVEN** An organization with properties in Vietnam and US-California
- **WHEN** Compliance rules are queried
- **THEN** Both VN and US-CA rules are returned
- **AND** Each building can specify its applicable jurisdiction

---

### Requirement: Automated Compliance Deadline Tracking

The system SHALL automatically calculate and track compliance deadlines based on applicable rules.

#### Scenario: Calculate escrow return deadline on contract termination
- **GIVEN** A contract in Florida jurisdiction
- **AND** ComplianceRule `US_FL_ESCROW_RETURN` is active
- **WHEN** Contract status changes to `terminated`
- **THEN** EscrowLedger.return_deadline is calculated
- **AND** Deadline = termination_date + 15 days (no claim scenario)
- **AND** ComplianceAlert is created with type `deadline_approaching` (7 days before)

#### Scenario: Deadline imminent alert
- **GIVEN** An escrow return deadline in 3 days
- **AND** ComplianceAlert exists with status `pending`
- **WHEN** Daily compliance check job runs
- **THEN** Alert type is updated to `deadline_imminent`
- **AND** Notification is sent to organization accountants

#### Scenario: Deadline overdue alert
- **GIVEN** An escrow return deadline has passed
- **AND** Escrow status is still `held`
- **WHEN** Daily compliance check job runs
- **THEN** ComplianceAlert is created with type `deadline_overdue`
- **AND** Alert status is `escalated`
- **AND** Notification is sent to organization owner

---

### Requirement: Vietnamese 2% Maintenance Fund Compliance

The system SHALL enforce Vietnamese Law on Real Estate Business requirements for maintenance fund collection and usage.

#### Scenario: Validate 2% collection on apartment purchase
- **GIVEN** A purchase contract with purchase_price = 2,000,000,000 VND
- **AND** VN jurisdiction applies
- **WHEN** Contract is created
- **THEN** EscrowLedger for `maintenance_fund_2pct` is auto-created
- **AND** original_amount = 40,000,000 VND (2% of purchase price)

#### Scenario: Block maintenance fund usage for operating expenses
- **GIVEN** A maintenance fund ledger with balance 500,000,000 VND
- **WHEN** Admin attempts to use funds for "Office supplies"
- **THEN** Request is rejected
- **AND** Error: "Maintenance fund usage restricted to approved categories"

#### Scenario: Approve maintenance fund expenditure for structural repair
- **GIVEN** A maintenance fund ledger with balance 500,000,000 VND
- **AND** Expenditure category is "structural_repair" (allowed)
- **WHEN** Admin submits expenditure request with required documentation
- **THEN** Expenditure is approved pending board vote (if configured)
- **AND** Compliance audit trail is created

---

### Requirement: Compliance Alert Management

The system SHALL provide a workflow for acknowledging, resolving, and escalating compliance alerts.

#### Scenario: Acknowledge compliance alert
- **GIVEN** A pending compliance alert for escrow return deadline
- **WHEN** Accountant acknowledges the alert
- **THEN** Alert status changes to `acknowledged`
- **AND** Acknowledgment timestamp and user are recorded
- **AND** Alert remains visible until resolved

#### Scenario: Resolve compliance alert
- **GIVEN** An acknowledged compliance alert
- **AND** Escrow has been fully returned
- **WHEN** System detects escrow status = `returned`
- **THEN** Alert is auto-resolved
- **AND** Resolution timestamp is recorded
- **AND** Alert is archived

#### Scenario: Manual escalation
- **GIVEN** A deadline_overdue alert that has been pending for 7 days
- **WHEN** Daily compliance job runs
- **THEN** Alert is escalated to organization owner
- **AND** Escalation notification is sent
- **AND** Alert notes are updated with escalation reason

---

### Requirement: Compliance Audit Reporting

The system SHALL generate compliance audit reports for regulatory and internal review.

#### Scenario: Generate escrow compliance summary
- **GIVEN** An organization with 50 escrow ledgers
- **WHEN** Admin requests compliance summary report
- **THEN** Report includes:
  - Total escrow held: XXX VND
  - Pending returns: 5 (with deadlines)
  - Overdue returns: 1 (flagged)
  - Interest accrued (if applicable): XXX VND
  - Compliance rate: 98%

#### Scenario: Vietnamese maintenance fund settlement report
- **GIVEN** A building in Vietnam
- **WHEN** Admin requests maintenance fund settlement report (Báo cáo quyết toán quỹ bảo trì)
- **THEN** Report includes per-apartment:
  - 2% contribution amount
  - Amount collected
  - Balance owed
  - Expenditures approved
  - Fund balance

---

## Data Model

### ComplianceRule
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| organization_id | UUID | FK to Organization |
| jurisdiction | VARCHAR(20) | ISO code: VN, US-FL, US-CA |
| rule_type | Enum | security_deposit_limit, security_deposit_interest, escrow_return_deadline, maintenance_fund_rate, maintenance_fund_usage |
| rule_code | VARCHAR(50) | Unique rule identifier |
| parameters | JSONB | Rule-specific configuration |
| effective_from | Date | Rule effective start |
| effective_to | Date | Rule effective end (null = indefinite) |
| is_active | Boolean | Active flag |
| created_at | Timestamp | Creation time |

### ComplianceAlert
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| organization_id | UUID | FK to Organization |
| rule_id | UUID | FK to ComplianceRule |
| resource_type | VARCHAR(50) | 'contract', 'escrow', 'maintenance_fund' |
| resource_id | UUID | FK to resource |
| alert_type | Enum | deadline_approaching, deadline_imminent, deadline_overdue, limit_exceeded |
| deadline | Date | Compliance deadline |
| status | Enum | pending, acknowledged, resolved, escalated |
| acknowledged_by | UUID | FK to User |
| acknowledged_at | Timestamp | Acknowledgment time |
| resolved_at | Timestamp | Resolution time |
| resolved_by | UUID | FK to User |
| notes | TEXT | Alert notes / escalation reason |
| created_at | Timestamp | Alert creation time |

---

## API Endpoints

| Method | Path | Description | Min Role |
|--------|------|-------------|----------|
| GET | /api/compliance/rules | List active rules | accountant |
| POST | /api/compliance/rules | Create/update rule | portfolio_admin |
| DELETE | /api/compliance/rules/:id | Deactivate rule | portfolio_admin |
| GET | /api/compliance/alerts | List alerts (filterable) | accountant |
| POST | /api/compliance/alerts/:id/acknowledge | Acknowledge alert | accountant |
| POST | /api/compliance/alerts/:id/resolve | Resolve alert | accountant |
| GET | /api/compliance/reports/escrow-summary | Escrow compliance report | accountant |
| GET | /api/compliance/reports/maintenance-fund | VN maintenance fund report | accountant |

---

## Background Jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| compliance:check-deadlines | Daily 6 AM | Evaluate rules, create/update alerts |
| compliance:escalate-overdue | Daily 9 AM | Escalate alerts past threshold |
| compliance:interest-calculation | Monthly 1st | Calculate escrow interest (where required) |

---

## Related Capabilities
- **Trust Accounting**: Escrow deadline population, fund usage validation
- **Notifications**: Alert delivery to responsible parties
- **Contracts**: Jurisdiction assignment per building/contract
