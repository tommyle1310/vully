-- Backfill apartment_id from contracts
UPDATE invoices i
SET apartment_id = c.apartment_id
FROM contracts c
WHERE i.contract_id = c.id
  AND i.apartment_id IS NULL;

-- Add CHECK constraint: at least one reference must be non-null
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invoices_must_have_reference'
  ) THEN
    ALTER TABLE invoices ADD CONSTRAINT invoices_must_have_reference
      CHECK (contract_id IS NOT NULL OR apartment_id IS NOT NULL);
  END IF;
END $$;
