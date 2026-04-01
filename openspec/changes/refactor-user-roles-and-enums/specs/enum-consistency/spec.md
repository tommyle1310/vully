## ADDED Requirements

### Requirement: Prisma Enum as Single Source of Truth
All backend code SHALL import enum types from `@prisma/client` (e.g., `UserRole`, `InvoiceStatus`, `IncidentStatus`). All frontend code SHALL import enum types/schemas from `@vully/shared-types`. Hardcoded string literals for enum values SHALL NOT be used anywhere in the codebase.

#### Scenario: Backend role decorator uses Prisma enum
- **WHEN** a controller endpoint requires role-based access
- **THEN** the `@Roles()` decorator SHALL use `UserRole` enum values (e.g., `@Roles(UserRole.admin)`)
- **AND** string literals like `'admin'` SHALL NOT be passed to `@Roles()`

#### Scenario: Backend service uses Prisma enum for comparisons
- **WHEN** a service method checks a user's role or an entity's status
- **THEN** it SHALL compare against the Prisma-generated enum constant (e.g., `UserRole.admin`, `IncidentStatus.open`)
- **AND** NOT against hardcoded strings like `'admin'` or `'ADMIN'`

#### Scenario: Frontend uses shared-types enum
- **WHEN** a frontend component checks a user's role or entity status
- **THEN** it SHALL import and use the enum values from `@vully/shared-types`
- **AND** NOT use hardcoded strings like `'admin'`, `'ADMIN'`, or `'RESIDENT'`

### Requirement: Enum Case Consistency
All enum values SHALL use lowercase as defined in the Prisma schema (e.g., `admin`, `technician`, `resident`). Uppercase variants like `'ADMIN'`, `'TECHNICIAN'`, `'RESIDENT'` SHALL NOT exist in the codebase.

#### Scenario: WebSocket gateway uses correct case
- **WHEN** the incidents gateway checks a user's role for room assignment
- **THEN** it SHALL compare against `UserRole.admin` (lowercase `'admin'`)
- **AND** NOT against `'ADMIN'` (uppercase)

#### Scenario: Frontend nav filtering uses correct case
- **WHEN** the dashboard layout filters nav items by role
- **THEN** role values in `navItems` SHALL use lowercase values matching the Prisma enum
- **AND** the comparison logic SHALL be case-exact, not `toLowerCase().includes()`

### Requirement: AuthUser Interface Typed with Enum
The `AuthUser` interface used across controllers and services SHALL type `roles` using `UserRole[]` from `@prisma/client` (backend) or `@vully/shared-types` (frontend), not `string` or `string[]`.

#### Scenario: Backend AuthUser uses typed roles
- **WHEN** the `AuthUser` interface is defined in the backend
- **THEN** it SHALL declare `roles: UserRole[]` using the Prisma-generated `UserRole` type
- **AND** NOT `role: string`

#### Scenario: Frontend auth store uses typed roles
- **WHEN** the `User` interface is defined in `authStore.ts`
- **THEN** it SHALL declare `roles: UserRole[]` using the type from `@vully/shared-types`
- **AND** NOT `role: string`

### Requirement: DTO Enum Validation
All DTOs that accept enum values SHALL use `@IsEnum()` with the Prisma-generated enum, not with inline string arrays. Swagger `@ApiProperty()` SHALL reference the enum type.

#### Scenario: CreateUserDto role validation
- **WHEN** the `CreateUserDto` validates the `roles` field
- **THEN** it SHALL use `@IsEnum(UserRole, { each: true })` from `@prisma/client`
- **AND** NOT `@IsEnum(['admin', 'technician', 'resident'])`

#### Scenario: Invoice status filter validation
- **WHEN** an API query parameter accepts invoice status
- **THEN** it SHALL validate against `InvoiceStatus` enum from `@prisma/client`
- **AND** NOT against inline string arrays
