-- CreateEnum (skip if already exists)
DO $$ BEGIN
  CREATE TYPE "AccessCardType" AS ENUM ('building', 'parking');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AccessCardStatus" AS ENUM ('active', 'lost', 'deactivated', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AccessCardRequestStatus" AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE "access_cards" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "card_number" VARCHAR(50) NOT NULL,
    "apartment_id" UUID NOT NULL,
    "holder_id" UUID,
    "card_type" "AccessCardType" NOT NULL,
    "status" "AccessCardStatus" NOT NULL DEFAULT 'active',
    "access_zones" TEXT[],
    "floor_access" INTEGER[],
    "issued_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6),
    "deactivated_at" TIMESTAMPTZ(6),
    "deactivated_by" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "access_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_card_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "apartment_id" UUID NOT NULL,
    "requested_by" UUID NOT NULL,
    "card_type" "AccessCardType" NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "AccessCardRequestStatus" NOT NULL DEFAULT 'pending',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "review_note" TEXT,
    "issued_card_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "access_card_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "access_cards_card_number_key" ON "access_cards"("card_number");

-- CreateIndex
CREATE INDEX "access_cards_apartment_id_idx" ON "access_cards"("apartment_id");

-- CreateIndex
CREATE INDEX "access_cards_status_idx" ON "access_cards"("status");

-- CreateIndex
CREATE INDEX "access_cards_card_type_idx" ON "access_cards"("card_type");

-- CreateIndex
CREATE UNIQUE INDEX "access_card_requests_issued_card_id_key" ON "access_card_requests"("issued_card_id");

-- CreateIndex
CREATE INDEX "access_card_requests_apartment_id_idx" ON "access_card_requests"("apartment_id");

-- CreateIndex
CREATE INDEX "access_card_requests_requested_by_idx" ON "access_card_requests"("requested_by");

-- CreateIndex
CREATE INDEX "access_card_requests_status_idx" ON "access_card_requests"("status");

-- CreateIndex
CREATE INDEX "access_card_requests_created_at_idx" ON "access_card_requests"("created_at");

-- AddForeignKey
ALTER TABLE "access_cards" ADD CONSTRAINT "access_cards_apartment_id_fkey" FOREIGN KEY ("apartment_id") REFERENCES "apartments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_cards" ADD CONSTRAINT "access_cards_holder_id_fkey" FOREIGN KEY ("holder_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_cards" ADD CONSTRAINT "access_cards_deactivated_by_fkey" FOREIGN KEY ("deactivated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_card_requests" ADD CONSTRAINT "access_card_requests_apartment_id_fkey" FOREIGN KEY ("apartment_id") REFERENCES "apartments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_card_requests" ADD CONSTRAINT "access_card_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_card_requests" ADD CONSTRAINT "access_card_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_card_requests" ADD CONSTRAINT "access_card_requests_issued_card_id_fkey" FOREIGN KEY ("issued_card_id") REFERENCES "access_cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;
