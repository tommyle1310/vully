# Spec Delta: Identity (OAuth + Extended RBAC)

## ADDED Requirements

### Requirement: Google OAuth Authentication
The system SHALL allow users to authenticate via Google OAuth 2.0.

#### Scenario: New user signs in with Google
- **GIVEN** a user without an existing account
- **WHEN** the user completes Google OAuth flow
- **THEN** the system creates a new user with `UserRole.resident`
- **AND** creates an `oauth_accounts` record linking to Google
- **AND** returns JWT access + refresh tokens

#### Scenario: Existing user signs in with Google (email match)
- **GIVEN** a user with existing email-based account
- **WHEN** the user completes Google OAuth with the same email
- **THEN** the system links the Google account to the existing user
- **AND** returns JWT tokens for the existing user

#### Scenario: Returning user signs in with Google
- **GIVEN** a user with linked Google account
- **WHEN** the user completes Google OAuth
- **THEN** the system returns JWT tokens for the linked user

---

### Requirement: Zalo OAuth Authentication
The system SHALL allow users to authenticate via Zalo OAuth.

#### Scenario: User signs in with Zalo
- **GIVEN** a valid Zalo OAuth callback
- **WHEN** the callback is processed
- **THEN** the system retrieves Zalo user info (phone, name, zalo_id)
- **AND** stores `zalo_id` on user profile for ZNS notifications
- **AND** creates or links user account
- **AND** returns JWT tokens

---

### Requirement: OAuth Account Management
The system SHALL allow users to manage their linked OAuth accounts.

#### Scenario: User views linked accounts
- **GIVEN** an authenticated user
- **WHEN** the user calls `GET /api/v1/auth/linked-accounts`
- **THEN** the system returns list of linked OAuth providers (without tokens)

#### Scenario: User unlinks OAuth account
- **GIVEN** a user with linked OAuth account
- **AND** the user has password-based login enabled
- **WHEN** the user calls `DELETE /api/v1/auth/linked-accounts/{provider}`
- **THEN** the system removes the OAuth link
- **AND** returns HTTP 204

#### Scenario: Cannot unlink last auth method
- **GIVEN** a user with only OAuth login (no password)
- **WHEN** the user attempts to unlink the only OAuth provider
- **THEN** the system returns HTTP 400
- **AND** error message: "Cannot remove last authentication method"

---

## MODIFIED Requirements

### Requirement: Extended User Roles
The system SHALL support additional operational roles beyond admin/technician/resident.

#### Scenario: Assign security role
- **GIVEN** an admin user
- **WHEN** the admin assigns `UserRole.security` to a user
- **THEN** the user can access resident directory (read-only)
- **AND** the user can view access card assignments
- **AND** the user cannot modify billing or contracts

#### Scenario: Assign accountant role
- **GIVEN** an admin user
- **WHEN** the admin assigns `UserRole.accountant` to a user
- **THEN** the user can manage invoices and payments
- **AND** the user can view financial reports
- **AND** the user cannot modify users or building settings

#### Scenario: Assign building_manager role
- **GIVEN** an admin user
- **WHEN** the admin assigns `UserRole.building_manager` to a user
- **THEN** the user has full access within their assigned buildings
- **AND** the user cannot modify organization-level settings

#### Scenario: Assign housekeeping role
- **GIVEN** an admin user
- **WHEN** the admin assigns `UserRole.housekeeping` to a user
- **THEN** the user can view and update assigned incident statuses
- **AND** the user cannot access billing or contracts

---

### Requirement: Role-based Authorization (Updated)
The system SHALL enforce role-based access control for all endpoints.

#### Scenario: Security guard accesses resident list
- **GIVEN** a user with `UserRole.security`
- **WHEN** the user accesses `GET /api/v1/apartments/{id}/residents`
- **THEN** the system returns resident names and apartment numbers
- **AND** does NOT include financial or contract details

#### Scenario: Accountant accesses billing
- **GIVEN** a user with `UserRole.accountant`
- **WHEN** the user accesses `GET /api/v1/invoices`
- **THEN** the system returns all invoices
- **AND** allows filtering by status, date, building

#### Scenario: Unauthorized role access
- **GIVEN** a user with `UserRole.housekeeping`
- **WHEN** the user attempts to access `GET /api/v1/invoices`
- **THEN** the system returns HTTP 403 Forbidden

---

### Requirement: Building-Scoped Authorization (NEW)
The system SHALL restrict non-admin roles to only access data from their assigned buildings.

#### Scenario: Security guard assigned to specific building
- **GIVEN** a user with `UserRole.security` assigned to Building A via `user_building_assignments`
- **WHEN** the user accesses `GET /api/v1/buildings/A/residents`
- **THEN** the system returns residents of Building A

#### Scenario: Security guard denied access to unassigned building
- **GIVEN** a user with `UserRole.security` assigned to Building A only
- **WHEN** the user accesses `GET /api/v1/buildings/B/residents`
- **THEN** the system returns HTTP 403 Forbidden
- **AND** error message: "Not assigned to this building"

#### Scenario: Admin bypasses building scope
- **GIVEN** a user with `UserRole.admin`
- **WHEN** the user accesses any building's data
- **THEN** the system allows access (admin bypasses scoping)

#### Scenario: Admin assigns user to building
- **GIVEN** an admin user
- **WHEN** the admin calls `POST /api/v1/users/{userId}/building-assignments` with `{ buildingId, role }`
- **THEN** the system creates `user_building_assignments` record
- **AND** returns HTTP 201

#### Scenario: Admin removes building assignment
- **GIVEN** a user with building assignment
- **WHEN** the admin calls `DELETE /api/v1/users/{userId}/building-assignments/{buildingId}`
- **THEN** the system removes the assignment
- **AND** returns HTTP 204

---

## Schema Changes

### UserRole Enum Extension
```prisma
enum UserRole {
  admin
  technician
  resident
  security         // NEW
  housekeeping     // NEW
  accountant       // NEW
  building_manager // NEW
}
```

### OAuth Accounts Model
```prisma
model oauth_accounts {
  id               String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  user_id          String    @db.Uuid
  provider         String    @db.VarChar(20)  // 'google' | 'zalo'
  provider_user_id String    @db.VarChar(100)
  access_token     String?   @db.VarChar(2000)  // Encrypted
  refresh_token    String?   @db.VarChar(2000)  // Encrypted
  token_expires_at DateTime? @db.Timestamptz(6)
  created_at       DateTime  @default(now()) @db.Timestamptz(6)
  updated_at       DateTime  @updatedAt @db.Timestamptz(6)
  
  user users @relation(fields: [user_id], references: [id], onDelete: Cascade)
  
  @@unique([provider, provider_user_id])
  @@index([user_id])
}
```

### Users Model Extension
```prisma
model users {
  // Existing fields...
  
  // NEW: OAuth relation
  oauth_accounts oauth_accounts[]
  device_tokens  device_tokens[]
  notification_preferences user_notification_preferences?
  building_assignments user_building_assignments[]
  
  // NEW: Zalo integration
  zalo_id          String? @unique @db.VarChar(100)
  zalo_oa_follower Boolean @default(false)
}
```

### User Building Assignments Model (NEW)
```prisma
model user_building_assignments {
  id          String    @id @default(uuid()) @db.Uuid
  user_id     String    @db.Uuid
  building_id String    @db.Uuid
  role        UserRole  // The role this user has within this building
  assigned_at DateTime  @default(now()) @db.Timestamptz
  assigned_by String?   @db.Uuid
  
  user     users     @relation(fields: [user_id], references: [id], onDelete: Cascade)
  building buildings @relation(fields: [building_id], references: [id], onDelete: Cascade)
  assigner users?    @relation("Assigner", fields: [assigned_by], references: [id])
  
  @@unique([user_id, building_id])
  @@index([building_id])
}
```
