## Context

Vully currently assigns a single role per user via `User.role: UserRole` (Prisma enum). The RBAC system uses `@Roles('admin')` string literals in controllers, verified by `RolesGuard`. The frontend stores `role: string` in Zustand and compares with mixed-case strings (`'admin'`, `'ADMIN'`, `'RESIDENT'`). No `/users` management page exists in the frontend.

**Stakeholders**: All authenticated users (JWT payload changes), admins (new management UI), frontend (role checks refactored).

## Goals / Non-Goals

**Goals:**
- Allow a user to hold 1–3 roles simultaneously (e.g., admin + technician)
- Store role assignments in a dedicated join table for flexibility
- Provide admin UI for CRUD user management and role assignment
- Establish a single source of truth for enums: Prisma schema → `@prisma/client` (BE) / `@vully/shared-types` (FE)
- Eliminate all hardcoded role/status string literals across BE and FE

**Non-Goals:**
- Fine-grained permission system (resource-level ACL) — current endpoint-level RBAC is sufficient
- Permission storage in DB — permissions stay decorative (`@Roles()`) on endpoints for now
- Role hierarchy / inheritance (admin does NOT auto-include technician permissions)
- User self-service role requests or approval workflows

## Decisions

### D1: Many-to-many `user_roles` join table vs roles array column
- **Decision**: Use a `user_roles` join table (`userId`, `role`) with a unique constraint on `(userId, role)`.
- **Alternatives considered**:
  - `UserRole[]` array column: simpler but loses referential integrity, harder to query/index, no DB-level constraint on max 3 roles.
  - Separate `Role` entity with ID: over-engineered since roles are a fixed enum, not user-defined.
- **Rationale**: Join table allows DB-level unique constraint, easy indexing, `CHECK` constraint for min/max roles via application layer, and works with Prisma's `@relation` system.

### D2: Prisma enum stays as source of truth for role values
- **Decision**: Keep `enum UserRole { admin, technician, resident }` in Prisma schema. Backend imports from `@prisma/client`. Frontend uses matching Zod schema from `@vully/shared-types`.
- **Rationale**: Prisma generates typed enums; shared-types mirrors them for FE. Single source of truth in `schema.prisma`.

### D3: JWT payload carries flat `roles` array
- **Decision**: JWT payload becomes `{ sub, email, roles: UserRole[] }` instead of `{ sub, email, role: UserRole }`.
- **Rationale**: Flat array in JWT avoids extra DB queries on every request. Max 3 roles = negligible token size increase.

### D4: `RolesGuard` uses `some()` matching (OR logic)
- **Decision**: A route decorated with `@Roles(UserRole.admin, UserRole.technician)` allows access if the user holds ANY of those roles.
- **Rationale**: OR logic is the standard RBAC pattern. AND logic (require all listed roles) is not needed for any current endpoint.

### D5: FE role checks use helper function with typed UserRole
- **Decision**: Create `hasRole(user, role: UserRole): boolean` and `hasAnyRole(user, roles: UserRole[]): boolean` helpers in shared lib.
- **Rationale**: Centralizes role checks, avoids scattered `.includes()` calls, enables future multi-role UI logic.

### D6: No permission table in DB (yet)
- **Decision**: Keep permissions defined as `@Roles()` decorators on endpoints. Do NOT create a `Permission` or `RolePermission` table.
- **Rationale**: Only 3 fixed roles exist. Endpoint-level guards are adequate. A permission table adds complexity with no current benefit. Can be added later if custom role creation is needed.

## Risks / Trade-offs

- **JWT invalidation on deploy**: Changing `role` → `roles` in JWT payload breaks existing tokens. **Mitigation**: Deploy during low-traffic window; users will be prompted to re-login. Refresh token rotation handles this gracefully.
- **Migration data loss risk**: Moving from `User.role` to `user_roles` table. **Mitigation**: Migration script copies existing `role` value into `user_roles` for every user before dropping the column.
- **FE widespread changes**: Every `user.role === 'admin'` check must become `hasRole(user, 'admin')`. **Mitigation**: Use search-and-replace with the helper function; limited number of files (~10).
- **Performance**: Loading roles requires a JOIN or subquery. **Mitigation**: Roles are included in JWT; no extra DB query per request. User list endpoint eager-loads roles.

## Migration Plan

1. Create Prisma migration: add `user_roles` table
2. Data migration SQL: `INSERT INTO user_roles (user_id, role) SELECT id, role FROM users`
3. Update all backend code to use `user_roles` relation instead of `User.role`
4. Create second migration: drop `User.role` column (after verifying data integrity)
5. Update JWT generation/validation to use `roles[]`
6. Update all FE code to use `roles[]` and shared enum
7. Deploy BE first (backward-compatible JWT validation accepts both `role` and `roles` during transition)

## Open Questions

- None — all decisions are straightforward given the 3 fixed roles and current scale.
