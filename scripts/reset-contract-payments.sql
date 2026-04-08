-- Reset payment data for contract 01cc73bf-df75-4f77-93ef-877f06e341b7
-- Run this to clear payments and test the flow again

-- 1. Delete the payments for that schedule
DELETE FROM contract_payments 
WHERE schedule_id = '93feb90f-d8b6-4aa1-8f4c-14d376d92a7d';

-- 2. Reset the payment schedule to pending
UPDATE contract_payment_schedules 
SET 
  received_amount = 0,
  status = 'pending',
  updated_at = NOW()
WHERE id = '93feb90f-d8b6-4aa1-8f4c-14d376d92a7d';

-- 3. Reset the related invoice (April 2026) if exists
UPDATE invoices 
SET 
  paid_amount = 0,
  status = 'pending',
  paid_at = NULL,
  updated_at = NOW()
WHERE contract_id = '01cc73bf-df75-4f77-93ef-877f06e341b7'
  AND billing_period = '2026-04';

-- 4. FIX THE DATA BUG: Update purchase_option_price from 2mil to 2bil
-- (This is why totalContractValue shows 2,000,000 instead of correct value)
UPDATE contracts 
SET 
  purchase_option_price = 2000000000,  -- 2 billion VND
  updated_at = NOW()
WHERE id = '01cc73bf-df75-4f77-93ef-877f06e341b7';
