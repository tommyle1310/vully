-- AlterTable - Add billing overhaul fields to invoice_line_items
ALTER TABLE "invoice_line_items" ADD COLUMN "category" VARCHAR(50);
ALTER TABLE "invoice_line_items" ADD COLUMN "vat_rate" DECIMAL(5,4) NOT NULL DEFAULT 0;
ALTER TABLE "invoice_line_items" ADD COLUMN "vat_amount" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "invoice_line_items" ADD COLUMN "environment_fee" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- Backfill existing line items: set category based on utility_type_id presence
UPDATE "invoice_line_items"
SET "category" = CASE
  WHEN "utility_type_id" IS NOT NULL THEN 'utility'
  ELSE 'rent'
END
WHERE "category" IS NULL;
