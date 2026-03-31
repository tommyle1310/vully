# RBAC Issue: Empty Apartments for New Residents

## Problem
New resident accounts see empty apartment lists even though the database has valid data.

## Root Cause
Backend implements **Role-Based Access Control (RBAC)**:
- **Admin/Technician**: See ALL apartments
- **Resident**: Only see apartments they have an **active contract** for

**Code location**: `apps/api/src/modules/apartments/apartments.controller.ts` (lines 70-82)

---

## Solutions

### Solution 1: Upgrade User to Admin ⚡ (Quickest)

**Option A - SQL Script:**
```bash
cd scripts
psql $DATABASE_URL -f upgrade-user-to-admin.sql
# Enter email when prompted
```

**Option B - Direct SQL:**
```sql
-- Check user role
SELECT id, email, role FROM "User" WHERE email = 'user@example.com';

-- Upgrade to admin
UPDATE "User" SET role = 'ADMIN' WHERE email = 'user@example.com';
```

**Option C - API Endpoint (if exists):**
```bash
curl -X PATCH http://localhost:3001/api/v1/users/{userId} \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role": "ADMIN"}'
```

---

### Solution 2: Create Contract for Resident 📝

**Run the script:**
```bash
psql $DATABASE_URL -f scripts/create-test-contract.sql
```

This will:
1. Find the first resident user
2. Find the first vacant apartment
3. Create an active contract linking them
4. Update apartment status to "occupied"

**Or manually via Prisma Studio:**
```bash
cd apps/api
pnpm prisma studio
```
Then create a Contract with:
- `tenantId`: Resident's user ID
- `apartmentId`: Apartment ID
- `status`: "active"
- `startDate`: Today
- `endDate`: 1 year from now

---

### Solution 3: Frontend Shows Helpful Message ✅ (Already Implemented)

The frontend now detects when:
- User is a resident (`role === 'RESIDENT'`)
- No apartments are available
- Shows friendly message: "You need to have an active rental contract to report incidents"

**Location**: `apps/web/src/app/(dashboard)/incidents/create-incident-dialog.tsx`

---

## Testing the Fix

1. **Logout** from the new account
2. **Apply one of the solutions above** (recommend Solution 1)
3. **Re-login**
4. Navigate to **Apartments** or **Create Incident**
5. ✅ Should now see apartments in dropdown

---

## Backend Filter Logic

```typescript
// Backend: apartments.controller.ts
if (user?.role === 'resident') {
  // Resident only sees their own apartment via active contract
  const apartment = await this.apartmentsService.findByResident(user.id);
  return {
    data: apartment ? [apartment] : [], // Empty if no contract
    meta: { total: apartment ? 1 : 0 }
  };
}

// Admin/Technician see all apartments
const result = await this.apartmentsService.findAll(filters, page, limit);
```

```typescript
// Backend: apartments.service.ts  
async findByResident(residentId: string) {
  const contract = await this.prisma.contract.findFirst({
    where: {
      tenantId: residentId,
      status: 'active', // Must be active
    },
    include: { apartment: true }
  });
  
  if (!contract) return null; // No contract = no apartments
  return contract.apartment;
}
```

---

## Why This Design?

This is **security by design**:
- **Prevents data leakage**: Residents can't see other residents' apartments
- **Enforces business logic**: Only active tenants can report incidents
- **Follows least-privilege principle**: Users only see what they need

---

## Quick Reference

| User Role | Apartments Visible | Buildings Visible | Incidents Visible |
|-----------|-------------------|-------------------|-------------------|
| Admin | All | All | All |
| Technician | All | All | All (assigned ones) |
| Resident | Only their own (via contract) | Only theirs | Only theirs |

---

## Related Files
- Backend Controller: `apps/api/src/modules/apartments/apartments.controller.ts`
- Backend Service: `apps/api/src/modules/apartments/apartments.service.ts`
- Frontend Dialog: `apps/web/src/app/(dashboard)/incidents/create-incident-dialog.tsx`
- SQL Scripts: `scripts/upgrade-user-to-admin.sql`, `scripts/create-test-contract.sql`
