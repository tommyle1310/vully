-- Migration: Add Operations Automation Tables
-- Run: prisma migrate dev --name add-operations-automation
-- Or manually: psql -d vully -f this_file.sql

-- ============================================================
-- 1. UNMATCHED PAYMENTS (for VietQR webhook reconciliation)
-- ============================================================
CREATE TABLE IF NOT EXISTS "unmatched_payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "gateway" VARCHAR(20) NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "sender_name" VARCHAR(200),
    "description" TEXT,
    "received_at" TIMESTAMPTZ(6) NOT NULL,
    "raw_payload" JSONB NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "matched_invoice_id" UUID,
    "matched_by" UUID,
    "matched_at" TIMESTAMPTZ(6),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "unmatched_payments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "unmatched_payments_transaction_id_key" ON "unmatched_payments"("transaction_id");
CREATE INDEX IF NOT EXISTS "unmatched_payments_status_idx" ON "unmatched_payments"("status");
CREATE INDEX IF NOT EXISTS "unmatched_payments_received_at_idx" ON "unmatched_payments"("received_at");
CREATE INDEX IF NOT EXISTS "unmatched_payments_amount_idx" ON "unmatched_payments"("amount");

-- Foreign keys
ALTER TABLE "unmatched_payments" 
    ADD CONSTRAINT "unmatched_payments_matched_invoice_id_fkey" 
    FOREIGN KEY ("matched_invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "unmatched_payments" 
    ADD CONSTRAINT "unmatched_payments_matched_by_fkey" 
    FOREIGN KEY ("matched_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================
-- 2. USER BUILDING ASSIGNMENTS (for scoped RBAC)
-- ============================================================
CREATE TABLE IF NOT EXISTS "user_building_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "building_id" UUID NOT NULL,
    "role" "UserRole" NOT NULL,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" UUID,
    CONSTRAINT "user_building_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_building_assignments_user_building_unique" 
    ON "user_building_assignments"("user_id", "building_id");
CREATE INDEX IF NOT EXISTS "user_building_assignments_building_id_idx" 
    ON "user_building_assignments"("building_id");

-- Foreign keys
ALTER TABLE "user_building_assignments" 
    ADD CONSTRAINT "user_building_assignments_user_id_fkey" 
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_building_assignments" 
    ADD CONSTRAINT "user_building_assignments_building_id_fkey" 
    FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_building_assignments" 
    ADD CONSTRAINT "user_building_assignments_assigned_by_fkey" 
    FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================
-- 3. DEVICE TOKENS (for FCM push notifications)
-- ============================================================
CREATE TABLE IF NOT EXISTS "device_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "platform" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "device_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "device_tokens_token_key" ON "device_tokens"("token");
CREATE INDEX IF NOT EXISTS "device_tokens_user_id_idx" ON "device_tokens"("user_id");

-- Foreign key
ALTER TABLE "device_tokens" 
    ADD CONSTRAINT "device_tokens_user_id_fkey" 
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- 4. USER NOTIFICATION PREFERENCES
-- ============================================================
CREATE TABLE IF NOT EXISTS "user_notification_preferences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "push_enabled" BOOLEAN NOT NULL DEFAULT true,
    "email_enabled" BOOLEAN NOT NULL DEFAULT true,
    "zalo_enabled" BOOLEAN NOT NULL DEFAULT true,
    "payment_notifications" BOOLEAN NOT NULL DEFAULT true,
    "incident_notifications" BOOLEAN NOT NULL DEFAULT true,
    "announcement_notifications" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_notification_preferences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_notification_preferences_user_id_key" 
    ON "user_notification_preferences"("user_id");

-- Foreign key
ALTER TABLE "user_notification_preferences" 
    ADD CONSTRAINT "user_notification_preferences_user_id_fkey" 
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- 5. OAUTH ACCOUNTS (for Google/Zalo login)
-- ============================================================
CREATE TABLE IF NOT EXISTS "oauth_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "provider" VARCHAR(20) NOT NULL,
    "provider_user_id" TEXT NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "token_expires_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "oauth_accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "oauth_accounts_provider_provider_user_id_key" 
    ON "oauth_accounts"("provider", "provider_user_id");
CREATE INDEX IF NOT EXISTS "oauth_accounts_user_id_idx" ON "oauth_accounts"("user_id");

-- Foreign key
ALTER TABLE "oauth_accounts" 
    ADD CONSTRAINT "oauth_accounts_user_id_fkey" 
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- 6. NOTIFICATIONS TABLE (for storing notification history)
-- ============================================================
CREATE TABLE IF NOT EXISTS "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "resource_type" VARCHAR(50),
    "resource_id" UUID,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "delivery_status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "notifications_user_id_idx" ON "notifications"("user_id");
CREATE INDEX IF NOT EXISTS "notifications_is_read_idx" ON "notifications"("is_read");
CREATE INDEX IF NOT EXISTS "notifications_created_at_idx" ON "notifications"("created_at" DESC);

-- Foreign key
ALTER TABLE "notifications" 
    ADD CONSTRAINT "notifications_user_id_fkey" 
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- 7. ADD NEW FIELDS TO USERS TABLE
-- ============================================================
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "zalo_id" VARCHAR(50);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "zalo_oa_follower" BOOLEAN DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS "users_zalo_id_key" ON "users"("zalo_id") WHERE "zalo_id" IS NOT NULL;

-- ============================================================
-- 8. ADD PAYMENT RECONCILIATION FIELDS TO INVOICES
-- ============================================================
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "payment_reference" VARCHAR(50);
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "external_transaction_id" VARCHAR(100);
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "raw_gateway_response" JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS "invoices_payment_reference_key" 
    ON "invoices"("payment_reference") WHERE "payment_reference" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "invoices_external_transaction_id_idx" 
    ON "invoices"("external_transaction_id") WHERE "external_transaction_id" IS NOT NULL;

-- ============================================================
-- 9. ADD PAYMENT RECONCILIATION FIELDS TO CONTRACT_PAYMENT_SCHEDULES
-- ============================================================
ALTER TABLE "contract_payment_schedules" ADD COLUMN IF NOT EXISTS "payment_reference" VARCHAR(50);
ALTER TABLE "contract_payment_schedules" ADD COLUMN IF NOT EXISTS "external_transaction_id" VARCHAR(100);
ALTER TABLE "contract_payment_schedules" ADD COLUMN IF NOT EXISTS "raw_gateway_response" JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS "contract_payment_schedules_payment_reference_key" 
    ON "contract_payment_schedules"("payment_reference") WHERE "payment_reference" IS NOT NULL;

-- ============================================================
-- 10. EXTEND UserRole ENUM (if not already done)
-- ============================================================
-- Note: PostgreSQL enum modification requires careful handling
-- Check if values exist before adding
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'security' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserRole')) THEN
        ALTER TYPE "UserRole" ADD VALUE 'security';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'housekeeping' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserRole')) THEN
        ALTER TYPE "UserRole" ADD VALUE 'housekeeping';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'accountant' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserRole')) THEN
        ALTER TYPE "UserRole" ADD VALUE 'accountant';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'building_manager' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserRole')) THEN
        ALTER TYPE "UserRole" ADD VALUE 'building_manager';
    END IF;
EXCEPTION WHEN duplicate_object THEN
    -- Values already exist, ignore
    NULL;
END $$;

-- ============================================================
-- VERIFICATION
-- ============================================================
SELECT 'Tables created:' as info;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('unmatched_payments', 'user_building_assignments', 'device_tokens', 
                   'user_notification_preferences', 'oauth_accounts', 'notifications');

SELECT 'UserRole enum values:' as info;
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserRole')
ORDER BY enumsortorder;
