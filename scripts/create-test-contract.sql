-- Create a test contract for a resident user
-- Usage: psql $DATABASE_URL -f scripts/create-test-contract.sql

\echo 'Creating test contract for resident...'

-- Replace these with actual IDs from your database
-- Find user: SELECT id, email FROM "User" WHERE role = 'RESIDENT';
-- Find apartment: SELECT id, "unitNumber" FROM "Apartment" LIMIT 5;

DO $$
DECLARE
  v_user_id UUID;
  v_apartment_id UUID;
BEGIN
  -- Get first resident user
  SELECT id INTO v_user_id FROM "User" WHERE role = 'RESIDENT' LIMIT 1;
  
  -- Get first vacant apartment
  SELECT id INTO v_apartment_id FROM "Apartment" WHERE status = 'vacant' LIMIT 1;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No resident user found';
  END IF;
  
  IF v_apartment_id IS NULL THEN
    RAISE EXCEPTION 'No vacant apartment found';
  END IF;
  
  -- Create contract
  INSERT INTO "Contract" (
    id,
    "apartmentId",
    "tenantId",
    "startDate",
    "endDate",
    "monthlyRent",
    "depositAmount",
    status,
    "createdAt",
    "updatedAt"
  ) VALUES (
    gen_random_uuid(),
    v_apartment_id,
    v_user_id,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '1 year',
    5000000, -- 5,000,000 VND monthly rent
    15000000, -- 15,000,000 VND deposit
    'active',
    NOW(),
    NOW()
  );
  
  -- Update apartment status
  UPDATE "Apartment" SET status = 'occupied' WHERE id = v_apartment_id;
  
  RAISE NOTICE 'Contract created successfully!';
  RAISE NOTICE 'User ID: %', v_user_id;
  RAISE NOTICE 'Apartment ID: %', v_apartment_id;
END $$;

\echo 'Done! Resident should now see their apartment.'
