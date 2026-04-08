-- ============================================================================
-- Reset all billing, invoicing, and payment schedule data
-- Run this to start fresh after schema/logic changes
-- ============================================================================
-- WARNING: This deletes ALL billing-related data. Contracts are preserved.
-- ============================================================================

BEGIN;

-- 1. Delete payment records (child of payment_schedules)
DELETE FROM contract_payments;

-- 2. Delete payment schedules (child of contracts)
DELETE FROM contract_payment_schedules;

-- 3. Delete invoice line items (child of invoices)
DELETE FROM invoice_line_items;

-- 4. Delete invoices
DELETE FROM invoices;

-- 5. Delete billing jobs
DELETE FROM billing_jobs;

-- 6. Delete meter readings (optional - comment out if you want to keep them)
DELETE FROM meter_readings;

-- 7. Reset any invoice-related sequences if needed
-- (invoice_number is generated in code, not a DB sequence)

COMMIT;

-- Verify cleanup
SELECT 'contract_payments' AS table_name, COUNT(*) AS row_count FROM contract_payments
UNION ALL
SELECT 'contract_payment_schedules', COUNT(*) FROM contract_payment_schedules
UNION ALL
SELECT 'invoice_line_items', COUNT(*) FROM invoice_line_items
UNION ALL
SELECT 'invoices', COUNT(*) FROM invoices
UNION ALL
SELECT 'billing_jobs', COUNT(*) FROM billing_jobs
UNION ALL
SELECT 'meter_readings', COUNT(*) FROM meter_readings;
