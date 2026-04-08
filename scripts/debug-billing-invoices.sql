-- =============================================================================
-- DEBUG: Billing Invoice Generation - Why utilities are skipped
-- =============================================================================
-- Run against your local PostgreSQL to diagnose why bulk-generate skips
-- utility meter readings instead of adding them to existing invoices.
-- =============================================================================

-- 1. All active contracts with apartment & building info
SELECT
  c.id AS contract_id,
  c.contract_type,
  c.status AS contract_status,
  c.rent_amount,
  a.unit_number,
  a.id AS apartment_id,
  b.name AS building_name,
  b.id AS building_id,
  u.email AS tenant_email,
  u.first_name || ' ' || u.last_name AS tenant_name
FROM contracts c
JOIN apartments a ON c.apartment_id = a.id
JOIN buildings b ON a.building_id = b.id
JOIN users u ON c.tenant_id = u.id
WHERE c.status = 'active'
ORDER BY a.unit_number;

-- result:
-- [{
--   "contract_id": "26b40f1c-d682-4d9e-bd63-0373a0d1d253",
--   "contract_type": "purchase",
--   "contract_status": "active",
--   "rent_amount": 0.00,
--   "unit_number": "101",
--   "apartment_id": "5a2b8a6a-0d54-4c1b-83ba-d2ae57bfa478",
--   "building_name": "Tomtown",
--   "building_id": "ff90a07e-0094-4875-9403-be979ec55ef5",
--   "tenant_email": "a@gmail.com",
--   "tenant_name": "Phuc Le"
-- }, {
--   "contract_id": "975c4208-ecc1-45f1-a2e2-b9e4186fd338",
--   "contract_type": "rental",
--   "contract_status": "active",
--   "rent_amount": 15000000.00,
--   "unit_number": "102",
--   "apartment_id": "e9db2dc1-1e77-4549-85c2-eb8521616dc9",
--   "building_name": "Tomtown",
--   "building_id": "ff90a07e-0094-4875-9403-be979ec55ef5",
--   "tenant_email": "b@gmail.com",
--   "tenant_name": "b resident"
-- }, {
--   "contract_id": "7ac70e8a-77a3-46f6-b8e9-9f463e7976b4",
--   "contract_type": "lease_to_own",
--   "contract_status": "active",
--   "rent_amount": 15000000.00,
--   "unit_number": "104",
--   "apartment_id": "be8f8991-46d3-4786-92c7-60d4d4f6b720",
--   "building_name": "Tomtown",
--   "building_id": "ff90a07e-0094-4875-9403-be979ec55ef5",
--   "tenant_email": "e@gmail.com",
--   "tenant_name": "e resident"
-- }, {
--   "contract_id": "ae0b43b5-169a-46a5-b653-33954770af44",
--   "contract_type": "rental",
--   "contract_status": "active",
--   "rent_amount": 8000000.00,
--   "unit_number": "2005",
--   "apartment_id": "4e13e23f-5983-4899-9994-2a7c7b45a76a",
--   "building_name": "Tomtown",
--   "building_id": "ff90a07e-0094-4875-9403-be979ec55ef5",
--   "tenant_email": "tommyle1310@gmail.com",
--   "tenant_name": "tommy le"
-- }, {
--   "contract_id": "01cc73bf-df75-4f77-93ef-877f06e341b7",
--   "contract_type": "lease_to_own",
--   "contract_status": "active",
--   "rent_amount": 18000000.00,
--   "unit_number": "301",
--   "apartment_id": "11c4756f-d1a7-43e4-9ef2-57e06599e9e4",
--   "building_name": "Tomtown",
--   "building_id": "ff90a07e-0094-4875-9403-be979ec55ef5",
--   "tenant_email": "d@gmail.com",
--   "tenant_name": "William Tran"
-- }, {
--   "contract_id": "74484853-a2a1-48d2-a353-748434f4815f",
--   "contract_type": "purchase",
--   "contract_status": "active",
--   "rent_amount": 0.00,
--   "unit_number": "402",
--   "apartment_id": "9c3e74c1-4ab6-4c23-83fc-3dd5685aa8a9",
--   "building_name": "Tomtown",
--   "building_id": "ff90a07e-0094-4875-9403-be979ec55ef5",
--   "tenant_email": "c@gmail.com",
--   "tenant_name": "c resident"
-- }, {
--   "contract_id": "35a5c3f7-8660-48a2-98ff-910d86371f3e",
--   "contract_type": "purchase",
--   "contract_status": "active",
--   "rent_amount": 0.00,
--   "unit_number": "501",
--   "apartment_id": "14587411-802f-45d4-864e-7fde37bcd441",
--   "building_name": "Tomtown",
--   "building_id": "ff90a07e-0094-4875-9403-be979ec55ef5",
--   "tenant_email": "a@gmail.com",
--   "tenant_name": "Phuc Le"
-- }]


-- 2. All invoices for the current billing period (2026-04) with line items
SELECT
  i.id AS invoice_id,
  i.invoice_number,
  i.billing_period,
  i.status AS invoice_status,
  i.subtotal,
  i.tax_amount,
  i.total_amount,
  a.unit_number,
  c.contract_type,
  li.description AS line_item,
  li.category,
  li.quantity,
  li.unit_price,
  li.amount AS line_amount,
  li.vat_rate,
  li.vat_amount,
  li.environment_fee,
  li.meter_reading_id
FROM invoices i
JOIN contracts c ON i.contract_id = c.id
JOIN apartments a ON c.apartment_id = a.id
LEFT JOIN invoice_line_items li ON li.invoice_id = i.id
WHERE i.billing_period = '2026-04'
ORDER BY a.unit_number, li.category;
-- result:
-- [{
--   "invoice_id": "994eb0e0-c1f5-4712-8421-747eccccf3b8",
--   "invoice_number": "INV-202604-0001",
--   "billing_period": "2026-04",
--   "invoice_status": "pending",
--   "subtotal": 15000000.00,
--   "tax_amount": 1500000.00,
--   "total_amount": 16500000.00,
--   "unit_number": "102",
--   "contract_type": "rental",
--   "line_item": "Rent for 2026-04",
--   "category": "rent",
--   "quantity": 1.00,
--   "unit_price": 15000000.0000,
--   "line_amount": 16500000.00,
--   "vat_rate": 0.1000,
--   "vat_amount": 1500000.00,
--   "environment_fee": 0.00,
--   "meter_reading_id": null
-- }, {
--   "invoice_id": "a55bbbd5-278b-4a50-bf1b-e384811920eb",
--   "invoice_number": "INV-202604-0004",
--   "billing_period": "2026-04",
--   "invoice_status": "pending",
--   "subtotal": 15000000.00,
--   "tax_amount": 1250000.00,
--   "total_amount": 16250000.00,
--   "unit_number": "104",
--   "contract_type": "lease_to_own",
--   "line_item": "Installment 1/24 - 2026-04",
--   "category": "installment",
--   "quantity": 1.00,
--   "unit_price": 15000000.0000,
--   "line_amount": 16250000.00,
--   "vat_rate": 0.1000,
--   "vat_amount": 1250000.00,
--   "environment_fee": 0.00,
--   "meter_reading_id": null
-- }, {
--   "invoice_id": "32541b15-4870-42c8-895c-dd6e9e831fa7",
--   "invoice_number": "INV-202604-0003",
--   "billing_period": "2026-04",
--   "invoice_status": "pending",
--   "subtotal": 8000000.00,
--   "tax_amount": 800000.00,
--   "total_amount": 8800000.00,
--   "unit_number": "2005",
--   "contract_type": "rental",
--   "line_item": "Rent for 2026-04",
--   "category": "rent",
--   "quantity": 1.00,
--   "unit_price": 8000000.0000,
--   "line_amount": 8800000.00,
--   "vat_rate": 0.1000,
--   "vat_amount": 800000.00,
--   "environment_fee": 0.00,
--   "meter_reading_id": null
-- }, {
--   "invoice_id": "bf9dd9bc-6142-4b1f-a2fe-40e2569154b6",
--   "invoice_number": "INV-202604-0002",
--   "billing_period": "2026-04",
--   "invoice_status": "pending",
--   "subtotal": 18000000.00,
--   "tax_amount": 833333.33,
--   "total_amount": 18833333.33,
--   "unit_number": "301",
--   "contract_type": "lease_to_own",
--   "line_item": "Installment 1/24 - 2026-04",
--   "category": "installment",
--   "quantity": 1.00,
--   "unit_price": 18000000.0000,
--   "line_amount": 18833333.33,
--   "vat_rate": 0.1000,
--   "vat_amount": 833333.33,
--   "environment_fee": 0.00,
--   "meter_reading_id": null
-- }]


-- 3. All meter readings for current period (check if 102 & 104 have readings)
SELECT
  mr.id AS reading_id,
  a.unit_number,
  ut.name AS utility_name,
  ut.code AS utility_code,
  mr.billing_period,
  mr.previous_value,
  mr.current_value,
  (mr.current_value - COALESCE(mr.previous_value, 0)) AS usage,
  mr.reading_date,
  mr.created_at
FROM meter_readings mr
JOIN apartments a ON mr.apartment_id = a.id
JOIN utility_types ut ON mr.utility_type_id = ut.id
WHERE mr.billing_period = '2026-04'
ORDER BY a.unit_number, ut.code;
-- result:
-- [{
--   "reading_id": "b0b2cbe9-59b2-4c2b-bb09-806dae31dbe0",
--   "unit_number": "102",
--   "utility_name": "Electricity",
--   "utility_code": "electric",
--   "billing_period": "2026-04",
--   "previous_value": 0.00,
--   "current_value": 100.00,
--   "usage": 100.00,
--   "reading_date": "2026-04-08",
--   "created_at": "2026-04-08 08:56:47.842+00"
-- }, {
--   "reading_id": "ddf4f89d-aca2-42d5-8a8e-f1124c9a17f1",
--   "unit_number": "104",
--   "utility_name": "Gas",
--   "utility_code": "gas",
--   "billing_period": "2026-04",
--   "previous_value": null,
--   "current_value": 100.00,
--   "usage": 100.00,
--   "reading_date": "2026-04-08",
--   "created_at": "2026-04-08 08:57:23.234+00"
-- }]


-- 4. Check which meter readings are already linked to invoice line items
SELECT
  mr.id AS reading_id,
  a.unit_number,
  ut.name AS utility_name,
  mr.billing_period,
  li.id AS line_item_id,
  li.invoice_id,
  i.invoice_number,
  CASE
    WHEN li.id IS NOT NULL THEN 'LINKED'
    ELSE 'UNLINKED (should be in an invoice!)'
  END AS link_status
FROM meter_readings mr
JOIN apartments a ON mr.apartment_id = a.id
JOIN utility_types ut ON mr.utility_type_id = ut.id
LEFT JOIN invoice_line_items li ON li.meter_reading_id = mr.id
LEFT JOIN invoices i ON li.invoice_id = i.id
WHERE mr.billing_period = '2026-04'
ORDER BY a.unit_number, ut.code;
-- result:
-- [{
--   "reading_id": "b0b2cbe9-59b2-4c2b-bb09-806dae31dbe0",
--   "unit_number": "102",
--   "utility_name": "Electricity",
--   "billing_period": "2026-04",
--   "line_item_id": null,
--   "invoice_id": null,
--   "invoice_number": null,
--   "link_status": "UNLINKED (should be in an invoice!)"
-- }, {
--   "reading_id": "ddf4f89d-aca2-42d5-8a8e-f1124c9a17f1",
--   "unit_number": "104",
--   "utility_name": "Gas",
--   "billing_period": "2026-04",
--   "line_item_id": null,
--   "invoice_id": null,
--   "invoice_number": null,
--   "link_status": "UNLINKED (should be in an invoice!)"
-- }]


-- 5. Contracts that already have an invoice => will be SKIPPED by bulk generate
-- (This is the root cause: processor skips entire contract if invoice exists,
-- even if the invoice lacks utility line items)
SELECT
  c.id AS contract_id,
  c.contract_type,
  a.unit_number,
  i.id AS existing_invoice_id,
  i.invoice_number,
  i.billing_period,
  i.total_amount,
  (SELECT COUNT(*) FROM invoice_line_items li WHERE li.invoice_id = i.id) AS line_item_count,
  (SELECT COUNT(*) FROM invoice_line_items li WHERE li.invoice_id = i.id AND li.category LIKE 'utility_%') AS utility_line_items,
  (SELECT COUNT(*) FROM meter_readings mr WHERE mr.apartment_id = a.id AND mr.billing_period = '2026-04') AS meter_readings_available
FROM contracts c
JOIN apartments a ON c.apartment_id = a.id
LEFT JOIN invoices i ON i.contract_id = c.id AND i.billing_period = '2026-04'
WHERE c.status = 'active'
ORDER BY a.unit_number;
-- result:
-- [{
--   "contract_id": "26b40f1c-d682-4d9e-bd63-0373a0d1d253",
--   "contract_type": "purchase",
--   "unit_number": "101",
--   "existing_invoice_id": null,
--   "invoice_number": null,
--   "billing_period": null,
--   "total_amount": null,
--   "line_item_count": 0,
--   "utility_line_items": 0,
--   "meter_readings_available": 0
-- }, {
--   "contract_id": "975c4208-ecc1-45f1-a2e2-b9e4186fd338",
--   "contract_type": "rental",
--   "unit_number": "102",
--   "existing_invoice_id": "994eb0e0-c1f5-4712-8421-747eccccf3b8",
--   "invoice_number": "INV-202604-0001",
--   "billing_period": "2026-04",
--   "total_amount": 16500000.00,
--   "line_item_count": 1,
--   "utility_line_items": 0,
--   "meter_readings_available": 1
-- }, {
--   "contract_id": "7ac70e8a-77a3-46f6-b8e9-9f463e7976b4",
--   "contract_type": "lease_to_own",
--   "unit_number": "104",
--   "existing_invoice_id": "a55bbbd5-278b-4a50-bf1b-e384811920eb",
--   "invoice_number": "INV-202604-0004",
--   "billing_period": "2026-04",
--   "total_amount": 16250000.00,
--   "line_item_count": 1,
--   "utility_line_items": 0,
--   "meter_readings_available": 1
-- }, {
--   "contract_id": "ae0b43b5-169a-46a5-b653-33954770af44",
--   "contract_type": "rental",
--   "unit_number": "2005",
--   "existing_invoice_id": "32541b15-4870-42c8-895c-dd6e9e831fa7",
--   "invoice_number": "INV-202604-0003",
--   "billing_period": "2026-04",
--   "total_amount": 8800000.00,
--   "line_item_count": 1,
--   "utility_line_items": 0,
--   "meter_readings_available": 0
-- }, {
--   "contract_id": "01cc73bf-df75-4f77-93ef-877f06e341b7",
--   "contract_type": "lease_to_own",
--   "unit_number": "301",
--   "existing_invoice_id": "bf9dd9bc-6142-4b1f-a2fe-40e2569154b6",
--   "invoice_number": "INV-202604-0002",
--   "billing_period": "2026-04",
--   "total_amount": 18833333.33,
--   "line_item_count": 1,
--   "utility_line_items": 0,
--   "meter_readings_available": 0
-- }, {
--   "contract_id": "74484853-a2a1-48d2-a353-748434f4815f",
--   "contract_type": "purchase",
--   "unit_number": "402",
--   "existing_invoice_id": null,
--   "invoice_number": null,
--   "billing_period": null,
--   "total_amount": null,
--   "line_item_count": 0,
--   "utility_line_items": 0,
--   "meter_readings_available": 0
-- }, {
--   "contract_id": "35a5c3f7-8660-48a2-98ff-910d86371f3e",
--   "contract_type": "purchase",
--   "unit_number": "501",
--   "existing_invoice_id": null,
--   "invoice_number": null,
--   "billing_period": null,
--   "total_amount": null,
--   "line_item_count": 0,
--   "utility_line_items": 0,
--   "meter_readings_available": 0
-- }]


-- 6. Contracts WITHOUT invoices for the period (should be created by bulk generate)
SELECT
  c.id AS contract_id,
  c.contract_type,
  a.unit_number,
  c.rent_amount,
  'NO INVOICE YET' AS status
FROM contracts c
JOIN apartments a ON c.apartment_id = a.id
WHERE c.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM invoices i
    WHERE i.contract_id = c.id AND i.billing_period = '2026-04'
  )
ORDER BY a.unit_number;
-- result:
-- [{
--   "contract_id": "26b40f1c-d682-4d9e-bd63-0373a0d1d253",
--   "contract_type": "purchase",
--   "unit_number": "101",
--   "rent_amount": 0.00,
--   "status": "NO INVOICE YET"
-- }, {
--   "contract_id": "74484853-a2a1-48d2-a353-748434f4815f",
--   "contract_type": "purchase",
--   "unit_number": "402",
--   "rent_amount": 0.00,
--   "status": "NO INVOICE YET"
-- }, {
--   "contract_id": "35a5c3f7-8660-48a2-98ff-910d86371f3e",
--   "contract_type": "purchase",
--   "unit_number": "501",
--   "rent_amount": 0.00,
--   "status": "NO INVOICE YET"
-- }]


-- 7. Recent billing jobs: check error_log for skip/created counts
SELECT
  bj.id AS job_id,
  bj.billing_period,
  bj.status AS job_status,
  bj.total_contracts,
  bj.processed_count,
  bj.failed_count,
  bj.error_log,
  bj.started_at,
  bj.completed_at
FROM billing_jobs bj
ORDER BY bj.created_at DESC
LIMIT 5;
-- result:
-- [{
--   "job_id": "bca48590-a110-442a-a11c-92e12ca5a872",
--   "billing_period": "2026-04",
--   "job_status": "completed",
--   "total_contracts": 7,
--   "processed_count": 7,
--   "failed_count": 0,
--   "error_log": "{\"createdCount\": 0, \"skippedCount\": 7, \"createdByType\": {}}",
--   "started_at": "2026-04-08 08:57:33.028+00",
--   "completed_at": "2026-04-08 08:57:36.799+00"
-- }, {
--   "job_id": "35a67540-458f-40fd-9dde-16bc4c6732f1",
--   "billing_period": "2026-04",
--   "job_status": "completed",
--   "total_contracts": 7,
--   "processed_count": 7,
--   "failed_count": 0,
--   "error_log": "{\"createdCount\": 4, \"skippedCount\": 3, \"createdByType\": {\"rental\": 2, \"lease_to_own\": 2}}",
--   "started_at": "2026-04-08 08:48:55.586+00",
--   "completed_at": "2026-04-08 08:49:05.206+00"
-- }]


-- 8. Utility types & tiers configuration (verify pricing exists)
SELECT
  ut.id AS utility_type_id,
  ut.code,
  ut.name,
  ut.unit,
  ut.is_active,
  tier.tier_number,
  tier.min_usage,
  tier.max_usage,
  tier.unit_price,
  tier.building_id,
  b.name AS building_name,
  tier.effective_from,
  tier.effective_to
FROM utility_types ut
LEFT JOIN utility_tiers tier ON tier.utility_type_id = ut.id
LEFT JOIN buildings b ON tier.building_id = b.id
WHERE ut.is_active = true
ORDER BY ut.code, tier.tier_number;
-- result:
-- [{
--   "utility_type_id": "f41f71a1-340e-458c-bf84-d2ef81626a14",
--   "code": "electric",
--   "name": "Electricity",
--   "unit": "kWh",
--   "is_active": true,
--   "tier_number": null,
--   "min_usage": null,
--   "max_usage": null,
--   "unit_price": null,
--   "building_id": null,
--   "building_name": null,
--   "effective_from": null,
--   "effective_to": null
-- }, {
--   "utility_type_id": "0b864e2e-5337-44e3-b64a-b7b216d5edab",
--   "code": "gas",
--   "name": "Gas",
--   "unit": "kg",
--   "is_active": true,
--   "tier_number": null,
--   "min_usage": null,
--   "max_usage": null,
--   "unit_price": null,
--   "building_id": null,
--   "building_name": null,
--   "effective_from": null,
--   "effective_to": null
-- }, {
--   "utility_type_id": "db0296e0-4559-474a-b2e2-693588d21958",
--   "code": "water",
--   "name": "Water",
--   "unit": "m³",
--   "is_active": true,
--   "tier_number": null,
--   "min_usage": null,
--   "max_usage": null,
--   "unit_price": null,
--   "building_id": null,
--   "building_name": null,
--   "effective_from": null,
--   "effective_to": null
-- }]


-- 9. Management fee configs
SELECT
  mfc.id,
  b.name AS building_name,
  mfc.price_per_sqm,
  mfc.effective_from,
  mfc.effective_to
FROM management_fee_configs mfc
JOIN buildings b ON mfc.building_id = b.id
ORDER BY b.name, mfc.effective_from DESC;
-- result: empty

-- 10. DIAGNOSIS SUMMARY: Show the gap
-- For each active contract that has an invoice but is missing utility charges:
SELECT
  a.unit_number,
  c.contract_type,
  i.invoice_number,
  i.total_amount AS current_total,
  STRING_AGG(DISTINCT li.category, ', ') AS existing_categories,
  (SELECT COUNT(*) FROM meter_readings mr WHERE mr.apartment_id = a.id AND mr.billing_period = '2026-04') AS unlinked_readings,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM meter_readings mr
      WHERE mr.apartment_id = a.id
        AND mr.billing_period = '2026-04'
        AND NOT EXISTS (
          SELECT 1 FROM invoice_line_items li2
          WHERE li2.meter_reading_id = mr.id
        )
    )
    THEN '⚠️ HAS UNLINKED METER READINGS - needs invoice update'
    ELSE '✅ All readings linked'
  END AS diagnosis
FROM contracts c
JOIN apartments a ON c.apartment_id = a.id
JOIN invoices i ON i.contract_id = c.id AND i.billing_period = '2026-04'
LEFT JOIN invoice_line_items li ON li.invoice_id = i.id
WHERE c.status = 'active'
GROUP BY a.unit_number, c.contract_type, i.invoice_number, i.total_amount, a.id
ORDER BY a.unit_number;
-- result:
-- [{
--   "unit_number": "102",
--   "contract_type": "rental",
--   "invoice_number": "INV-202604-0001",
--   "current_total": 16500000.00,
--   "existing_categories": "rent",
--   "unlinked_readings": 1,
--   "diagnosis": "⚠️ HAS UNLINKED METER READINGS - needs invoice update"
-- }, {
--   "unit_number": "104",
--   "contract_type": "lease_to_own",
--   "invoice_number": "INV-202604-0004",
--   "current_total": 16250000.00,
--   "existing_categories": "installment",
--   "unlinked_readings": 1,
--   "diagnosis": "⚠️ HAS UNLINKED METER READINGS - needs invoice update"
-- }, {
--   "unit_number": "2005",
--   "contract_type": "rental",
--   "invoice_number": "INV-202604-0003",
--   "current_total": 8800000.00,
--   "existing_categories": "rent",
--   "unlinked_readings": 0,
--   "diagnosis": "✅ All readings linked"
-- }, {
--   "unit_number": "301",
--   "contract_type": "lease_to_own",
--   "invoice_number": "INV-202604-0002",
--   "current_total": 18833333.33,
--   "existing_categories": "installment",
--   "unlinked_readings": 0,
--   "diagnosis": "✅ All readings linked"
-- }]
