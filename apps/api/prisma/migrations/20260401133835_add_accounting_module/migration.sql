-- CreateEnum
CREATE TYPE "JournalEntryStatus" AS ENUM ('draft', 'posted', 'reversed');

-- CreateEnum
CREATE TYPE "VoucherType" AS ENUM ('cash_receipt', 'cash_disbursement', 'bank_receipt', 'bank_disbursement');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('asset', 'liability', 'equity', 'revenue', 'expense');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('in', 'out', 'adjustment');

-- CreateEnum
CREATE TYPE "WorkOrderStatus" AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('draft', 'generated', 'posted', 'paid');

-- CreateEnum
CREATE TYPE "DepreciationMethod" AS ENUM ('straight_line', 'declining_balance');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('active', 'disposed', 'transferred');

-- CreateEnum
CREATE TYPE "VatType" AS ENUM ('input', 'output');

-- CreateEnum
CREATE TYPE "ReminderLevel" AS ENUM ('level_1', 'level_2', 'level_3', 'level_4');

-- CreateEnum
CREATE TYPE "AdvancePaymentStatus" AS ENUM ('pending', 'partially_settled', 'fully_settled');

-- CreateEnum
CREATE TYPE "VendorCategory" AS ENUM ('maintenance', 'supplies', 'services', 'other');

-- CreateEnum
CREATE TYPE "BadDebtProvisionMethod" AS ENUM ('age_based', 'individual');

-- CreateEnum
CREATE TYPE "BadDebtProvisionStatus" AS ENUM ('active', 'written_off', 'recovered');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserRole" ADD VALUE 'portfolio_admin';
ALTER TYPE "UserRole" ADD VALUE 'accountant';
ALTER TYPE "UserRole" ADD VALUE 'maintenance_staff';

-- AlterTable
ALTER TABLE "buildings" ADD COLUMN     "management_board_id" UUID;

-- CreateTable
CREATE TABLE "management_boards" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "tax_code" VARCHAR(20),
    "contact_email" VARCHAR(255),
    "contact_phone" VARCHAR(20),
    "address" TEXT,
    "fiscal_year_start_month" INTEGER NOT NULL DEFAULT 1,
    "owner_investor_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "management_boards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "tax_code" VARCHAR(20),
    "legal_representative" VARCHAR(255),
    "address" TEXT,
    "contact_info" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "investors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "account_code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "name_en" VARCHAR(255),
    "parent_code" VARCHAR(20),
    "account_type" "AccountType" NOT NULL,
    "is_system_account" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "building_id" UUID,
    "management_board_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entry_number" VARCHAR(50) NOT NULL,
    "date" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "status" "JournalEntryStatus" NOT NULL DEFAULT 'draft',
    "entries" JSONB NOT NULL,
    "posted_at" TIMESTAMPTZ(6),
    "posted_by_id" UUID,
    "reversed_entry_id" UUID,
    "adjustment_of_id" UUID,
    "building_id" UUID NOT NULL,
    "management_board_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting_transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "journal_entry_id" UUID NOT NULL,
    "source_type" VARCHAR(50) NOT NULL,
    "source_id" UUID NOT NULL,
    "building_id" UUID NOT NULL,
    "management_board_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accounting_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vouchers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "voucher_number" VARCHAR(50) NOT NULL,
    "voucher_type" "VoucherType" NOT NULL,
    "date" DATE NOT NULL,
    "counterparty" VARCHAR(255) NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "debit_account_code" VARCHAR(20) NOT NULL,
    "credit_account_code" VARCHAR(20) NOT NULL,
    "journal_entry_id" UUID,
    "building_id" UUID NOT NULL,
    "management_board_id" UUID NOT NULL,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "unit" VARCHAR(20) NOT NULL,
    "category" VARCHAR(100),
    "current_stock" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "building_id" UUID NOT NULL,
    "management_board_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_movements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "inventory_item_id" UUID NOT NULL,
    "movement_type" "MovementType" NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "unit_cost" DECIMAL(12,4) NOT NULL,
    "total_cost" DECIMAL(15,2) NOT NULL,
    "reference_number" VARCHAR(50),
    "date" DATE NOT NULL,
    "building_id" UUID NOT NULL,
    "management_board_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "month" VARCHAR(7) NOT NULL,
    "status" "PayrollStatus" NOT NULL DEFAULT 'draft',
    "total_gross" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_deductions" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_net" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "building_id" UUID NOT NULL,
    "management_board_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "payroll_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_slips" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "payroll_record_id" UUID NOT NULL,
    "employee_name" VARCHAR(255) NOT NULL,
    "base_salary" DECIMAL(15,2) NOT NULL,
    "allowances" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "bhxh_employee" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "bhxh_employer" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "tncn_tax" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "net_salary" DECIMAL(15,2) NOT NULL,
    "bank_account" VARCHAR(50),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "salary_slips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_work_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "contractor_name" VARCHAR(255),
    "vendor_id" UUID,
    "status" "WorkOrderStatus" NOT NULL DEFAULT 'pending',
    "scheduled_date" DATE,
    "completed_date" DATE,
    "building_id" UUID NOT NULL,
    "management_board_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "maintenance_work_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_costs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "work_order_id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "invoice_ref" VARCHAR(100),
    "building_id" UUID NOT NULL,
    "management_board_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenance_costs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_caches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "report_type" VARCHAR(100) NOT NULL,
    "period_key" VARCHAR(20) NOT NULL,
    "data" JSONB NOT NULL,
    "building_id" UUID,
    "management_board_id" UUID NOT NULL,
    "generated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "report_caches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fixed_assets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "acquisition_date" DATE NOT NULL,
    "acquisition_cost" DECIMAL(15,2) NOT NULL,
    "useful_life_months" INTEGER NOT NULL,
    "depreciation_method" "DepreciationMethod" NOT NULL DEFAULT 'straight_line',
    "accumulated_depreciation" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "net_book_value" DECIMAL(15,2) NOT NULL,
    "status" "AssetStatus" NOT NULL DEFAULT 'active',
    "disposal_date" DATE,
    "disposal_amount" DECIMAL(15,2),
    "building_id" UUID NOT NULL,
    "management_board_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "fixed_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "depreciation_schedules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "fixed_asset_id" UUID NOT NULL,
    "month" VARCHAR(7) NOT NULL,
    "depreciation_amount" DECIMAL(15,2) NOT NULL,
    "accumulated_depreciation" DECIMAL(15,2) NOT NULL,
    "net_book_value" DECIMAL(15,2) NOT NULL,
    "journal_entry_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "depreciation_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bad_debt_provisions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "apartment_id" UUID,
    "contract_id" UUID,
    "provision_date" DATE NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "method" "BadDebtProvisionMethod" NOT NULL,
    "status" "BadDebtProvisionStatus" NOT NULL DEFAULT 'active',
    "journal_entry_id" UUID,
    "building_id" UUID NOT NULL,
    "management_board_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "bad_debt_provisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dynamic_report_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "query_config" JSONB NOT NULL,
    "is_shared" BOOLEAN NOT NULL DEFAULT false,
    "created_by_id" UUID,
    "building_id" UUID,
    "management_board_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "dynamic_report_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vat_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vat_type" "VatType" NOT NULL,
    "invoice_number" VARCHAR(50),
    "invoice_date" DATE,
    "counterparty_name" VARCHAR(255),
    "counterparty_tax_code" VARCHAR(20),
    "amount" DECIMAL(15,2) NOT NULL,
    "vat_rate" DECIMAL(5,2) NOT NULL,
    "vat_amount" DECIMAL(15,2) NOT NULL,
    "journal_entry_id" UUID,
    "building_id" UUID NOT NULL,
    "management_board_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vat_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_fund_contributions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "apartment_id" UUID NOT NULL,
    "apartment_value" DECIMAL(15,2) NOT NULL,
    "contribution_rate" DECIMAL(5,4) NOT NULL DEFAULT 0.02,
    "total_required" DECIMAL(15,2) NOT NULL,
    "total_contributed" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "building_id" UUID NOT NULL,
    "management_board_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "maintenance_fund_contributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "advance_payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employee_name" VARCHAR(255) NOT NULL,
    "employee_id" UUID,
    "advance_date" DATE NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "AdvancePaymentStatus" NOT NULL DEFAULT 'pending',
    "settled_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "building_id" UUID NOT NULL,
    "management_board_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "advance_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "debt_reminder_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "apartment_id" UUID NOT NULL,
    "contract_id" UUID,
    "reminder_level" "ReminderLevel" NOT NULL,
    "reminder_date" DATE NOT NULL,
    "overdue_amount" DECIMAL(15,2) NOT NULL,
    "days_overdue" INTEGER NOT NULL,
    "notification_channel" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'sent',
    "notes" TEXT,
    "building_id" UUID NOT NULL,
    "management_board_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "debt_reminder_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "tax_code" VARCHAR(20),
    "contact_person" VARCHAR(255),
    "phone" VARCHAR(20),
    "email" VARCHAR(255),
    "bank_account" VARCHAR(50),
    "bank_name" VARCHAR(255),
    "payment_terms_days" INTEGER NOT NULL DEFAULT 30,
    "category" "VendorCategory" NOT NULL DEFAULT 'other',
    "building_id" UUID,
    "management_board_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "management_boards_owner_investor_id_idx" ON "management_boards"("owner_investor_id");

-- CreateIndex
CREATE INDEX "ledger_accounts_management_board_id_idx" ON "ledger_accounts"("management_board_id");

-- CreateIndex
CREATE INDEX "ledger_accounts_account_type_idx" ON "ledger_accounts"("account_type");

-- CreateIndex
CREATE INDEX "ledger_accounts_parent_code_idx" ON "ledger_accounts"("parent_code");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_accounts_account_code_management_board_id_key" ON "ledger_accounts"("account_code", "management_board_id");

-- CreateIndex
CREATE INDEX "journal_entries_management_board_id_idx" ON "journal_entries"("management_board_id");

-- CreateIndex
CREATE INDEX "journal_entries_building_id_idx" ON "journal_entries"("building_id");

-- CreateIndex
CREATE INDEX "journal_entries_date_idx" ON "journal_entries"("date");

-- CreateIndex
CREATE INDEX "journal_entries_status_idx" ON "journal_entries"("status");

-- CreateIndex
CREATE INDEX "journal_entries_reversed_entry_id_idx" ON "journal_entries"("reversed_entry_id");

-- CreateIndex
CREATE INDEX "journal_entries_adjustment_of_id_idx" ON "journal_entries"("adjustment_of_id");

-- CreateIndex
CREATE UNIQUE INDEX "journal_entries_entry_number_management_board_id_key" ON "journal_entries"("entry_number", "management_board_id");

-- CreateIndex
CREATE INDEX "accounting_transactions_journal_entry_id_idx" ON "accounting_transactions"("journal_entry_id");

-- CreateIndex
CREATE INDEX "accounting_transactions_source_type_source_id_idx" ON "accounting_transactions"("source_type", "source_id");

-- CreateIndex
CREATE INDEX "accounting_transactions_building_id_idx" ON "accounting_transactions"("building_id");

-- CreateIndex
CREATE INDEX "accounting_transactions_management_board_id_idx" ON "accounting_transactions"("management_board_id");

-- CreateIndex
CREATE INDEX "vouchers_management_board_id_idx" ON "vouchers"("management_board_id");

-- CreateIndex
CREATE INDEX "vouchers_building_id_idx" ON "vouchers"("building_id");

-- CreateIndex
CREATE INDEX "vouchers_date_idx" ON "vouchers"("date");

-- CreateIndex
CREATE INDEX "vouchers_voucher_type_idx" ON "vouchers"("voucher_type");

-- CreateIndex
CREATE UNIQUE INDEX "vouchers_voucher_number_management_board_id_key" ON "vouchers"("voucher_number", "management_board_id");

-- CreateIndex
CREATE INDEX "inventory_items_management_board_id_idx" ON "inventory_items"("management_board_id");

-- CreateIndex
CREATE INDEX "inventory_items_building_id_idx" ON "inventory_items"("building_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_code_management_board_id_key" ON "inventory_items"("code", "management_board_id");

-- CreateIndex
CREATE INDEX "inventory_movements_inventory_item_id_idx" ON "inventory_movements"("inventory_item_id");

-- CreateIndex
CREATE INDEX "inventory_movements_building_id_idx" ON "inventory_movements"("building_id");

-- CreateIndex
CREATE INDEX "inventory_movements_date_idx" ON "inventory_movements"("date");

-- CreateIndex
CREATE INDEX "payroll_records_management_board_id_idx" ON "payroll_records"("management_board_id");

-- CreateIndex
CREATE INDEX "payroll_records_building_id_idx" ON "payroll_records"("building_id");

-- CreateIndex
CREATE INDEX "payroll_records_status_idx" ON "payroll_records"("status");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_records_month_management_board_id_building_id_key" ON "payroll_records"("month", "management_board_id", "building_id");

-- CreateIndex
CREATE INDEX "salary_slips_payroll_record_id_idx" ON "salary_slips"("payroll_record_id");

-- CreateIndex
CREATE INDEX "maintenance_work_orders_management_board_id_idx" ON "maintenance_work_orders"("management_board_id");

-- CreateIndex
CREATE INDEX "maintenance_work_orders_building_id_idx" ON "maintenance_work_orders"("building_id");

-- CreateIndex
CREATE INDEX "maintenance_work_orders_status_idx" ON "maintenance_work_orders"("status");

-- CreateIndex
CREATE INDEX "maintenance_work_orders_vendor_id_idx" ON "maintenance_work_orders"("vendor_id");

-- CreateIndex
CREATE INDEX "maintenance_costs_work_order_id_idx" ON "maintenance_costs"("work_order_id");

-- CreateIndex
CREATE INDEX "maintenance_costs_building_id_idx" ON "maintenance_costs"("building_id");

-- CreateIndex
CREATE INDEX "report_caches_management_board_id_idx" ON "report_caches"("management_board_id");

-- CreateIndex
CREATE INDEX "report_caches_expires_at_idx" ON "report_caches"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "report_caches_report_type_period_key_management_board_id_bu_key" ON "report_caches"("report_type", "period_key", "management_board_id", "building_id");

-- CreateIndex
CREATE INDEX "fixed_assets_management_board_id_idx" ON "fixed_assets"("management_board_id");

-- CreateIndex
CREATE INDEX "fixed_assets_building_id_idx" ON "fixed_assets"("building_id");

-- CreateIndex
CREATE INDEX "fixed_assets_status_idx" ON "fixed_assets"("status");

-- CreateIndex
CREATE UNIQUE INDEX "fixed_assets_code_management_board_id_key" ON "fixed_assets"("code", "management_board_id");

-- CreateIndex
CREATE INDEX "depreciation_schedules_fixed_asset_id_idx" ON "depreciation_schedules"("fixed_asset_id");

-- CreateIndex
CREATE INDEX "depreciation_schedules_journal_entry_id_idx" ON "depreciation_schedules"("journal_entry_id");

-- CreateIndex
CREATE UNIQUE INDEX "depreciation_schedules_fixed_asset_id_month_key" ON "depreciation_schedules"("fixed_asset_id", "month");

-- CreateIndex
CREATE INDEX "bad_debt_provisions_management_board_id_idx" ON "bad_debt_provisions"("management_board_id");

-- CreateIndex
CREATE INDEX "bad_debt_provisions_building_id_idx" ON "bad_debt_provisions"("building_id");

-- CreateIndex
CREATE INDEX "bad_debt_provisions_apartment_id_idx" ON "bad_debt_provisions"("apartment_id");

-- CreateIndex
CREATE INDEX "bad_debt_provisions_status_idx" ON "bad_debt_provisions"("status");

-- CreateIndex
CREATE INDEX "dynamic_report_templates_management_board_id_idx" ON "dynamic_report_templates"("management_board_id");

-- CreateIndex
CREATE INDEX "dynamic_report_templates_created_by_id_idx" ON "dynamic_report_templates"("created_by_id");

-- CreateIndex
CREATE INDEX "vat_records_management_board_id_idx" ON "vat_records"("management_board_id");

-- CreateIndex
CREATE INDEX "vat_records_building_id_idx" ON "vat_records"("building_id");

-- CreateIndex
CREATE INDEX "vat_records_vat_type_idx" ON "vat_records"("vat_type");

-- CreateIndex
CREATE INDEX "vat_records_journal_entry_id_idx" ON "vat_records"("journal_entry_id");

-- CreateIndex
CREATE INDEX "maintenance_fund_contributions_management_board_id_idx" ON "maintenance_fund_contributions"("management_board_id");

-- CreateIndex
CREATE INDEX "maintenance_fund_contributions_building_id_idx" ON "maintenance_fund_contributions"("building_id");

-- CreateIndex
CREATE UNIQUE INDEX "maintenance_fund_contributions_apartment_id_management_boar_key" ON "maintenance_fund_contributions"("apartment_id", "management_board_id");

-- CreateIndex
CREATE INDEX "advance_payments_management_board_id_idx" ON "advance_payments"("management_board_id");

-- CreateIndex
CREATE INDEX "advance_payments_building_id_idx" ON "advance_payments"("building_id");

-- CreateIndex
CREATE INDEX "advance_payments_status_idx" ON "advance_payments"("status");

-- CreateIndex
CREATE INDEX "advance_payments_employee_id_idx" ON "advance_payments"("employee_id");

-- CreateIndex
CREATE INDEX "debt_reminder_logs_management_board_id_idx" ON "debt_reminder_logs"("management_board_id");

-- CreateIndex
CREATE INDEX "debt_reminder_logs_building_id_idx" ON "debt_reminder_logs"("building_id");

-- CreateIndex
CREATE INDEX "debt_reminder_logs_apartment_id_idx" ON "debt_reminder_logs"("apartment_id");

-- CreateIndex
CREATE INDEX "debt_reminder_logs_reminder_level_idx" ON "debt_reminder_logs"("reminder_level");

-- CreateIndex
CREATE INDEX "debt_reminder_logs_reminder_date_idx" ON "debt_reminder_logs"("reminder_date");

-- CreateIndex
CREATE INDEX "vendors_management_board_id_idx" ON "vendors"("management_board_id");

-- CreateIndex
CREATE INDEX "vendors_building_id_idx" ON "vendors"("building_id");

-- CreateIndex
CREATE INDEX "vendors_category_idx" ON "vendors"("category");

-- CreateIndex
CREATE INDEX "buildings_management_board_id_idx" ON "buildings"("management_board_id");

-- AddForeignKey
ALTER TABLE "buildings" ADD CONSTRAINT "buildings_management_board_id_fkey" FOREIGN KEY ("management_board_id") REFERENCES "management_boards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "management_boards" ADD CONSTRAINT "management_boards_owner_investor_id_fkey" FOREIGN KEY ("owner_investor_id") REFERENCES "investors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_accounts" ADD CONSTRAINT "ledger_accounts_management_board_id_fkey" FOREIGN KEY ("management_board_id") REFERENCES "management_boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_management_board_id_fkey" FOREIGN KEY ("management_board_id") REFERENCES "management_boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_transactions" ADD CONSTRAINT "accounting_transactions_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_management_board_id_fkey" FOREIGN KEY ("management_board_id") REFERENCES "management_boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_management_board_id_fkey" FOREIGN KEY ("management_board_id") REFERENCES "management_boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_records" ADD CONSTRAINT "payroll_records_management_board_id_fkey" FOREIGN KEY ("management_board_id") REFERENCES "management_boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_slips" ADD CONSTRAINT "salary_slips_payroll_record_id_fkey" FOREIGN KEY ("payroll_record_id") REFERENCES "payroll_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_work_orders" ADD CONSTRAINT "maintenance_work_orders_management_board_id_fkey" FOREIGN KEY ("management_board_id") REFERENCES "management_boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_work_orders" ADD CONSTRAINT "maintenance_work_orders_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_costs" ADD CONSTRAINT "maintenance_costs_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "maintenance_work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_caches" ADD CONSTRAINT "report_caches_management_board_id_fkey" FOREIGN KEY ("management_board_id") REFERENCES "management_boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_management_board_id_fkey" FOREIGN KEY ("management_board_id") REFERENCES "management_boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "depreciation_schedules" ADD CONSTRAINT "depreciation_schedules_fixed_asset_id_fkey" FOREIGN KEY ("fixed_asset_id") REFERENCES "fixed_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "depreciation_schedules" ADD CONSTRAINT "depreciation_schedules_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bad_debt_provisions" ADD CONSTRAINT "bad_debt_provisions_management_board_id_fkey" FOREIGN KEY ("management_board_id") REFERENCES "management_boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bad_debt_provisions" ADD CONSTRAINT "bad_debt_provisions_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dynamic_report_templates" ADD CONSTRAINT "dynamic_report_templates_management_board_id_fkey" FOREIGN KEY ("management_board_id") REFERENCES "management_boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vat_records" ADD CONSTRAINT "vat_records_management_board_id_fkey" FOREIGN KEY ("management_board_id") REFERENCES "management_boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vat_records" ADD CONSTRAINT "vat_records_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_fund_contributions" ADD CONSTRAINT "maintenance_fund_contributions_management_board_id_fkey" FOREIGN KEY ("management_board_id") REFERENCES "management_boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advance_payments" ADD CONSTRAINT "advance_payments_management_board_id_fkey" FOREIGN KEY ("management_board_id") REFERENCES "management_boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debt_reminder_logs" ADD CONSTRAINT "debt_reminder_logs_management_board_id_fkey" FOREIGN KEY ("management_board_id") REFERENCES "management_boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_management_board_id_fkey" FOREIGN KEY ("management_board_id") REFERENCES "management_boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
