-- CreateEnum: UnitType
CREATE TYPE "UnitType" AS ENUM ('studio', 'one_bedroom', 'two_bedroom', 'three_bedroom', 'duplex', 'penthouse', 'shophouse');

-- CreateEnum: OwnershipType
CREATE TYPE "OwnershipType" AS ENUM ('permanent', 'fifty_year', 'leasehold');

-- CreateEnum: Orientation
CREATE TYPE "Orientation" AS ENUM ('north', 'south', 'east', 'west', 'northeast', 'northwest', 'southeast', 'southwest');

-- CreateEnum: BillingCycle
CREATE TYPE "BillingCycle" AS ENUM ('monthly', 'quarterly', 'yearly');

-- CreateEnum: SyncStatus
CREATE TYPE "SyncStatus" AS ENUM ('synced', 'pending', 'error', 'disconnected');

-- CreateTable: ManagementFeeConfig
CREATE TABLE "management_fee_configs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "building_id" UUID NOT NULL,
    "unit_type" "UnitType",
    "price_per_sqm" DECIMAL(12,2) NOT NULL,
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "management_fee_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "management_fee_configs_building_id_effective_from_idx" ON "management_fee_configs"("building_id", "effective_from");

-- AddForeignKey
ALTER TABLE "management_fee_configs" ADD CONSTRAINT "management_fee_configs_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameColumn: floor -> floor_index (preserves existing data)
ALTER TABLE "apartments" RENAME COLUMN "floor" TO "floor_index";

-- RenameColumn: area_sqm -> gross_area (preserves existing data)
ALTER TABLE "apartments" RENAME COLUMN "area_sqm" TO "gross_area";

-- Add new columns to apartments (all nullable or with defaults)
ALTER TABLE "apartments" ADD COLUMN "apartment_code" VARCHAR(30);
ALTER TABLE "apartments" ADD COLUMN "floor_label" VARCHAR(10);
ALTER TABLE "apartments" ADD COLUMN "unit_type" "UnitType";
ALTER TABLE "apartments" ADD COLUMN "net_area" DECIMAL(10,2);
ALTER TABLE "apartments" ADD COLUMN "ceiling_height" DECIMAL(4,2);
ALTER TABLE "apartments" ADD COLUMN "svg_path_data" TEXT;
ALTER TABLE "apartments" ADD COLUMN "centroid_x" DECIMAL(10,4);
ALTER TABLE "apartments" ADD COLUMN "centroid_y" DECIMAL(10,4);
ALTER TABLE "apartments" ADD COLUMN "orientation" "Orientation";
ALTER TABLE "apartments" ADD COLUMN "balcony_direction" "Orientation";
ALTER TABLE "apartments" ADD COLUMN "is_corner_unit" BOOLEAN NOT NULL DEFAULT false;

-- Ownership & Legal
ALTER TABLE "apartments" ADD COLUMN "owner_id" UUID;
ALTER TABLE "apartments" ADD COLUMN "ownership_type" "OwnershipType";
ALTER TABLE "apartments" ADD COLUMN "pink_book_id" VARCHAR(50);
ALTER TABLE "apartments" ADD COLUMN "handover_date" DATE;
ALTER TABLE "apartments" ADD COLUMN "warranty_expiry_date" DATE;
ALTER TABLE "apartments" ADD COLUMN "is_rented" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "apartments" ADD COLUMN "vat_rate" DECIMAL(5,2);

-- Occupancy
ALTER TABLE "apartments" ADD COLUMN "max_residents" INTEGER;
ALTER TABLE "apartments" ADD COLUMN "current_resident_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "apartments" ADD COLUMN "pet_allowed" BOOLEAN;
ALTER TABLE "apartments" ADD COLUMN "pet_limit" INTEGER;
ALTER TABLE "apartments" ADD COLUMN "access_card_limit" INTEGER;
ALTER TABLE "apartments" ADD COLUMN "intercom_code" VARCHAR(20);

-- Utility & Technical
ALTER TABLE "apartments" ADD COLUMN "electric_meter_id" VARCHAR(50);
ALTER TABLE "apartments" ADD COLUMN "water_meter_id" VARCHAR(50);
ALTER TABLE "apartments" ADD COLUMN "gas_meter_id" VARCHAR(50);
ALTER TABLE "apartments" ADD COLUMN "power_capacity" INTEGER;
ALTER TABLE "apartments" ADD COLUMN "ac_unit_count" INTEGER;
ALTER TABLE "apartments" ADD COLUMN "fire_detector_id" VARCHAR(50);
ALTER TABLE "apartments" ADD COLUMN "sprinkler_count" INTEGER;
ALTER TABLE "apartments" ADD COLUMN "internet_terminal_loc" VARCHAR(255);

-- Parking & Assets
ALTER TABLE "apartments" ADD COLUMN "assigned_car_slot" VARCHAR(30);
ALTER TABLE "apartments" ADD COLUMN "assigned_moto_slot" VARCHAR(30);
ALTER TABLE "apartments" ADD COLUMN "mailbox_number" VARCHAR(20);
ALTER TABLE "apartments" ADD COLUMN "storage_unit_id" VARCHAR(30);

-- Billing Config
ALTER TABLE "apartments" ADD COLUMN "mgmt_fee_config_id" UUID;
ALTER TABLE "apartments" ADD COLUMN "billing_start_date" DATE;
ALTER TABLE "apartments" ADD COLUMN "billing_cycle" "BillingCycle" NOT NULL DEFAULT 'monthly';
ALTER TABLE "apartments" ADD COLUMN "bank_account_virtual" VARCHAR(30);
ALTER TABLE "apartments" ADD COLUMN "late_fee_waived" BOOLEAN NOT NULL DEFAULT false;

-- System Logic
ALTER TABLE "apartments" ADD COLUMN "parent_unit_id" UUID;
ALTER TABLE "apartments" ADD COLUMN "is_merged" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "apartments" ADD COLUMN "sync_status" "SyncStatus" NOT NULL DEFAULT 'disconnected';
ALTER TABLE "apartments" ADD COLUMN "portal_access_enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "apartments" ADD COLUMN "technical_drawing_url" TEXT;
ALTER TABLE "apartments" ADD COLUMN "notes_admin" TEXT;

-- Unique constraint on apartment_code
CREATE UNIQUE INDEX "apartments_apartment_code_key" ON "apartments"("apartment_code");

-- New indexes
CREATE INDEX "apartments_unit_type_idx" ON "apartments"("unit_type");
CREATE INDEX "apartments_owner_id_idx" ON "apartments"("owner_id");
CREATE INDEX "apartments_floor_index_idx" ON "apartments"("floor_index");
CREATE INDEX "apartments_is_merged_idx" ON "apartments"("is_merged");

-- Foreign keys
ALTER TABLE "apartments" ADD CONSTRAINT "apartments_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "apartments" ADD CONSTRAINT "apartments_parent_unit_id_fkey" FOREIGN KEY ("parent_unit_id") REFERENCES "apartments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "apartments" ADD CONSTRAINT "apartments_mgmt_fee_config_id_fkey" FOREIGN KEY ("mgmt_fee_config_id") REFERENCES "management_fee_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
