# Design: Billing Pro-Rate & Vacant Apartment Fees

## 1. Pro-Rate Management Fee (Mid-Month Move-In)

### Current Behavior
`buildManagementFeeLineItem()` in `invoice-calculator.service.ts` always charges:
```
fee = net_area × price_per_sqm (full month)
```

### Proposed Behavior
When the contract's `start_date` falls within the billing period, pro-rate:
```
days_in_month = calendar days of billing period month
contract_start_day = day of month the contract starts
billable_days = days_in_month - contract_start_day + 1
fee = net_area × price_per_sqm × (billable_days / days_in_month)
```

Similarly, if the contract terminates mid-month (`end_date` within billing period):
```
billable_days = contract_end_day
fee = net_area × price_per_sqm × (billable_days / days_in_month)
```

### Implementation Changes
- `calculateInvoice()` already receives `contractId` — fetch `contracts.start_date` and `contracts.end_date`
- Pass `contractStartDate` and `contractEndDate` to `buildManagementFeeLineItem()`
- Calculate `proRateFactor` (0.0 – 1.0); if factor < 1.0, append "(Pro-rated: X/Y days)" to description
- Store pro-rate metadata in the line item for frontend display:
  ```json
  { "proRated": true, "billableDays": 15, "totalDays": 30, "fullMonthAmount": 500000 }
  ```

### Decision: Pro-rate scope
Only management fee is pro-rated. Utilities are consumption-based (meter readings), so they're already naturally proportional. Parking/trash are NOT pro-rated (charged full month per Vietnamese building management convention).

### Decision: Rounding rule
Vietnamese accounting does not use fractional đồng. All pro-rated amounts are rounded to the nearest VND using `Math.round()`. This applies to:
- `baseAmount = Math.round(area × ratePerSqm × proRateFactor)`
- `vatAmount = Math.round(baseAmount × vatRate)`
- All tier calculation intermediate values remain precise; only final line item amounts are rounded.

---

## 2. Vacant Apartment Billing

### Problem
Current invoices require `contract_id` (non-nullable FK). Vacant apartments have no contract, so they can't receive invoices.

### Decision: Make `contract_id` nullable + add `apartment_id` FK

**Why not a separate table?**
- Reuses existing invoice infrastructure (line items, payment tracking, VietQR, UI)
- No duplication of invoice logic
- Filterable alongside regular invoices

**Constraints:**
- `CHECK (contract_id IS NOT NULL OR apartment_id IS NOT NULL)` — at least one must be set
- When `contract_id` is set, `apartment_id` can be derived (but storing it directly simplifies queries)
- Vacant invoices have `invoice_stream = 'operational'`

### Billing Flow for Vacant Apartments

```
┌─────────────────────────────────────────────────────────────┐
│              Monthly Billing Processor                       │
├──────────────────────────────┬──────────────────────────────┤
│  Pass 1: Active Contracts    │  Pass 2: Vacant Apartments   │
│  (existing behavior)         │  (NEW)                       │
│                              │                              │
│  For each active contract:   │  For each vacant apartment:  │
│  - Rent/LTO/Purchase         │  - Management fee only       │
│  - Utilities (meter-based)   │  - No utilities (no meters)  │
│  - Management fee            │  - No trash (configurable)   │
│  - Trash, Parking            │  - Parking if assigned       │
│                              │                              │
│  → invoice.contract_id = X   │  → invoice.apartment_id = Y  │
│  → invoice.apartment_id = X  │  → invoice.contract_id = null│
└──────────────────────────────┴──────────────────────────────┘
```

### Who pays for vacant apartments?
- If `apartments.owner_id` is set → bill the owner
- If no owner → skip (building management decides manually)
- Invoice `notes` field: "Management fee for vacant unit {unit_number}"

### Vacant Apartment Query
```sql
SELECT a.id, a.unit_number, a.net_area, a.gross_area, a.owner_id, a.building_id
FROM apartments a
WHERE a.status = 'vacant'
  AND a.building_id = :buildingId
  AND NOT EXISTS (
    SELECT 1 FROM contracts c
    WHERE c.apartment_id = a.id AND c.status = 'active'
  )
  AND a.owner_id IS NOT NULL  -- Must have an owner to bill
```

### Invoice Number Format for Vacant
Use same format: `INV-YYYYMM-XXXX` (no distinction needed, since the invoice contains proper line items and notes).

### VietQR Payment Reference for Vacant
Contract-based invoices use `{UNIT}_{TYPE}_{PERIOD}` (e.g., `A101_RENT_202604`). For vacant invoices with no contract, use:
```
{Unit_Number}_MGMT_{PERIOD}
```
Example: `B205_MGMT_202604` — so accounting can immediately identify the unit regardless of tenant status.

### Owner Notification
When a vacant invoice is generated, enqueue a notification to the apartment's `owner_id`:
- Channel: email (primary) + in-app notification
- Template: "Management fee invoice #{invoice_number} for unit {unit_number} — ₫{total_amount} due by {due_date}"
- Use existing `notifications` table for in-app; email via future notification hub (or simple queue job for now)

---

## 3. Frontend Tier Breakdown Display

### Current State
- `invoice_line_items.tier_breakdown` stores:
  ```json
  { "tiers": [{ "tier": 1, "qty": 10, "price": 3500, "amount": 35000 }, ...] }
  ```
- Frontend `InvoiceLineItem` type includes `tierBreakdown?: Record<string, unknown>`
- **Not rendered** in the invoice detail sheet

### Proposed UI

Within the invoice detail sheet, for utility line items with `tier_breakdown`:

```
┌─────────────────────────────────────────────────┐
│ Electricity — 25 kWh                    ₫127,500│
│ ├── Tier 1 (0–10 kWh):  10 × ₫3,500 = ₫35,000 │
│ ├── Tier 2 (11–20 kWh): 10 × ₫4,500 = ₫45,000 │
│ └── Tier 3 (21+ kWh):    5 × ₫6,000 = ₫30,000 │
│     + Environment Fee (10%):            ₫12,750 │
│     + VAT (0%):                              ₫0 │
└─────────────────────────────────────────────────┘
```

Implementation:
- Add a collapsible section under each utility line item in the invoice detail sheet
- Parse `tier_breakdown.tiers` array and render as sub-rows
- Show environment fee and VAT as separate sub-lines
- Use Shadcn `Collapsible` component (or always show if ≤5 tiers)

### Pro-Rate Indicator

For management fee with pro-rate metadata:
```
┌─────────────────────────────────────────────────┐
│ Management Fee (65.5 m² × ₫8,000/m²)   ₫262,000│
│ └── Pro-rated: 15/30 days (full: ₫524,000)      │
│     + VAT (10%):                        ₫26,200 │
└─────────────────────────────────────────────────┘
```

---

## 4. Schema Changes Summary

```sql
-- Make contract_id nullable, add apartment_id
ALTER TABLE invoices ALTER COLUMN contract_id DROP NOT NULL;
ALTER TABLE invoices ADD COLUMN apartment_id UUID REFERENCES apartments(id) ON DELETE CASCADE;
ALTER TABLE invoices ADD CONSTRAINT invoices_must_have_reference
  CHECK (contract_id IS NOT NULL OR apartment_id IS NOT NULL);
CREATE INDEX idx_invoices_apartment_id ON invoices(apartment_id);

-- Backfill apartment_id from existing contract data
UPDATE invoices i
SET apartment_id = c.apartment_id
FROM contracts c
WHERE i.contract_id = c.id;
```

### Prisma Schema Update
```prisma
model invoices {
  contract_id   String?   @db.Uuid  // nullable now
  apartment_id  String?   @db.Uuid  // NEW
  // ... rest unchanged
  contracts     contracts?  @relation(fields: [contract_id], references: [id], onDelete: Cascade)
  apartments    apartments? @relation(fields: [apartment_id], references: [id], onDelete: Cascade)
}
```
