# Change: Refactor Multi-Role User Management & Enum Consistency

## Why

The current system hardcodes a single `role` field per user (`User.role: UserRole`), limiting each email to exactly one role. This is not scalable — a property manager may need both `admin` and `technician` roles. Additionally, enums defined in Prisma and `@vully/shared-types` are not used consistently: backend controllers use string literals (`'admin'`), the WebSocket gateway uses uppercase (`'ADMIN'`), and the frontend uses untyped `string` comparisons with mixed casing (`'admin'` vs `'RESIDENT'`). There is also no admin UI for managing users.

## What Changes

### 1. Multi-Role Support (DB + BE + FE)
- **BREAKING**: Replace `User.role` (single enum) with a many-to-many `UserRole` join table (`user_roles`)
- Each user MUST have at least 1 role and at most 3 roles
- Admin can assign/remove roles via API and UI
- Update JWT payload to carry `roles: string[]` instead of `role: string`
- Update `RolesGuard` to check `requiredRoles.some(r => user.roles.includes(r))`
- Update `AuthUser` interface everywhere to use `roles: UserRole[]`

### 2. Enum Consistency (BE + FE)
- Replace all hardcoded string literals with Prisma-generated enums (`UserRole`, `IncidentStatus`, etc.) in backend
- Replace all `@Roles('admin')` string usage with `@Roles(UserRole.admin)` using `@prisma/client` import
- Fix case inconsistency in `incidents.gateway.ts` (`'ADMIN'` → `UserRole.admin`)
- Update `@vully/shared-types` enums to stay in sync with Prisma schema (single source of truth)
- Update FE `authStore` to type `roles` properly using shared types
- Fix FE role checks to use shared enum values consistently

### 3. User Management UI (FE)
- Build `/users` page with CRUD: list, create, edit, deactivate users
- Role assignment UI (multi-select, 1-3 roles enforced)
- Admin-only access enforced via `ProtectedRoute`
- Use TanStack Table for user list, TanStack Query for API calls, Shadcn/UI components

## Impact

- **Affected specs**: None currently in `openspec/specs/` (all new)
- **Affected code**:
  - `apps/api/prisma/schema.prisma` — new `user_roles` table, remove `User.role`
  - `apps/api/src/common/guards/roles.guard.ts` — multi-role check
  - `apps/api/src/common/decorators/roles.decorator.ts` — use enum type
  - `apps/api/src/modules/identity/` — auth service, users service, DTOs, JWT payload
  - `apps/api/src/modules/incidents/` — gateway enum fix, service role checks
  - `apps/api/src/modules/billing/` — controller enum fix
  - `apps/api/src/modules/stats/` — role string fixes
  - `apps/api/src/modules/ai-assistant/` — role string fixes
  - `packages/shared-types/src/enums/index.ts` — ensure sync with Prisma
  - `packages/shared-types/src/entities/index.ts` — update User schema for roles array
  - `apps/web/src/stores/authStore.ts` — `roles: string[]` typed with shared enum
  - `apps/web/src/app/(dashboard)/layout.tsx` — multi-role nav filtering
  - `apps/web/src/app/(dashboard)/users/` — new page (CRUD)
  - `apps/web/src/components/protected-route.tsx` — multi-role check
  - All FE components with hardcoded role strings
- **Migration**: Requires a Prisma migration to create `user_roles` table, migrate existing `role` data, and drop the `role` column
- **Breaking**: JWT payload shape changes (`role` → `roles`), existing tokens will be invalidated on deploy
