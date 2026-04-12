# Technician Assignment UI

## ADDED Requirements

### Requirement: Technician Selector Component
The system MUST provide a reusable dropdown component for admins to assign or reassign a technician to an incident, showing workload and skill-match indicators.

#### Scenario: Admin assigns technician via selector
- **GIVEN** an admin viewing an incident's detail sheet
- **WHEN** they open the technician selector dropdown
- **THEN** a searchable list of all technicians is shown
- **AND** each option displays: avatar, full name, specialties badges, workload indicator (green/yellow/red), and availability status
- **AND** technicians whose specialties match the incident's category are highlighted or sorted first

#### Scenario: Workload indicator thresholds
- **GIVEN** the technician selector is displayed
- **WHEN** a technician has 0–3 active incidents → green indicator
- **WHEN** a technician has 4–6 active incidents → yellow indicator
- **WHEN** a technician has 7+ active incidents → red indicator

#### Scenario: Reassign technician
- **GIVEN** an incident already has a technician assigned
- **WHEN** an admin selects a different technician from the selector
- **THEN** the incident is reassigned via `PATCH /incidents/:id/assign`
- **AND** both the previous and new technician receive WebSocket notifications
- **AND** the UI updates optimistically

### Requirement: Assignment in Incident Detail Sheet
The incident detail sheet MUST show technician assignment controls for admin users.

#### Scenario: Admin sees assignment section in detail sheet
- **GIVEN** an admin opens the incident detail sheet
- **WHEN** the incident is unassigned
- **THEN** an "Assign Technician" button with the `TechnicianSelector` is shown

#### Scenario: Non-admin does not see assignment controls
- **GIVEN** a technician or resident user opens the incident detail sheet
- **WHEN** the sheet renders
- **THEN** assignment controls are hidden
- **AND** the assigned technician name is shown as read-only text (if assigned)

## MODIFIED Requirements

### Requirement: Incident Activity Timeline
The incident detail sheet MUST include a timeline view showing status changes, assignments, and comments in chronological order.

#### Scenario: View incident timeline
- **GIVEN** a user opens the incident detail sheet
- **WHEN** they switch to the "Timeline" tab
- **THEN** they see a chronological list of events including:
  - Status changes with old → new status and timestamp
  - Technician assignment/reassignment events
  - Comments (public and internal, based on role visibility)
- **AND** each event shows the actor's name, avatar, and relative timestamp
