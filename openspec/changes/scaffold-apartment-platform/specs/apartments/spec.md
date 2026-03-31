# Capability: Apartments

## ADDED Requirements

### Requirement: Building Management
The system SHALL support multi-building property management.

#### Scenario: Create building
- **GIVEN** an authenticated Admin
- **WHEN** POST to `/api/buildings` with name, address, floor count
- **THEN** the system creates the building record
- **AND** returns the building with generated ID

#### Scenario: Update building SVG map
- **GIVEN** an authenticated Admin
- **WHEN** uploading SVG map data for a building
- **THEN** the system stores the SVG for floor plan visualization

#### Scenario: List buildings
- **GIVEN** any authenticated user
- **WHEN** GET `/api/buildings`
- **THEN** the system returns all buildings the user can access

---

### Requirement: Apartment Unit Management
The system SHALL manage individual apartment units within buildings.

#### Scenario: Create apartment
- **GIVEN** an authenticated Admin and an existing building
- **WHEN** POST to `/api/apartments` with unit number, floor, building ID
- **THEN** the system creates the apartment
- **AND** sets initial status to "vacant"

#### Scenario: Update apartment status
- **GIVEN** an apartment with status "vacant"
- **WHEN** Admin updates status to "occupied"
- **THEN** the system updates the status
- **AND** the change is reflected in floor plan visualization

#### Scenario: Apartment status enum
- **GIVEN** apartment status field
- **WHEN** setting status
- **THEN** only valid values are accepted: vacant, occupied, maintenance

---

### Requirement: Contract Management
The system SHALL manage resident contracts linking users to apartments.

#### Scenario: Create contract
- **GIVEN** a vacant apartment and a registered Resident
- **WHEN** Admin creates contract with start date, rent amount
- **THEN** the system links user to apartment
- **AND** sets apartment status to "occupied"
- **AND** sets contract status to "active"

#### Scenario: Terminate contract
- **GIVEN** an active contract
- **WHEN** Admin terminates with end date
- **THEN** the system sets contract status to "terminated"
- **AND** sets apartment status to "vacant"

#### Scenario: Contract overlap prevention
- **GIVEN** an apartment with active contract
- **WHEN** attempting to create another contract for same apartment
- **THEN** the system returns 409 Conflict

---

### Requirement: Apartment Data Access Control
The system SHALL restrict apartment data based on user role.

#### Scenario: Resident views own apartment
- **GIVEN** a Resident with active contract
- **WHEN** GET `/api/apartments/:id`
- **THEN** the system returns apartment details if it's their unit
- **AND** returns 403 for other apartments

#### Scenario: Admin views all apartments
- **GIVEN** an authenticated Admin
- **WHEN** GET `/api/apartments`
- **THEN** the system returns all apartments with filtering options
