## ADDED Requirements

### Requirement: Multi-Role User Assignment
The system SHALL support assigning multiple roles to a single user via a `user_roles` join table. Each user MUST have at least 1 role and at most 3 roles. The `user_roles` table SHALL have a unique constraint on `(userId, role)` to prevent duplicate assignments.

#### Scenario: User created with default role
- **WHEN** a new user is created without specifying roles
- **THEN** the user SHALL be assigned the `resident` role by default

#### Scenario: User assigned multiple roles
- **WHEN** an admin assigns `admin` and `technician` roles to a user
- **THEN** the user SHALL have both roles stored in the `user_roles` table
- **AND** the user SHALL be able to access endpoints permitted by either role

#### Scenario: Maximum role limit enforced
- **WHEN** an admin attempts to assign a 4th role to a user who already has 3 roles
- **THEN** the system SHALL reject the request with a 400 error
- **AND** the error message SHALL indicate the maximum of 3 roles is exceeded

#### Scenario: Minimum role limit enforced
- **WHEN** an admin attempts to remove the last remaining role from a user
- **THEN** the system SHALL reject the request with a 400 error
- **AND** the error message SHALL indicate at least 1 role is required

#### Scenario: Duplicate role prevention
- **WHEN** an admin assigns a role that the user already holds
- **THEN** the system SHALL return a 409 conflict error

### Requirement: Role-Based Route Authorization with Multi-Role
The `RolesGuard` SHALL check if the authenticated user holds ANY of the required roles for a given endpoint (OR logic). The guard SHALL read roles from the JWT `roles` claim (array).

#### Scenario: User with matching role
- **WHEN** a user with roles `[admin, technician]` accesses an endpoint requiring `@Roles(UserRole.admin)`
- **THEN** access SHALL be granted

#### Scenario: User without matching role
- **WHEN** a user with roles `[resident]` accesses an endpoint requiring `@Roles(UserRole.admin)`
- **THEN** access SHALL be denied with a 403 Forbidden response

#### Scenario: Endpoint with multiple allowed roles
- **WHEN** an endpoint is decorated with `@Roles(UserRole.admin, UserRole.technician)`
- **AND** a user with roles `[technician]` accesses it
- **THEN** access SHALL be granted

### Requirement: JWT Payload with Roles Array
The JWT access token payload SHALL include a `roles` field containing an array of `UserRole` values. The `role` (singular) field SHALL be removed.

#### Scenario: JWT token generation
- **WHEN** a user with roles `[admin, technician]` logs in
- **THEN** the JWT payload SHALL contain `{ sub: "<uuid>", email: "<email>", roles: ["admin", "technician"] }`

#### Scenario: JWT token refresh
- **WHEN** a refresh token is exchanged for a new access token
- **THEN** the new JWT SHALL contain the user's current roles from the `user_roles` table

### Requirement: Admin Role Management API
The system SHALL provide API endpoints for admins to manage user roles. Only users with the `admin` role SHALL be able to assign or remove roles.

#### Scenario: Admin assigns role to user
- **WHEN** an admin sends `PATCH /users/:id/roles` with `{ roles: ["admin", "technician"] }`
- **THEN** the user's roles SHALL be updated to exactly the specified set
- **AND** an audit log entry SHALL be created

#### Scenario: Non-admin attempts role change
- **WHEN** a non-admin user attempts to change another user's roles
- **THEN** the system SHALL respond with 403 Forbidden

#### Scenario: Role change audit logging
- **WHEN** an admin changes a user's roles from `[resident]` to `[resident, technician]`
- **THEN** an audit log SHALL record the actor, target user, old roles, and new roles

### Requirement: Database Migration for Multi-Role
The system SHALL provide a Prisma migration that creates the `user_roles` table, migrates existing `User.role` data, and removes the `User.role` column.

#### Scenario: Migration creates user_roles table
- **WHEN** the migration runs
- **THEN** a `user_roles` table SHALL be created with columns `id`, `user_id`, `role`, `assigned_at`
- **AND** a unique constraint on `(user_id, role)` SHALL exist

#### Scenario: Migration preserves existing role data
- **WHEN** the migration runs on a database with existing users
- **THEN** each user's current `role` value SHALL be inserted into `user_roles`
- **AND** no user SHALL be left without at least one role
