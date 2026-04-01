# Capability: Notifications

## ADDED Requirements

### Requirement: Real-time WebSocket Gateway
The system SHALL provide real-time notifications via WebSocket connections.

#### Scenario: WebSocket connection
- **GIVEN** an authenticated user
- **WHEN** establishing WebSocket connection with access token
- **THEN** the system authenticates and assigns to appropriate rooms
- **AND** connection is maintained with heartbeat

#### Scenario: Room subscription
- **GIVEN** a connected user
- **WHEN** authenticated as Resident of apartment 101 in building A
- **THEN** user is subscribed to rooms: `buildings:A`, `apartments:101`, `user:{userId}`

---

### Requirement: Incident Notifications
The system SHALL push real-time updates for incident changes.

#### Scenario: New incident notification
- **GIVEN** a Resident creates an incident
- **WHEN** incident is saved
- **THEN** admins in the building receive `incident:created` event
- **AND** event contains incident summary

#### Scenario: Status change notification
- **GIVEN** an incident status changes
- **WHEN** update is saved
- **THEN** the reporter receives `incident:updated` event via their user room
- **AND** event contains new status and any message

---

### Requirement: Invoice Notifications
The system SHALL notify residents when invoices are ready.

#### Scenario: Invoice ready notification
- **GIVEN** monthly invoices are generated
- **WHEN** an invoice is created for apartment 101
- **THEN** residents of apartment 101 receive `invoice:ready` event
- **AND** event contains invoice summary (period, amount)

---

### Requirement: Announcement Broadcasting
The system SHALL support building-wide announcements.

#### Scenario: Create announcement
- **GIVEN** an authenticated Admin
- **WHEN** POST to `/api/announcements` with building, title, body
- **THEN** the system creates announcement
- **AND** broadcasts `announcement:new` to building room

#### Scenario: Announcement read status
- **GIVEN** an announcement in a building
- **WHEN** resident marks as read
- **THEN** the system records read status per user

---

### Requirement: Connection Management
The system SHALL handle WebSocket connection lifecycle gracefully.

#### Scenario: Reconnection
- **GIVEN** a client loses connection
- **WHEN** client reconnects
- **THEN** client is re-authenticated and re-subscribed to rooms
- **AND** receives any missed events (if within buffer window)

#### Scenario: Multi-device support
- **GIVEN** a user connected on multiple devices
- **WHEN** notification is sent
- **THEN** all connected devices receive the event
