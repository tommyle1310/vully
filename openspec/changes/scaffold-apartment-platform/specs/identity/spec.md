# Capability: Identity

## ADDED Requirements

### Requirement: User Authentication
The system SHALL provide secure JWT-based authentication with access and refresh tokens.

#### Scenario: Successful login
- **GIVEN** a registered user with valid credentials
- **WHEN** the user submits email and password to `/api/auth/login`
- **THEN** the system returns a JWT access token (15 min expiry) and refresh token
- **AND** the refresh token is stored securely (httpOnly cookie or secure storage)

#### Scenario: Token refresh
- **GIVEN** a valid refresh token
- **WHEN** the client requests `/api/auth/refresh`
- **THEN** the system returns a new access token
- **AND** rotates the refresh token

#### Scenario: Invalid credentials
- **GIVEN** invalid email or password
- **WHEN** the user attempts login
- **THEN** the system returns 401 Unauthorized
- **AND** does not reveal which field is incorrect

---

### Requirement: Role-Based Access Control (RBAC)
The system SHALL enforce role-based permissions for Admin, Technician, and Resident roles.

#### Scenario: Admin access
- **GIVEN** an authenticated user with Admin role
- **WHEN** accessing any administrative endpoint
- **THEN** the system grants access

#### Scenario: Technician access
- **GIVEN** an authenticated user with Technician role
- **WHEN** accessing apartment data
- **THEN** the system grants read access
- **AND** denies write access to apartments

#### Scenario: Resident access
- **GIVEN** an authenticated user with Resident role
- **WHEN** accessing another resident's data
- **THEN** the system returns 403 Forbidden

---

### Requirement: User Management
The system SHALL allow administrators to manage user accounts.

#### Scenario: Create user
- **GIVEN** an authenticated Admin
- **WHEN** POST to `/api/users` with valid user data
- **THEN** the system creates the user account
- **AND** returns the user profile (without password)

#### Scenario: Deactivate user
- **GIVEN** an authenticated Admin
- **WHEN** PATCH to `/api/users/:id` with `{ active: false }`
- **THEN** the system deactivates the account
- **AND** invalidates all active sessions for that user

---

### Requirement: Audit Logging
The system SHALL log all sensitive identity operations for compliance.

#### Scenario: Login audit
- **GIVEN** any login attempt
- **WHEN** login succeeds or fails
- **THEN** the system logs actor IP, timestamp, and result

#### Scenario: Role change audit
- **GIVEN** an Admin changing a user's role
- **WHEN** the role update succeeds
- **THEN** the system logs actor, target user, old role, new role, and timestamp
