-- =============================================================================
-- BILLING DIAGNOSTIC: Why "No billable items" for 4 contracts?
-- Run against your database to identify missing data.
-- =============================================================================

-- 1. All active contracts with their type and rent_amount
SELECT
  c.id AS contract_id,
  LEFT(c.id::text, 8) AS short_id,
  c.contract_type,
  c.status,
  c.rent_amount,
  c.purchase_option_price,
  a.unit_number,
  a.building_id,
  b.name AS building_name
FROM contracts c
JOIN apartments a ON a.id = c.apartment_id
JOIN buildings b ON b.id = a.building_id
WHERE c.status = 'active'
ORDER BY c.contract_type, c.created_at;

-- result:
-- [{
--   "contract_id": "975c4208-ecc1-45f1-a2e2-b9e4186fd338",
--   "short_id": "975c4208",
--   "contract_type": "rental",
--   "status": "active",
--   "rent_amount": 15000000.00,
--   "purchase_option_price": null,
--   "unit_number": "102",
--   "building_id": "ff90a07e-0094-4875-9403-be979ec55ef5",
--   "building_name": "Tomtown"
-- }, {
--   "contract_id": "ae0b43b5-169a-46a5-b653-33954770af44",
--   "short_id": "ae0b43b5",
--   "contract_type": "rental",
--   "status": "active",
--   "rent_amount": 8000000.00,
--   "purchase_option_price": null,
--   "unit_number": "2005",
--   "building_id": "ff90a07e-0094-4875-9403-be979ec55ef5",
--   "building_name": "Tomtown"
-- }, {
--   "contract_id": "26b40f1c-d682-4d9e-bd63-0373a0d1d253",
--   "short_id": "26b40f1c",
--   "contract_type": "purchase",
--   "status": "active",
--   "rent_amount": 0.00,
--   "purchase_option_price": null,
--   "unit_number": "101",
--   "building_id": "ff90a07e-0094-4875-9403-be979ec55ef5",
--   "building_name": "Tomtown"
-- }, {
--   "contract_id": "74484853-a2a1-48d2-a353-748434f4815f",
--   "short_id": "74484853",
--   "contract_type": "purchase",
--   "status": "active",
--   "rent_amount": 0.00,
--   "purchase_option_price": null,
--   "unit_number": "402",
--   "building_id": "ff90a07e-0094-4875-9403-be979ec55ef5",
--   "building_name": "Tomtown"
-- }, {
--   "contract_id": "35a5c3f7-8660-48a2-98ff-910d86371f3e",
--   "short_id": "35a5c3f7",
--   "contract_type": "purchase",
--   "status": "active",
--   "rent_amount": 0.00,
--   "purchase_option_price": null,
--   "unit_number": "501",
--   "building_id": "ff90a07e-0094-4875-9403-be979ec55ef5",
--   "building_name": "Tomtown"
-- }, {
--   "contract_id": "01cc73bf-df75-4f77-93ef-877f06e341b7",
--   "short_id": "01cc73bf",
--   "contract_type": "lease_to_own",
--   "status": "active",
--   "rent_amount": 18000000.00,
--   "purchase_option_price": 2000000.00,
--   "unit_number": "301",
--   "building_id": "ff90a07e-0094-4875-9403-be979ec55ef5",
--   "building_name": "Tomtown"
-- }, {
--   "contract_id": "7ac70e8a-77a3-46f6-b8e9-9f463e7976b4",
--   "short_id": "7ac70e8a",
--   "contract_type": "lease_to_own",
--   "status": "active",
--   "rent_amount": 15000000.00,
--   "purchase_option_price": 3000000000.00,
--   "unit_number": "104",
--   "building_id": "ff90a07e-0094-4875-9403-be979ec55ef5",
--   "building_name": "Tomtown"
-- }]


-- 2. Payment schedules (milestones) — are any due in April 2026?
SELECT
  cps.contract_id,
  LEFT(cps.contract_id::text, 8) AS short_id,
  c.contract_type,
  cps.period_label,
  cps.sequence_number,
  cps.due_date,
  cps.expected_amount,
  cps.status,
  CASE
    WHEN cps.due_date >= '2026-04-01' AND cps.due_date <= '2026-04-30'
    THEN '✅ IN April 2026'
    ELSE '❌ NOT in April 2026 (due ' || cps.due_date::text || ')'
  END AS april_eligible
FROM contract_payment_schedules cps
JOIN contracts c ON c.id = cps.contract_id
WHERE c.status = 'active'
ORDER BY cps.contract_id, cps.sequence_number;

-- result:
-- [{
--   "contract_id": "26b40f1c-d682-4d9e-bd63-0373a0d1d253",
--   "short_id": "26b40f1c",
--   "contract_type": "purchase",
--   "period_label": "Down Payment",
--   "sequence_number": 1,
--   "due_date": "2026-04-03",
--   "expected_amount": 1000000000.00,
--   "status": "paid",
--   "april_eligible": "✅ IN April 2026"
-- }, {
--   "contract_id": "26b40f1c-d682-4d9e-bd63-0373a0d1d253",
--   "short_id": "26b40f1c",
--   "contract_type": "purchase",
--   "period_label": "Progress Payment 1",
--   "sequence_number": 2,
--   "due_date": "2026-05-03",
--   "expected_amount": 1000000000.00,
--   "status": "pending",
--   "april_eligible": "❌ NOT in April 2026 (due 2026-05-03)"
-- }, {
--   "contract_id": "26b40f1c-d682-4d9e-bd63-0373a0d1d253",
--   "short_id": "26b40f1c",
--   "contract_type": "purchase",
--   "period_label": "Progress Payment 2",
--   "sequence_number": 3,
--   "due_date": "2026-06-03",
--   "expected_amount": 1000000000.00,
--   "status": "pending",
--   "april_eligible": "❌ NOT in April 2026 (due 2026-06-03)"
-- }, {
--   "contract_id": "26b40f1c-d682-4d9e-bd63-0373a0d1d253",
--   "short_id": "26b40f1c",
--   "contract_type": "purchase",
--   "period_label": "Progress Payment 3",
--   "sequence_number": 4,
--   "due_date": "2026-07-03",
--   "expected_amount": 1000000000.00,
--   "status": "pending",
--   "april_eligible": "❌ NOT in April 2026 (due 2026-07-03)"
-- }, {
--   "contract_id": "74484853-a2a1-48d2-a353-748434f4815f",
--   "short_id": "74484853",
--   "contract_type": "purchase",
--   "period_label": "Down Payment",
--   "sequence_number": 1,
--   "due_date": "2026-04-04",
--   "expected_amount": 1000000000.00,
--   "status": "overdue",
--   "april_eligible": "✅ IN April 2026"
-- }, {
--   "contract_id": "74484853-a2a1-48d2-a353-748434f4815f",
--   "short_id": "74484853",
--   "contract_type": "purchase",
--   "period_label": "Progress Payment 1",
--   "sequence_number": 2,
--   "due_date": "2026-05-04",
--   "expected_amount": 750000000.00,
--   "status": "pending",
--   "april_eligible": "❌ NOT in April 2026 (due 2026-05-04)"
-- }, {
--   "contract_id": "74484853-a2a1-48d2-a353-748434f4815f",
--   "short_id": "74484853",
--   "contract_type": "purchase",
--   "period_label": "Progress Payment 2",
--   "sequence_number": 3,
--   "due_date": "2026-06-04",
--   "expected_amount": 750000000.00,
--   "status": "pending",
--   "april_eligible": "❌ NOT in April 2026 (due 2026-06-04)"
-- }, {
--   "contract_id": "74484853-a2a1-48d2-a353-748434f4815f",
--   "short_id": "74484853",
--   "contract_type": "purchase",
--   "period_label": "Progress Payment 3",
--   "sequence_number": 4,
--   "due_date": "2026-07-04",
--   "expected_amount": 750000000.00,
--   "status": "pending",
--   "april_eligible": "❌ NOT in April 2026 (due 2026-07-04)"
-- }, {
--   "contract_id": "74484853-a2a1-48d2-a353-748434f4815f",
--   "short_id": "74484853",
--   "contract_type": "purchase",
--   "period_label": "Final Payment - Property Transfer",
--   "sequence_number": 5,
--   "due_date": "2026-04-10",
--   "expected_amount": 750000000.00,
--   "status": "pending",
--   "april_eligible": "✅ IN April 2026"
-- }]


-- 3. Meter readings for April 2026 — do any exist?
SELECT
  mr.apartment_id,
  a.unit_number,
  mr.billing_period,
  mr.utility_type_id,
  ut.name AS utility_name,
  mr.previous_value,
  mr.current_value,
  (mr.current_value - mr.previous_value) AS usage
FROM meter_readings mr
JOIN apartments a ON a.id = mr.apartment_id
LEFT JOIN utility_types ut ON ut.id = mr.utility_type_id
WHERE mr.billing_period = '2026-04'
ORDER BY a.unit_number

-- result:
-- [{
--   "apartment_id": "5a2b8a6a-0d54-4c1b-83ba-d2ae57bfa478",
--   "unit_number": "101",
--   "billing_period": "2026-04",
--   "utility_type_id": "f41f71a1-340e-458c-bf84-d2ef81626a14",
--   "utility_name": "Electricity",
--   "previous_value": null,
--   "current_value": 100.00,
--   "usage": null
-- }, {
--   "apartment_id": "5a2b8a6a-0d54-4c1b-83ba-d2ae57bfa478",
--   "unit_number": "101",
--   "billing_period": "2026-04",
--   "utility_type_id": "db0296e0-4559-474a-b2e2-693588d21958",
--   "utility_name": "Water",
--   "previous_value": null,
--   "current_value": 200.00,
--   "usage": null
-- }, {
--   "apartment_id": "4e13e23f-5983-4899-9994-2a7c7b45a76a",
--   "unit_number": "2005",
--   "billing_period": "2026-04",
--   "utility_type_id": "f41f71a1-340e-458c-bf84-d2ef81626a14",
--   "utility_name": "Electricity",
--   "previous_value": null,
--   "current_value": 100.00,
--   "usage": null
-- }]


-- 4. Management fee configs — are any configured?
SELECT
  mfc.id,
  mfc.building_id,
  b.name AS building_name,
  mfc.price_per_sqm,
  mfc.effective_from,
  mfc.effective_to,
  CASE
    WHEN mfc.effective_from <= '2026-04-15'
      AND (mfc.effective_to IS NULL OR mfc.effective_to >= '2026-04-15')
    THEN '✅ Active for April 2026'
    ELSE '❌ NOT active for April 2026'
  END AS april_active
FROM management_fee_configs mfc
JOIN buildings b ON b.id = mfc.building_id
ORDER BY mfc.building_id, mfc.effective_from;

-- empty result 

-- 5. Summary: For each active contract, what CAN be billed in April 2026?
WITH contract_data AS (
  SELECT
    c.id AS contract_id,
    LEFT(c.id::text, 8) AS short_id,
    c.contract_type,
    c.rent_amount,
    a.id AS apartment_id,
    a.unit_number,
    a.building_id,
    a.net_area,
    a.gross_area
  FROM contracts c
  JOIN apartments a ON a.id = c.apartment_id
  WHERE c.status = 'active'
),
has_milestone AS (
  SELECT contract_id, COUNT(*) AS cnt
  FROM contract_payment_schedules
  WHERE due_date >= '2026-04-01' AND due_date <= '2026-04-30'
    AND status IN ('pending', 'overdue')
  GROUP BY contract_id
),
has_readings AS (
  SELECT apartment_id, COUNT(*) AS cnt
  FROM meter_readings
  WHERE billing_period = '2026-04'
  GROUP BY apartment_id
),
has_mgmt_fee AS (
  SELECT building_id, price_per_sqm
  FROM management_fee_configs
  WHERE effective_from <= '2026-04-15'
    AND (effective_to IS NULL OR effective_to >= '2026-04-15')
),
existing_invoice AS (
  SELECT contract_id
  FROM invoices
  WHERE billing_period = '2026-04'
)
SELECT
  cd.short_id,
  cd.contract_type,
  cd.unit_number,
  cd.rent_amount,
  CASE cd.contract_type
    WHEN 'rental' THEN
      CASE WHEN cd.rent_amount > 0 THEN '✅ rent=' || cd.rent_amount ELSE '❌ rent=0' END
    WHEN 'lease_to_own' THEN
      CASE WHEN cd.rent_amount > 0 THEN '✅ installment=' || cd.rent_amount ELSE '❌ rent=0' END
    WHEN 'purchase' THEN
      CASE WHEN COALESCE(hm.cnt, 0) > 0 THEN '✅ ' || hm.cnt || ' milestone(s) due' ELSE '❌ no milestones due in April' END
  END AS primary_billing,
  CASE WHEN COALESCE(hr.cnt, 0) > 0 THEN '✅ ' || hr.cnt || ' reading(s)' ELSE '❌ no readings' END AS utilities,
  CASE WHEN hmf.price_per_sqm IS NOT NULL AND COALESCE(cd.net_area, cd.gross_area, 0) > 0
    THEN '✅ ' || hmf.price_per_sqm || '/sqm × ' || COALESCE(cd.net_area, cd.gross_area) || 'sqm'
    ELSE '❌ no config or no area'
  END AS management_fee,
  CASE WHEN ei.contract_id IS NOT NULL THEN '⏭️ ALREADY EXISTS' ELSE '' END AS existing_invoice,
  CASE
    WHEN ei.contract_id IS NOT NULL THEN 'SKIP (existing)'
    WHEN (cd.contract_type = 'rental' AND cd.rent_amount > 0)
      OR (cd.contract_type = 'lease_to_own' AND cd.rent_amount > 0)
      OR (cd.contract_type = 'purchase' AND COALESCE(hm.cnt, 0) > 0)
      OR COALESCE(hr.cnt, 0) > 0
      OR (hmf.price_per_sqm IS NOT NULL AND COALESCE(cd.net_area, cd.gross_area, 0) > 0)
    THEN '✅ CAN generate invoice'
    ELSE '❌ NO BILLABLE ITEMS — will fail'
  END AS verdict
FROM contract_data cd
LEFT JOIN has_milestone hm ON hm.contract_id = cd.contract_id
LEFT JOIN has_readings hr ON hr.apartment_id = cd.apartment_id
LEFT JOIN has_mgmt_fee hmf ON hmf.building_id = cd.building_id
LEFT JOIN existing_invoice ei ON ei.contract_id = cd.contract_id
ORDER BY cd.contract_type, cd.unit_number;

-- result:
-- [{
--   "short_id": "975c4208",
--   "contract_type": "rental",
--   "unit_number": "102",
--   "rent_amount": 15000000.00,
--   "primary_billing": "✅ rent=15000000.00",
--   "utilities": "❌ no readings",
--   "management_fee": "❌ no config or no area",
--   "existing_invoice": "⏭️ ALREADY EXISTS",
--   "verdict": "SKIP (existing)"
-- }, {
--   "short_id": "ae0b43b5",
--   "contract_type": "rental",
--   "unit_number": "2005",
--   "rent_amount": 8000000.00,
--   "primary_billing": "✅ rent=8000000.00",
--   "utilities": "✅ 1 reading(s)",
--   "management_fee": "❌ no config or no area",
--   "existing_invoice": "⏭️ ALREADY EXISTS",
--   "verdict": "SKIP (existing)"
-- }, {
--   "short_id": "26b40f1c",
--   "contract_type": "purchase",
--   "unit_number": "101",
--   "rent_amount": 0.00,
--   "primary_billing": "❌ no milestones due in April",
--   "utilities": "✅ 2 reading(s)",
--   "management_fee": "❌ no config or no area",
--   "existing_invoice": "",
--   "verdict": "✅ CAN generate invoice"
-- }, {
--   "short_id": "74484853",
--   "contract_type": "purchase",
--   "unit_number": "402",
--   "rent_amount": 0.00,
--   "primary_billing": "✅ 2 milestone(s) due",
--   "utilities": "❌ no readings",
--   "management_fee": "❌ no config or no area",
--   "existing_invoice": "",
--   "verdict": "✅ CAN generate invoice"
-- }, {
--   "short_id": "35a5c3f7",
--   "contract_type": "purchase",
--   "unit_number": "501",
--   "rent_amount": 0.00,
--   "primary_billing": "❌ no milestones due in April",
--   "utilities": "❌ no readings",
--   "management_fee": "❌ no config or no area",
--   "existing_invoice": "",
--   "verdict": "❌ NO BILLABLE ITEMS — will fail"
-- }, {
--   "short_id": "7ac70e8a",
--   "contract_type": "lease_to_own",
--   "unit_number": "104",
--   "rent_amount": 15000000.00,
--   "primary_billing": "✅ installment=15000000.00",
--   "utilities": "❌ no readings",
--   "management_fee": "❌ no config or no area",
--   "existing_invoice": "",
--   "verdict": "✅ CAN generate invoice"
-- }, {
--   "short_id": "01cc73bf",
--   "contract_type": "lease_to_own",
--   "unit_number": "301",
--   "rent_amount": 18000000.00,
--   "primary_billing": "✅ installment=18000000.00",
--   "utilities": "❌ no readings",
--   "management_fee": "❌ no config or no area",
--   "existing_invoice": "⏭️ ALREADY EXISTS",
--   "verdict": "SKIP (existing)"
-- }]

