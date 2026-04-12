## MODIFIED Requirements

### Requirement: REQ-BILL-003 — Management Fee Line Item (Extended)

The invoice calculator MUST generate a management fee line item for occupied apartments using `net_area × price_per_sqm` from `management_fee_configs`. **When the contract starts or ends mid-month, the fee MUST be pro-rated by calendar days.**

#### Scenario: Full-month management fee (existing behavior)
- **GIVEN** apartment A101 with `net_area = 65.5 m²` and active config `price_per_sqm = 8,000 VND`
- **AND** the contract started before the billing period
- **WHEN** invoice is generated for billing period `2026-04`
- **THEN** management fee line item = `65.5 × 8,000 = 524,000 VND` + 10% VAT = `576,400 VND`

#### Scenario: Pro-rated management fee for mid-month move-in
- **GIVEN** apartment A101 with `net_area = 65.5 m²` and `price_per_sqm = 8,000 VND`
- **AND** the contract `start_date = 2026-04-16` (April has 30 days)
- **WHEN** invoice is generated for billing period `2026-04`
- **THEN** billable days = 15 (April 16–30)
- **AND** management fee = `65.5 × 8,000 × (15/30) = 262,000 VND` + 10% VAT = `288,200 VND`
- **AND** line item description includes "Pro-rated: 15/30 days"
- **AND** line item metadata contains `{ proRated: true, billableDays: 15, totalDays: 30, fullMonthAmount: 524000 }`

#### Scenario: Pro-rated management fee for mid-month termination
- **GIVEN** apartment A101 with `net_area = 65.5 m²` and `price_per_sqm = 8,000 VND`
- **AND** the contract `end_date = 2026-04-20`
- **WHEN** invoice is generated for billing period `2026-04`
- **THEN** billable days = 20 (April 1–20)
- **AND** management fee = `65.5 × 8,000 × (20/30) = 349,333 VND` (rounded) + 10% VAT

---

## ADDED Requirements

### Requirement: REQ-BILL-008 — Vacant Apartment Management Fee Billing

The billing system MUST generate management fee invoices for vacant apartments that have an owner, even when no active contract exists.

#### Scenario: Vacant apartment with owner gets management fee invoice
- **GIVEN** apartment B205 has `status = 'vacant'`, `owner_id` is set, `net_area = 80 m²`
- **AND** building has `management_fee_configs` with `price_per_sqm = 8,000 VND`
- **AND** no active contract exists for apartment B205
- **WHEN** monthly billing job runs for `2026-04`
- **THEN** an invoice is created with `contract_id = NULL`, `apartment_id = B205.id`
- **AND** invoice has one line item: management fee = `80 × 8,000 = 640,000 VND` + 10% VAT
- **AND** invoice `notes` = "Management fee for vacant unit B205"

#### Scenario: Vacant apartment without owner is skipped
- **GIVEN** apartment C301 has `status = 'vacant'` and `owner_id = NULL`
- **WHEN** monthly billing job runs for `2026-04`
- **THEN** no invoice is generated for apartment C301

#### Scenario: Vacant apartment with assigned parking gets parking fee
- **GIVEN** vacant apartment B205 has an assigned parking slot (slot B1-A-005, fee = 500,000 VND/month)
- **WHEN** monthly billing job runs
- **THEN** invoice line items include both management fee and parking fee

#### Scenario: Duplicate prevention for vacant invoices
- **GIVEN** a vacant invoice already exists for apartment B205 for `2026-04`
- **WHEN** billing job runs again for `2026-04`
- **THEN** no duplicate invoice is created

---

### Requirement: REQ-BILL-009 — Invoice Schema Supports Contract-less Invoices

The `invoices` table MUST support invoices without a contract by making `contract_id` nullable and adding `apartment_id`.

#### Scenario: Invoice with contract (existing behavior)
- **GIVEN** an invoice created from a contract
- **THEN** `contract_id` is set and `apartment_id` is populated from the contract's apartment

#### Scenario: Invoice for vacant apartment
- **GIVEN** an invoice for a vacant apartment
- **THEN** `contract_id` is NULL, `apartment_id` is set
- **AND** the database constraint ensures at least one reference is non-null
