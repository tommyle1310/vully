# Technician Work Queue

## ADDED Requirements

### Requirement: My Assignments Page
The system MUST provide technicians with a dedicated page to view and manage their assigned incidents with quick-action status transitions.

#### Scenario: Technician views my assignments
- **GIVEN** a technician user
- **WHEN** they navigate to `/incidents/my-assignments`
- **THEN** they see a table of all incidents assigned to them
- **AND** the table is pre-filtered to active statuses (`assigned`, `in_progress`, `pending_review`)
- **AND** sortable by priority (urgent first) and created date

#### Scenario: Technician uses quick-action buttons
- **GIVEN** a technician viewing their assignments
- **WHEN** an incident has status `assigned`
- **THEN** a "Start Work" button is shown that transitions the status to `in_progress`
- **AND** when an incident has status `in_progress`, "Request Review" and "Mark Resolved" buttons are shown
- **AND** when an incident has status `pending_review`, no quick-action buttons are shown

#### Scenario: Quick-action triggers optimistic update
- **GIVEN** a technician clicks "Start Work" on an assigned incident
- **WHEN** the status transition API call is in-flight
- **THEN** the UI optimistically updates the row's status badge
- **AND** on API failure, the status reverts and an error toast is shown

#### Scenario: Real-time updates on assignments page
- **GIVEN** a technician is viewing the My Assignments page
- **WHEN** a new incident is assigned to them (via WebSocket `incident:assigned` event)
- **THEN** the new incident appears in the table without manual refresh
- **AND** a toast notification is shown with the incident title and priority

### Requirement: My Assignments Navigation
The sidebar MUST include a "My Assignments" link visible only to technician-role users.

#### Scenario: Technician sees My Assignments in sidebar
- **GIVEN** a user with the `technician` role
- **WHEN** they view the dashboard sidebar
- **THEN** a "My Assignments" item is visible under the Incidents group
- **AND** the item shows a badge count of active assigned incidents (status: `assigned` + `in_progress`)

#### Scenario: Non-technician does not see My Assignments
- **GIVEN** a user without the `technician` role
- **WHEN** they view the dashboard sidebar
- **THEN** the "My Assignments" item is not visible
