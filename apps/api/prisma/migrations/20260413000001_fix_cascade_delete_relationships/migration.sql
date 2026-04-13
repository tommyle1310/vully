-- ============================================================================
-- Fix Cascade Delete Relationships
-- ============================================================================
-- This migration updates foreign key constraints to implement proper cascade
-- delete behavior, preventing orphaned records and improving data integrity.
-- ============================================================================

-- 1. apartments.owner_id: SetNull (apartments can exist without owners)
ALTER TABLE "apartments" DROP CONSTRAINT IF EXISTS "apartments_owner_id_fkey";
ALTER TABLE "apartments" ADD CONSTRAINT "apartments_owner_id_fkey" 
  FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 2. apartments.parent_unit_id: SetNull (for merged units)
ALTER TABLE "apartments" DROP CONSTRAINT IF EXISTS "apartments_parent_unit_id_fkey";
ALTER TABLE "apartments" ADD CONSTRAINT "apartments_parent_unit_id_fkey" 
  FOREIGN KEY ("parent_unit_id") REFERENCES "apartments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 3. apartments.mgmt_fee_config_id: SetNull (apartments can exist without fee config)
ALTER TABLE "apartments" DROP CONSTRAINT IF EXISTS "apartments_mgmt_fee_config_id_fkey";
ALTER TABLE "apartments" ADD CONSTRAINT "apartments_mgmt_fee_config_id_fkey" 
  FOREIGN KEY ("mgmt_fee_config_id") REFERENCES "management_fee_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 4. building_policies.created_by: SetNull (keep policy history)
ALTER TABLE "building_policies" DROP CONSTRAINT IF EXISTS "building_policies_created_by_fkey";
ALTER TABLE "building_policies" ADD CONSTRAINT "building_policies_created_by_fkey" 
  FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 5. parking_slots.assigned_apt_id: SetNull (slots can be unassigned)
ALTER TABLE "parking_slots" DROP CONSTRAINT IF EXISTS "parking_slots_assigned_apt_id_fkey";
ALTER TABLE "parking_slots" ADD CONSTRAINT "parking_slots_assigned_apt_id_fkey" 
  FOREIGN KEY ("assigned_apt_id") REFERENCES "apartments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 6. parking_slots.access_card_id: SetNull (slots can exist without cards)
ALTER TABLE "parking_slots" DROP CONSTRAINT IF EXISTS "parking_slots_access_card_id_fkey";
ALTER TABLE "parking_slots" ADD CONSTRAINT "parking_slots_access_card_id_fkey" 
  FOREIGN KEY ("access_card_id") REFERENCES "access_cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 7. access_cards.holder_id: SetNull (cards can exist without holders)
ALTER TABLE "access_cards" DROP CONSTRAINT IF EXISTS "access_cards_holder_id_fkey";
ALTER TABLE "access_cards" ADD CONSTRAINT "access_cards_holder_id_fkey" 
  FOREIGN KEY ("holder_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 8. access_cards.deactivated_by: SetNull (keep card history)
ALTER TABLE "access_cards" DROP CONSTRAINT IF EXISTS "access_cards_deactivated_by_fkey";
ALTER TABLE "access_cards" ADD CONSTRAINT "access_cards_deactivated_by_fkey" 
  FOREIGN KEY ("deactivated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 9. access_card_requests.reviewed_by: SetNull (keep request history)
ALTER TABLE "access_card_requests" DROP CONSTRAINT IF EXISTS "access_card_requests_reviewed_by_fkey";
ALTER TABLE "access_card_requests" ADD CONSTRAINT "access_card_requests_reviewed_by_fkey" 
  FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 10. access_card_requests.issued_card_id: SetNull (keep request history even if card deleted)
ALTER TABLE "access_card_requests" DROP CONSTRAINT IF EXISTS "access_card_requests_issued_card_id_fkey";
ALTER TABLE "access_card_requests" ADD CONSTRAINT "access_card_requests_issued_card_id_fkey" 
  FOREIGN KEY ("issued_card_id") REFERENCES "access_cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 11. contracts.created_by: SetNull (keep contract history)
ALTER TABLE "contracts" DROP CONSTRAINT IF EXISTS "contracts_created_by_fkey";
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_created_by_fkey" 
  FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 12. contracts.tenant_id: Restrict (CRITICAL - prevent tenant deletion if contracts exist)
ALTER TABLE "contracts" DROP CONSTRAINT IF EXISTS "contracts_tenant_id_fkey";
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_tenant_id_fkey" 
  FOREIGN KEY ("tenant_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 13. incident_comments.author_id: Make nullable first, then SetNull
ALTER TABLE "incident_comments" ALTER COLUMN "author_id" DROP NOT NULL;
ALTER TABLE "incident_comments" DROP CONSTRAINT IF EXISTS "incident_comments_author_id_fkey";
ALTER TABLE "incident_comments" ADD CONSTRAINT "incident_comments_author_id_fkey" 
  FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 14. incidents.assigned_to: SetNull (incidents become unassigned)
ALTER TABLE "incidents" DROP CONSTRAINT IF EXISTS "incidents_assigned_to_fkey";
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_assigned_to_fkey" 
  FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 15. incidents.reported_by: Make nullable first, then SetNull
ALTER TABLE "incidents" ALTER COLUMN "reported_by" DROP NOT NULL;
ALTER TABLE "incidents" DROP CONSTRAINT IF EXISTS "incidents_reported_by_fkey";
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_reported_by_fkey" 
  FOREIGN KEY ("reported_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 16. meter_readings.recorded_by: SetNull (keep readings, lose recorder)
ALTER TABLE "meter_readings" DROP CONSTRAINT IF EXISTS "meter_readings_recorded_by_fkey";
ALTER TABLE "meter_readings" ADD CONSTRAINT "meter_readings_recorded_by_fkey" 
  FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 17. meter_readings.utility_type_id: Restrict (cannot delete utility type if readings exist)
ALTER TABLE "meter_readings" DROP CONSTRAINT IF EXISTS "meter_readings_utility_type_id_fkey";
ALTER TABLE "meter_readings" ADD CONSTRAINT "meter_readings_utility_type_id_fkey" 
  FOREIGN KEY ("utility_type_id") REFERENCES "utility_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 18. invoice_line_items.utility_type_id: SetNull (keep line items)
ALTER TABLE "invoice_line_items" DROP CONSTRAINT IF EXISTS "invoice_line_items_utility_type_id_fkey";
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_utility_type_id_fkey" 
  FOREIGN KEY ("utility_type_id") REFERENCES "utility_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 19. invoice_line_items.meter_reading_id: SetNull (keep line items)
ALTER TABLE "invoice_line_items" DROP CONSTRAINT IF EXISTS "invoice_line_items_meter_reading_id_fkey";
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_meter_reading_id_fkey" 
  FOREIGN KEY ("meter_reading_id") REFERENCES "meter_readings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 20. contract_payments.recorded_by: Restrict (CRITICAL - cannot delete admin who recorded payments)
ALTER TABLE "contract_payments" DROP CONSTRAINT IF EXISTS "contract_payments_recorded_by_fkey";
ALTER TABLE "contract_payments" ADD CONSTRAINT "contract_payments_recorded_by_fkey" 
  FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 21. contract_payments.reported_by: SetNull (keep payment, lose reporter)
ALTER TABLE "contract_payments" DROP CONSTRAINT IF EXISTS "contract_payments_reported_by_fkey";
ALTER TABLE "contract_payments" ADD CONSTRAINT "contract_payments_reported_by_fkey" 
  FOREIGN KEY ("reported_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 22. contract_payments.verified_by: SetNull (keep payment, lose verifier)
ALTER TABLE "contract_payments" DROP CONSTRAINT IF EXISTS "contract_payments_verified_by_fkey";
ALTER TABLE "contract_payments" ADD CONSTRAINT "contract_payments_verified_by_fkey" 
  FOREIGN KEY ("verified_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
