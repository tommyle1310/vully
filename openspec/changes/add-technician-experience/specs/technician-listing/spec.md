# Technician Listing

## ADDED Requirements

### Requirement: List Technicians with Workload
The system MUST provide an endpoint for admins to retrieve a list of all technician users enriched with their current workload (active incident counts by status).

#### Scenario: List all technicians with workload counts
- **GIVEN** an admin user
- **WHEN** `GET /users/technicians` is called
- **THEN** the response contains all users with the `technician` role
- **AND** each technician includes `workload.assigned`, `workload.inProgress`, `workload.pendingReview`, and `workload.total` counts
- **AND** the response is cached in Redis with a 2-minute TTL

#### Scenario: Technician list includes profile metadata
- **GIVEN** a technician with `specialties` and `availabilityStatus` set
- **WHEN** `GET /users/technicians` is called
- **THEN** the response includes `profileData.specialties`, `profileData.availabilityStatus`, and `profileData.avatarUrl`

#### Scenario: Non-admin cannot list technicians
- **GIVEN** a user with only `resident` or `technician` role
- **WHEN** they call `GET /users/technicians`
- **THEN** the response is `403 Forbidden`

### Requirement: Cache Invalidation for Technician List
The system MUST invalidate the technician list cache when workload-affecting events occur.

#### Scenario: Invalidate on incident assignment
- **GIVEN** the technician list is cached
- **WHEN** an admin assigns a technician to an incident via `PATCH /incidents/:id/assign`
- **THEN** the `technicians:list` cache key is invalidated

#### Scenario: Invalidate on incident status change
- **GIVEN** the technician list is cached
- **WHEN** an incident status changes (e.g., `in_progress` → `resolved`)
- **THEN** the `technicians:list` cache key is invalidated
