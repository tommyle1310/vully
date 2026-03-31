# Buildings Management: Admin Access Required

## Quick Fix: Upgrade Your User to Admin

You're seeing a **403 Forbidden** error because creating buildings requires **admin role**.

### Solution 1: Update via Database (Recommended)

Run this SQL command in your PostgreSQL database:

```sql
-- Replace 'your-email@example.com' with your actual email
UPDATE users 
SET role = 'admin' 
WHERE email = 'your-email@example.com';
```

**Using psql:**
```bash
# Connect to database
docker exec -it <postgres-container-name> psql -U postgres -d vully_db

# Or if running locally
psql -U postgres -d vully_db

# Run the update
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';

# Verify
SELECT id, email, role FROM users WHERE email = 'your-email@example.com';
```

**Using the provided script:**
```bash
# Edit the script first: scripts/upgrade-user-to-admin.sql
# Replace 'your-email@example.com' with your email

# Run it
docker exec -i <postgres-container-name> psql -U postgres -d vully_db < scripts/upgrade-user-to-admin.sql
```

### Solution 2: Use Prisma Studio

```bash
cd apps/api
pnpm prisma studio
```

1. Open **users** table
2. Find your user record
3. Change `role` field from `resident` to `admin`
4. Click **Save**

### Verify the Change

1. **Logout and login again** in the web app (important!)
2. Navigate to `/buildings`
3. You should now see the "Add Building" button
4. Your sidebar should show the "Buildings" menu item

### Role Types

| Role | Access Level |
|------|-------------|
| `admin` | Full CRUD access to all resources |
| `technician` | Read-only + incident updates |
| `resident` | Read-only (own resources) |

### After Upgrading

Once you're logged in as admin, you can:
- ✅ Create buildings (`POST /api/v1/buildings`)
- ✅ Edit buildings (`PATCH /api/v1/buildings/:id`)
- ✅ Manage users (`/users`)
- ✅ Access all admin-only features

### Troubleshooting

**Button still not showing?**
1. Hard refresh the page (Ctrl+Shift+R)
2. Check browser console for the user object: `localStorage.getItem('auth-storage')`
3. Ensure `role` is `"admin"`
4. If not, logout and login again

**Still getting 403?**
1. Clear browser localStorage: `localStorage.clear()`
2. Logout and login
3. Your access token needs to be regenerated with the new role
