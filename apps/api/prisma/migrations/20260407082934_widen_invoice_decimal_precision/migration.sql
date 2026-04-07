-- Widen invoice and invoice_line_items decimal columns from (12,x) to (15,x)
-- to support Vietnamese real estate amounts in billions of VND.

-- invoice_line_items: unit_price, amount, vat_amount, environment_fee
ALTER TABLE "invoice_line_items"
  ALTER COLUMN "unit_price" SET DATA TYPE DECIMAL(15,4),
  ALTER COLUMN "amount" SET DATA TYPE DECIMAL(15,2),
  ALTER COLUMN "vat_amount" SET DATA TYPE DECIMAL(15,2),
  ALTER COLUMN "environment_fee" SET DATA TYPE DECIMAL(15,2);

-- invoices: subtotal, tax_amount, total_amount, paid_amount
ALTER TABLE "invoices"
  ALTER COLUMN "subtotal" SET DATA TYPE DECIMAL(15,2),
  ALTER COLUMN "tax_amount" SET DATA TYPE DECIMAL(15,2),
  ALTER COLUMN "total_amount" SET DATA TYPE DECIMAL(15,2),
  ALTER COLUMN "paid_amount" SET DATA TYPE DECIMAL(15,2);
