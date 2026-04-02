-- AlterTable: Add citizen_id and number_of_residents to contracts
ALTER TABLE "contracts" ADD COLUMN "citizen_id" VARCHAR(30);
ALTER TABLE "contracts" ADD COLUMN "number_of_residents" INTEGER;
