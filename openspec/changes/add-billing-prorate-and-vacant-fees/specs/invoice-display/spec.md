## ADDED Requirements

### Requirement: REQ-UI-010 — Tier Breakdown Display on Invoice Detail

The invoice detail sheet MUST render per-tier consumption details for utility line items that contain `tier_breakdown` data.

#### Scenario: Electricity with 3-tier breakdown
- **GIVEN** an invoice with an electricity line item: 25 kWh, total = 127,500 VND
- **AND** `tier_breakdown = { tiers: [{ tier: 1, qty: 10, price: 3500, amount: 35000 }, { tier: 2, qty: 10, price: 4500, amount: 45000 }, { tier: 3, qty: 5, price: 6000, amount: 30000 }] }`
- **WHEN** the invoice detail sheet is opened
- **THEN** each tier is displayed as a sub-row under the utility line item:
  - "Tier 1 (0–10 kWh): 10 × ₫3,500 = ₫35,000"
  - "Tier 2 (11–20 kWh): 10 × ₫4,500 = ₫45,000"
  - "Tier 3 (21+ kWh): 5 × ₫6,000 = ₫30,000"
- **AND** environment fee and VAT are shown as separate sub-lines below the tiers

#### Scenario: Utility with flat rate (no tiers)
- **GIVEN** an invoice with a utility line item where `tier_breakdown = { flatRate: true, usage: 15, unitPrice: 5000 }`
- **WHEN** the invoice detail sheet is opened
- **THEN** no tier sub-rows are shown; the line item displays as a single row

#### Scenario: Water with environment fee
- **GIVEN** an invoice with a water line item: 20 m³, tiered total = 80,000 VND
- **AND** environment fee = 8,000 VND (10% of tiered total)
- **WHEN** the invoice detail sheet is opened
- **THEN** tiers are displayed as sub-rows
- **AND** "Environment Fee (10%): ₫8,000" appears as a sub-line

---

### Requirement: REQ-UI-011 — Pro-Rate Indicator on Management Fee

When a management fee line item is pro-rated, the invoice detail sheet MUST display the pro-rate details.

#### Scenario: Pro-rated management fee display
- **GIVEN** an invoice with management fee line item containing metadata `{ proRated: true, billableDays: 15, totalDays: 30, fullMonthAmount: 524000 }`
- **WHEN** the invoice detail sheet is opened
- **THEN** a sub-line appears: "Pro-rated: 15/30 days (full month: ₫524,000)"

#### Scenario: Full-month management fee (no indicator)
- **GIVEN** an invoice with management fee line item without pro-rate metadata
- **WHEN** the invoice detail sheet is opened
- **THEN** no pro-rate sub-line is shown

---

### Requirement: REQ-UI-012 — Vacant Invoice Display in Invoices List

Vacant-apartment invoices MUST be visible in the invoices list with appropriate labeling.

#### Scenario: Vacant invoice appears in list
- **GIVEN** a vacant-apartment invoice exists for apartment B205
- **WHEN** admin views the invoices list page
- **THEN** the invoice row shows "B205 (Vacant)" in the apartment column
- **AND** the contract column shows "—" or "No contract"

#### Scenario: Filter invoices by vacant
- **GIVEN** the invoices list page is loaded
- **WHEN** admin can filter or sort to see vacant-apartment invoices
- **THEN** only invoices with `contract_id = NULL` are shown
