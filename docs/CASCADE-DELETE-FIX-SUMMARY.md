# Cascade Delete Fix - Implementation Summary

**Date:** April 13, 2026  
**Migration:** `20260413000001_fix_cascade_delete_relationships`  
**Status:** ✅ Applied to database

---

## 🎯 **What Was Fixed**

We identified and fixed **22 foreign key relationships** that had incorrect or missing cascade delete behaviors. The database now properly handles record deletions without leaving orphaned records or causing unexpected data loss.

---

## ✅ **Changes Applied**

### **1. SET NULL Cascades (17 relationships)**
When parent record is deleted, child's foreign key becomes NULL:

- ✅ `apartments.owner_id` → SetNull (apartments can exist without owners)
- ✅ `apartments.parent_unit_id` → SetNull (merged units can be unlinked)
- ✅ `apartments.mgmt_fee_config_id` → SetNull (apartments can exist without fee configs)
- ✅ `building_policies.created_by` → SetNull (keep policy history)
- ✅ `parking_slots.assigned_apt_id` → SetNull (slots become unassigned)
- ✅ `parking_slots.access_card_id` → SetNull (slots can exist without cards)
- ✅ `access_cards.holder_id` → SetNull (cards can exist without holders)
- ✅ `access_cards.deactivated_by` → SetNull (keep card history)
- ✅ `access_card_requests.reviewed_by` → SetNull (keep request history)
- ✅ `access_card_requests.issued_card_id` → SetNull (keep request even if card deleted)
- ✅ `contracts.created_by` → SetNull (keep contract history)
- ✅ `incident_comments.author_id` → SetNull (keep comments, lose author)
- ✅ `incidents.assigned_to` → SetNull (incidents become unassigned)
- ✅ `incidents.reported_by` → SetNull (keep incident history)
- ✅ `meter_readings.recorded_by` → SetNull (keep readings, lose recorder)
- ✅ `invoice_line_items.utility_type_id` → SetNull (keep line items)
- ✅ `invoice_line_items.meter_reading_id` → SetNull (keep line items)
- ✅ `contract_payments.reported_by` → SetNull (keep payment history)
- ✅ `contract_payments.verified_by` → SetNull (keep payment history)

### **2. RESTRICT Cascades (3 relationships)**
Prevents parent deletion if child records exist:

- 🔒 `contracts.tenant_id` → Restrict (CRITICAL: cannot delete tenant with contracts)
- 🔒 `contract_payments.recorded_by` → Restrict (CRITICAL: cannot delete admin who recorded payments)
- 🔒 `meter_readings.utility_type_id` → Restrict (cannot delete utility type with readings)

### **3. Schema Changes**
Made columns nullable to support SET NULL cascade:

- ✅ `incident_comments.author_id`: `String` → `String?`
- ✅ `incidents.reported_by`: `String` → `String?`

---

## 📁 **Files Modified**

1. **Schema:** [apps/api/prisma/schema.prisma](../apps/api/prisma/schema.prisma)
   - Updated 22 relationship definitions with proper `onDelete` behavior

2. **Migration:** [apps/api/prisma/migrations/20260413000001_fix_cascade_delete_relationships/migration.sql](../apps/api/prisma/migrations/20260413000001_fix_cascade_delete_relationships/migration.sql)
   - 22 `ALTER TABLE` statements to update foreign key constraints
   - 2 `ALTER COLUMN` statements to make columns nullable

3. **Documentation:** [docs/DATABASE-CASCADE-AND-MODULE-GUIDE.md](DATABASE-CASCADE-AND-MODULE-GUIDE.md)
   - Updated with fix status and comprehensive module documentation

---

## 🧪 **Testing Recommendations**

Run these tests in Neon DB SQL editor to verify cascade behavior:

### **Test 1: User deletion with SET NULL**
```sql
-- Create test user
INSERT INTO users (id, email, password_hash, role, first_name, last_name, created_at, updated_at)
VALUES ('test-user-123', 'test@example.com', 'hash', 'resident', 'Test', 'User', NOW(), NOW());

-- Create apartment owned by test user
UPDATE apartments SET owner_id = 'test-user-123' WHERE id = (SELECT id FROM apartments LIMIT 1);

-- Delete user (owner_id should become NULL, not error)
DELETE FROM users WHERE id = 'test-user-123';

-- Verify apartment still exists with null owner
SELECT id, owner_id FROM apartments WHERE owner_id IS NULL LIMIT 5;
```

### **Test 2: User deletion blocked by RESTRICT**
```sql
-- Try to delete a user who is a tenant on an active contract
DELETE FROM users WHERE id IN (
  SELECT tenant_id FROM contracts WHERE status = 'active' LIMIT 1
);
-- Expected: ERROR - foreign key violation (RESTRICT)
-- Message: "update or delete on table "users" violates foreign key constraint"
```

### **Test 3: Apartment deletion cascades properly**
```sql
-- Delete apartment (should cascade to contracts, incidents, invoices, etc.)
DELETE FROM apartments WHERE id = 'some-apartment-id';
-- Expected: All related records deleted (contracts, incidents, invoices, access cards)
```

---

## 🚀 **Next Steps for Developers**

### **1. Restart API Server**
After the migration, you need to regenerate Prisma Client and restart:

```powershell
cd apps/api
npx prisma generate
npm run start:dev
```

### **2. Add Application-Level Validation**
Implement user-friendly error messages when deletion is blocked:

**File:** `apps/api/src/modules/identity/users.service.ts`

```typescript
async delete(userId: string) {
  // Check for active contracts
  const activeContracts = await this.prisma.contracts.count({
    where: { tenant_id: userId, status: 'active' }
  });
  
  if (activeContracts > 0) {
    throw new BadRequestException(
      `Cannot delete user: they have ${activeContracts} active contract(s). ` +
      `Please terminate all contracts before deleting the user.`
    );
  }
  
  // Check for recorded payments
  const recordedPayments = await this.prisma.contract_payments.count({
    where: { recorded_by: userId }
  });
  
  if (recordedPayments > 0) {
    throw new BadRequestException(
      `Cannot delete user: they have recorded ${recordedPayments} payment(s). ` +
      `Payments cannot be deleted to maintain financial audit trails.`
    );
  }
  
  // Safe to delete
  return this.prisma.users.delete({ where: { id: userId } });
}
```

### **3. Test Deletion Workflows**
Test these scenarios in development:

- ✅ Delete apartment owner → apartment remains with `owner_id = null`
- ✅ Delete user assigned to incident → incident remains with `assigned_to = null`
- ❌ Delete tenant with active contract → blocked with error message
- ❌ Delete admin who recorded payments → blocked with error message
- ❌ Delete utility type with meter readings → blocked with error message

### **4. Update Frontend Error Handling**
Display user-friendly messages when deletions are blocked:

```typescript
// In your delete user mutation
try {
  await deleteUser(userId);
  toast.success('User deleted successfully');
} catch (error) {
  if (error.message.includes('contract')) {
    toast.error('Cannot delete user with active contracts');
  } else if (error.message.includes('payment')) {
    toast.error('Cannot delete user who recorded payments');
  } else {
    toast.error('Failed to delete user');
  }
}
```

---

## 📊 **Impact Analysis**

### **Before Fix**
- ❌ Deleting users left orphaned `owner_id` in apartments
- ❌ Deleting utility types caused foreign key errors
- ❌ No protection for critical financial data (contracts, payments)
- ❌ Manual cleanup required for orphaned records

### **After Fix**
- ✅ Automatic cleanup via SET NULL (17 relationships)
- ✅ Data protection via RESTRICT (3 relationships)
- ✅ Audit trail preserved (comments, incidents, policies)
- ✅ No manual intervention required

---

## 🔍 **Verification**

Run this query to verify all constraints are correctly configured:

```sql
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;
```

Look for `delete_rule`:
- `SET NULL` - Child's FK becomes null when parent deleted
- `RESTRICT` - Parent deletion blocked if children exist
- `CASCADE` - Children deleted when parent deleted

---

## ✅ **Migration Complete**

All cascade delete issues have been resolved. The database now properly handles record deletions with appropriate behavior for each relationship type.

**Questions or Issues?** Check the full documentation in [DATABASE-CASCADE-AND-MODULE-GUIDE.md](DATABASE-CASCADE-AND-MODULE-GUIDE.md)
