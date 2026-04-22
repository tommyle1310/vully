-- Backfill payment_reference column from price_snapshot JSON for existing invoices
-- Run this once to populate the column for invoices created before the fix
UPDATE invoices
SET payment_reference = price_snapshot->>'paymentReference'
WHERE payment_reference IS NULL
  AND price_snapshot IS NOT NULL
  AND price_snapshot->>'paymentReference' IS NOT NULL;

-- Verify
SELECT id, invoice_number, payment_reference, price_snapshot->>'paymentReference' as snapshot_ref
FROM invoices
WHERE payment_reference IS NOT NULL
ORDER BY created_at DESC
LIMIT 20;
