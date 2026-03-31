# Capability: Incidents

## ADDED Requirements

### Requirement: Incident Reporting
The system SHALL allow residents to report maintenance issues and incidents.

#### Scenario: Create incident
- **GIVEN** an authenticated Resident
- **WHEN** POST to `/api/incidents` with category, description, images
- **THEN** the system creates incident linked to resident's apartment
- **AND** sets status to "open"
- **AND** stores uploaded images

#### Scenario: Incident categories
- **GIVEN** incident creation
- **WHEN** selecting category
- **THEN** valid categories include: plumbing, electrical, appliance, structural, pest, noise, other

#### Scenario: Image upload
- **GIVEN** a Resident reporting incident
- **WHEN** attaching up to 5 images
- **THEN** images are stored and associated with incident
- **AND** images are optimized for viewing

---

### Requirement: Incident Workflow
The system SHALL support incident lifecycle management with status transitions.

#### Scenario: Assign technician
- **GIVEN** an Admin and an open incident
- **WHEN** assigning technician to incident
- **THEN** status changes to "assigned"
- **AND** technician receives notification

#### Scenario: Technician updates status
- **GIVEN** a Technician assigned to incident
- **WHEN** updating status to "in-progress" or "resolved"
- **THEN** the system updates status
- **AND** notifies the resident

#### Scenario: Valid status transitions
- **GIVEN** incident status machine
- **THEN** valid transitions are:
  - open → assigned
  - assigned → in-progress
  - in-progress → resolved
  - in-progress → assigned (reassign)
  - resolved → closed
  - any → cancelled (Admin only)

---

### Requirement: Incident Comments
The system SHALL support threaded comments on incidents.

#### Scenario: Add comment
- **GIVEN** an incident and authenticated user (Resident, Technician, Admin)
- **WHEN** POST to `/api/incidents/:id/comments`
- **THEN** the system adds comment with timestamp
- **AND** other parties receive notification

#### Scenario: Comment visibility
- **GIVEN** incident comments
- **WHEN** viewing incident
- **THEN** all comments are visible to involved parties (reporter, assignee, admin)

---

### Requirement: Incident List Performance
The system SHALL efficiently handle large incident lists.

#### Scenario: Paginated listing
- **GIVEN** thousands of incidents
- **WHEN** GET `/api/incidents` with pagination
- **THEN** the system returns paginated results
- **AND** supports cursor-based pagination for performance

#### Scenario: Filter by status
- **GIVEN** incident listing
- **WHEN** filtering by status=open
- **THEN** only open incidents are returned

---

### Requirement: Incident Access Control
The system SHALL restrict incident access based on role.

#### Scenario: Resident views own incidents
- **GIVEN** an authenticated Resident
- **WHEN** GET `/api/incidents`
- **THEN** only incidents from their apartment are returned

#### Scenario: Technician views assigned incidents
- **GIVEN** an authenticated Technician
- **WHEN** GET `/api/incidents`
- **THEN** only incidents assigned to them are returned (plus unassigned for viewing)

#### Scenario: Admin views all incidents
- **GIVEN** an authenticated Admin
- **WHEN** GET `/api/incidents`
- **THEN** all incidents are returned with full filtering options
