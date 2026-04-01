# Implementation Tasks: Refactor User Roles & Enums

## Phase 1: Database & Shared Types (Backend Foundation)

### 1.1 Create UserRole Junction Table
- [ ] Create Prisma migration for `UserRole` model (user-role junction table)
- [ ] Add `roles UserRole[]` relation to `User` model
- [ ] Remove deprecated `role` field from `User` (mark for later migration)
- [ ] Add unique constraint on `userId + role` combination
- [ ] Test migration on dev database
- **Validation**: `prisma migrate dev` runs successfully, junction table created

### 1.2 Create Permission System Tables
- [ ] Create `Permission` model in Prisma schema
- [ ] Create `RolePermission` junction table (role → permissions mapping)
- [ ] Seed default permissions for existing roles (admin: *, technician: incidents.update, resident: own resources)
- [ ] Create migration and test
- **Validation**: Seed script populates default RBAC rules

### 1.3 Centralize Enums in Shared Types
- [ ] Export `UserRole`, `IncidentStatus`, `PaymentStatus`, `PaymentMethod` enums from `@vully/shared-types`
- [ ] Create `enums/` folder in shared-types with dedicated files per enum
- [ ] Add JSDoc comments to each enum value
- [ ] Build shared-types package and verify exports
- **Validation**: Backend can import `UserRole` from `@vully/shared-types`

---

## Phase 2: Backend Refactor (API & Auth)

### 2.1 Update Auth & DTOs
- [ ] Update `AuthUser` interface in `auth.interface.ts` to `roles: UserRole[]`
- [ ] Update `UserDto` in `identity/dto/user.dto.ts` to use `roles: UserRole[]`
- [ ] Update `CreateUserDto` and `UpdateUserDto` with role array validation (min 1, max 3)
- [ ] Update `JwtPayload` to include `roles: UserRole[]`
- [ ] Update JWT strategy to populate `roles` array from token
- **Validation**: Auth DTOs use typed enum arrays

### 2.2 Refactor RolesGuard & Decorator
- [ ] Update `@Roles()` decorator to accept `UserRole[]` enum values instead of strings
- [ ] Update `RolesGuard` to check `user.roles.some(r => requiredRoles.includes(r))`
- [ ] Update Swagger decorators to show enum values in API docs
- **Validation**: `@Roles(UserRole.admin)` compiles, guard checks array membership

### 2.3 Fix String Literals in Controllers
- [ ] **Identity Module**: Replace `@Roles('admin')` → `@Roles(UserRole.admin)` in 4 routes
- [ ] **Billing Module**: Update role checks in `billing.controller.ts` (3 routes)
- [ ] **Incidents Module**: Update `incidents.gateway.ts` role checks (fix `'ADMIN'` → `UserRole.admin`)
- [ ] **AI Assistant Module**: Update `ai-assistant.controller.ts` (1 route)
- [ ] Run TypeScript compiler to catch remaining string literals
- **Validation**: No `@Roles('admin')` or `'RESIDENT'` string literals remain

### 2.4 Update Users Service & Repository
- [ ] Update `UsersService.create()` to handle `roles: UserRole[]` (create junction records)
- [ ] Update `UsersService.update()` to manage role assignments (add/remove junction records)
- [ ] Add `UsersService.updateUserRoles()` method for admin role management
- [ ] Add validation: email must have 1-3 roles
- [ ] Update Prisma queries to include `roles` relation
- **Validation**: User CRUD operations correctly manage junction table

### 2.5 Create Permissions API
- [ ] Create `PermissionsController` with routes:
  - `GET /permissions` - list all permissions (admin only)
  - `GET /permissions/:role` - get permissions for a role
  - `PUT /permissions/:role` - update role permissions (admin only)
- [ ] Create `PermissionsService` with CRUD logic
- [ ] Add Swagger docs for new endpoints
- [ ] Add unit tests for permission service
- **Validation**: Admin can modify role permissions via API

---

## Phase 3: Frontend Refactor (Web App)

### 3.1 Update Auth Store & Types
- [ ] Update `authStore.ts` to use `roles: UserRole[]` from shared-types
- [ ] Create helper functions: `hasRole(role)`, `hasAnyRole(roles)`, `hasAllRoles(roles)`
- [ ] Update login/register flows to handle role arrays
- [ ] Update profile page to display all user roles
- **Validation**: Auth store correctly handles multi-role users

### 3.2 Fix Role Checks in Components
- [ ] **Layout Navbar**: Fix `layout.tsx` line 51 (`user.role` → `user.roles.includes(...)`)
- [ ] **Layout Navbar**: Fix nav data uppercase `'ADMIN'` → `UserRole.admin` (line 18-40)
- [ ] Search entire `apps/web/src` for `user.role` and replace with `user.roles.includes(...)`
- [ ] Use `hasRole()` helper from auth store for cleaner checks
- **Validation**: No type errors, nav filtering works correctly

### 3.3 Build Users Management Page
- [ ] Create `app/(dashboard)/users/page.tsx` with TanStack Table
- [ ] Add columns: Email, Name, Roles (badges), Apartment, Actions
- [ ] Implement filters: role, apartment, search by email/name
- [ ] Add "Edit User" dialog with role multi-select (max 3)
- [ ] Integrate with `PATCH /users/:id` API for role updates
- [ ] Add loading states and error handling
- [ ] Use Shadcn/UI components (Table, Dialog, Badge, Select)
- **Validation**: Admin can view users table and edit roles

### 3.4 Build Permissions Management Page
- [ ] Create `app/(dashboard)/settings/permissions/page.tsx`
- [ ] Display role-permission matrix (rows = permissions, cols = roles)
- [ ] Add checkboxes for toggling permissions per role
- [ ] Integrate with `PUT /permissions/:role` API
- [ ] Add confirmation dialog for permission changes
- [ ] Restrict to admin-only (role guard)
- **Validation**: Admin can modify which permissions each role has

### 3.5 Update Shared Types Imports
- [ ] Replace all `import { UserRole } from '@prisma/client'` → `from '@vully/shared-types'`
- [ ] Update other enum imports (`IncidentStatus`, `PaymentStatus`, etc.)
- [ ] Run `pnpm build` in web app to verify imports
- **Validation**: No Prisma client imports in frontend code

---

## Phase 4: Data Migration & Testing

### 4.1 Write Data Migration Script
- [ ] Create script to migrate existing `User.role` → `UserRole[]` junction records
- [ ] Handle edge cases (users with null role → default to `resident`)
- [ ] Create rollback script (in case migration fails)
- [ ] Test on dev database clone
- **Validation**: All existing users have at least one role in junction table

### 4.2 Update Test Fixtures
- [ ] Update factory functions (`createMockUser()`) to use `roles: UserRole[]`
- [ ] Update E2E test seeds with multi-role users
- [ ] Update unit test mocks to use enum arrays
- **Validation**: `pnpm test` passes in both API and web apps

### 4.3 Integration Testing
- [ ] Test multi-role user login (JWT contains all roles)
- [ ] Test admin assigning 3 roles to a user
- [ ] Test validation error when assigning 4+ roles
- [ ] Test permission changes (admin grants technician new permission)
- [ ] Test role-based nav filtering with multi-role user
- **Validation**: E2E tests cover multi-role scenarios

### 4.4 API Documentation Update
- [ ] Regenerate Swagger docs (enums should show in dropdown)
- [ ] Update API_GUIDE.md with new permission endpoints
- [ ] Document role assignment rules (1-3 roles per user)
- **Validation**: Swagger UI shows typed enums, not strings

---

## Phase 5: Cleanup & Deprecation

### 5.1 Remove Deprecated Fields
- [ ] Create migration to drop `User.role` column (after data migration)
- [ ] Remove legacy role-related code comments
- [ ] Update ARCHITECTURE.md RBAC section with new multi-role design
- **Validation**: Old `role` field no longer exists in schema

### 5.2 Final Validation
- [ ] Run full test suite (`pnpm test` in root)
- [ ] Run linter (`pnpm lint`)
- [ ] Test all RBAC scenarios in staging environment
- [ ] Verify Lighthouse score > 90 on users management page
- **Validation**: All tests pass, no type errors, performance maintained

---

## Dependencies & Sequencing

**Critical Path**:
1. Phase 1 (DB) must complete before Phase 2 (Backend)
2. Phase 2 (Backend) must complete before Phase 3 (Frontend)
3. Phase 4.1 (Migration) must happen before Phase 5.1 (Cleanup)

**Parallelizable Work**:
- Tasks 2.3, 2.4, 2.5 can run in parallel (different modules)
- Tasks 3.2, 3.3, 3.4 can run in parallel (different pages)
- Testing tasks (4.2, 4.3) can run in parallel

**Estimated Effort**: 
- Phase 1: 4 hours
- Phase 2: 6 hours
- Phase 3: 8 hours
- Phase 4: 4 hours
- Phase 5: 2 hours
- **Total**: ~24 hours (3 working days)
