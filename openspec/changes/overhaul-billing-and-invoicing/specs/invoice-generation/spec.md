# Invoice Generation — Spec Delta

## MODIFIED Requirements

### Requirement: REQ-BILL-001 — Invoice Line Items Must Include Category and VAT

Every invoice line item MUST include a `category` (rent, installment, milestone, utility_*, management_fee), `vat_rate`, and `vat_amount` to satisfy Vietnamese BQL tax separation requirements.

#### Scenario: Rental contract invoice includes rent with VAT
- **Given** an active rental contract with `rent_amount = 18,000,000 VND`
- **When** a monthly invoice is generated for billing period `2026-05`
- **Then** the invoice contains a line item with:
  - `category = "rent"`
  - `unit_price = 18,000,000`
  - `vat_rate = 0.10`
  - `vat_amount = 1,800,000`
  - `amount = 19,800,000`

#### Scenario: Utility line item has 0% VAT for electricity (thu hộ)
- **Given** an apartment with electricity meter reading for period `2026-05` showing 440 kWh consumption
- **When** a monthly invoice is generated
- **Then** the electricity line item has:
  - `category = "utility_electric"`
  - `vat_rate = 0.00`
  - `vat_amount = 0`
  - `tier_breakdown` populated with per-tier qty, price, amount

#### Scenario: Water utility includes 10% environment fee
- **Given** an apartment with water meter reading showing 25 m³ consumption
- **When** a monthly invoice is generated
- **Then** the water line item has:
  - `category = "utility_water"`
  - `environment_fee = tiered_total × 0.10`
  - `amount = tiered_total + environment_fee`

---

### Requirement: REQ-BILL-002 — Invoice Generation Supports All Contract Types

The billing processor MUST generate invoices for `rental`, `lease_to_own`, AND `purchase` contracts when billable items exist for the billing period.

#### Scenario: Purchase contract generates milestone invoice when milestone is due
- **Given** a purchase contract with a payment schedule milestone due on `2026-05-15`
- **When** bulk invoice generation runs for period `2026-05`
- **Then** an invoice is created with a `milestone` line item for the due milestone amount + VAT

#### Scenario: Lease-to-own contract generates installment invoice
- **Given** a lease-to-own contract with `purchase_option_price = 4,200,000,000 VND` and 60 installments
- **When** a monthly invoice is generated for period `2026-05`
- **Then** the invoice contains an `installment` line item with principal, interest, and VAT on interest

#### Scenario: Purchase contract with no milestone due is skipped
- **Given** a purchase contract with no payment schedule milestone due in `2026-06`
- **When** bulk invoice generation runs for period `2026-06`
- **Then** utility and management fee line items are still generated if applicable

---

### Requirement: REQ-BILL-003 — Management Fee Line Item

Monthly invoices for occupied apartments MUST include a management fee line item calculated from `management_fee_configs`.

#### Scenario: Management fee calculated from apartment area and building config
- **Given** an apartment with `area = 82.5 m²` in a building with management fee config `rate_per_sqm = 15,000 VND`
- **When** a monthly invoice is generated
- **Then** the invoice contains a `management_fee` line item:
  - `quantity = 82.5`
  - `unit_price = 15,000`
  - `vat_rate = 0.10`
  - `amount = 82.5 × 15,000 × 1.10 = 1,361,250`

#### Scenario: No management fee config means no management fee line item
- **Given** a building with no active `management_fee_configs` record
- **When** a monthly invoice is generated
- **Then** no management fee line item is included (no error thrown)

---

### Requirement: REQ-BILL-004 — Utility Billing Actually Uses Meter Readings

When generating invoices with utility categories selected, the system MUST resolve utility type codes to IDs and query meter readings by `apartment_id + billing_period + utility_type_id`.

#### Scenario: Electricity meter reading produces utility line item
- **Given** a meter reading for apartment A101 with `utility_type.code = 'electric'`, `previous_value = 12450`, `current_value = 12890` for period `2026-04`
- **And** utility tiers exist for electricity in the apartment's building
- **When** an invoice is generated for period `2026-04` with category `['rent', 'electric']`
- **Then** the invoice includes an electricity line item with `quantity = 440 kWh` and tiered pricing

#### Scenario: Missing meter reading for selected utility category
- **Given** no meter reading for gas for apartment A101 in period `2026-04`
- **When** an invoice is generated for period `2026-04` with category `['rent', 'gas']`
- **Then** no gas line item is included, but the invoice is still created with rent (no error thrown)

---

### Requirement: REQ-BILL-005 — Tiered Utility Calculation Correctness

Tiered pricing MUST process tiers sequentially, consuming from each tier until total consumption is exhausted.

#### Scenario: Two-tier electricity calculation
- **Given** consumption = 440 kWh
- **And** tiers: Tier 1 (0-200 kWh @ 1,866 VND), Tier 2 (200-∞ kWh @ 2,500 VND)
- **When** tiered amount is calculated
- **Then** result = (200 × 1,866) + (240 × 2,500) = 373,200 + 600,000 = 973,200 VND
- **And** `tier_breakdown` contains both tiers with correct qty and amounts

---

## ADDED Requirements

### Requirement: REQ-BILL-006 — Invoice Payment Reference Code

Each invoice MUST include a payment reference code for bank transfer reconciliation.

#### Scenario: Rent invoice has reference code
- **Given** a rental contract for apartment A101
- **When** an invoice is generated for period `2026-05`
- **Then** the invoice `notes` or `price_snapshot` includes `paymentReference = "A101_RENT_052026"`

---

### Requirement: REQ-BILL-007 — Invoice Subtotal and Tax Separation

The system MUST calculate invoice `subtotal` as sum of all line item `unit_price × quantity`, `tax_amount` as sum of all line item `vat_amount`, and `total_amount` as `subtotal + tax_amount`.

#### Scenario: Invoice totals correctly separate tax
- **Given** an invoice with rent (base 18M, VAT 1.8M) and electricity (973,200 VND, VAT 0)
- **When** totals are calculated
- **Then** `subtotal = 18,973,200`, `tax_amount = 1,800,000`, `total_amount = 20,773,200`
