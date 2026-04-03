# Multi-Tenant Architecture Specification

## Overview

This capability enables Vully to operate as a multi-tenant SaaS platform where each property management organization has isolated data with Row-Level Security (RLS) at the database layer.

---

## ADDED Requirements

### Requirement: Organization Data Isolation

The system SHALL enforce data isolation between organizations at the database level using PostgreSQL Row-Level Security (RLS).

#### Scenario: Tenant data is isolated by default
- **GIVEN** User A belongs to Organization A
- **AND** User B belongs to Organization B
- **WHEN** User A queries buildings
- **THEN** Only buildings belonging to Organization A are returned
- **AND** Buildings from Organization B are never visible

#### Scenario: Cross-tenant access is blocked at database level
- **GIVEN** A malicious query attempts to access Organization B's data from Organization A's context
- **WHEN** The query is executed
- **THEN** PostgreSQL RLS policy rejects the query
- **AND** No data from Organization B is returned

#### Scenario: Platform admin can access all organizations
- **GIVEN** A user with `vully_admin` database role
- **WHEN** The user queries data
- **THEN** RLS policies are bypassed
- **AND** Cross-organization data is accessible for platform operations

---

### Requirement: Organization Context Management

The system SHALL require organization context for all authenticated API requests (except authentication endpoints).

#### Scenario: Request with valid organization header
- **GIVEN** An authenticated user
- **AND** User has membership in Organization A
- **WHEN** User makes API request with `X-Organization-ID: <org-A-id>` header
- **THEN** Request proceeds with Organization A context
- **AND** All database queries are scoped to Organization A

#### Scenario: Request without organization header
- **GIVEN** An authenticated user
- **WHEN** User makes API request without `X-Organization-ID` header
- **THEN** Request is rejected with 401 Unauthorized
- **AND** Error message indicates "Organization context required"

#### Scenario: Request with organization user doesn't belong to
- **GIVEN** An authenticated user belonging to Organization A
- **WHEN** User makes API request with `X-Organization-ID: <org-B-id>` header
- **THEN** Request is rejected with 403 Forbidden
- **AND** Error message indicates "No access to this organization"

---

### Requirement: Organization Membership Management

The system SHALL support users belonging to multiple organizations with different roles per organization.

#### Scenario: User belongs to multiple organizations
- **GIVEN** A user with memberships in Organization A (as `building_admin`) and Organization B (as `viewer`)
- **WHEN** User lists their organizations
- **THEN** Both organizations are returned
- **AND** Each membership includes the user's role in that organization

#### Scenario: Invite new member to organization
- **GIVEN** An organization `owner` in Organization A
- **AND** A user with email `new@example.com` exists
- **WHEN** Owner invites user to Organization A with role `leasing_agent`
- **THEN** User receives organization membership
- **AND** User can access Organization A with `leasing_agent` permissions
- **AND** Audit log records the membership creation

#### Scenario: Remove member from organization
- **GIVEN** An organization `owner` in Organization A
- **AND** User B is a member of Organization A
- **WHEN** Owner removes User B from Organization A
- **THEN** User B's membership is deleted
- **AND** User B can no longer access Organization A
- **AND** Audit log records the membership removal

---

### Requirement: Organization Subscription Tiers

The system SHALL enforce feature limits based on organization subscription tier.

#### Scenario: Starter tier building limit
- **GIVEN** An organization on `starter` tier (limit: 1 building)
- **AND** Organization already has 1 building
- **WHEN** Admin attempts to create another building
- **THEN** Request is rejected with 403 Forbidden
- **AND** Error message indicates "Building limit reached for starter tier"

#### Scenario: Professional tier building limit
- **GIVEN** An organization on `professional` tier (limit: 5 buildings)
- **AND** Organization has 4 buildings
- **WHEN** Admin creates a new building
- **THEN** Building is created successfully

---

## Data Model

### Organization
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| name | VARCHAR(255) | Organization display name |
| slug | VARCHAR(100) | URL-friendly unique identifier |
| subscription_tier | Enum | starter, professional, enterprise |
| settings | JSONB | Organization-specific settings |
| is_active | Boolean | Soft delete flag |
| created_at | Timestamp | Creation time |
| updated_at | Timestamp | Last update time |

### OrganizationMember
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| organization_id | UUID | FK to Organization |
| user_id | UUID | FK to User |
| role | Enum | OrganizationRole |
| is_primary | Boolean | Primary organization for user |
| created_at | Timestamp | Creation time |

### OrganizationRole Enum
- `owner` — Full access including billing
- `portfolio_admin` — All buildings, no billing
- `building_admin` — Specific buildings only
- `leasing_agent` — Contracts, tenants
- `accountant` — Financial operations only
- `viewer` — Read-only access

---

## API Endpoints

| Method | Path | Description | Min Role |
|--------|------|-------------|----------|
| GET | /api/organizations | List user's organizations | Any |
| POST | /api/organizations | Create new organization | (creates owner) |
| GET | /api/organizations/:id | Get organization details | viewer |
| PATCH | /api/organizations/:id | Update organization | portfolio_admin |
| DELETE | /api/organizations/:id | Delete organization | owner |
| GET | /api/organizations/:id/members | List members | viewer |
| POST | /api/organizations/:id/members | Invite member | portfolio_admin |
| PATCH | /api/organizations/:id/members/:userId | Update member role | portfolio_admin |
| DELETE | /api/organizations/:id/members/:userId | Remove member | portfolio_admin |

---

## Related Capabilities
- **Identity**: Organization-scoped role assignments
- **All modules**: Require organization context for data access
