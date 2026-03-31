# Capability: Billing

## ADDED Requirements

### Requirement: Invoice Generation
The system SHALL generate monthly invoices for all active contracts.

#### Scenario: Generate invoice for period
- **GIVEN** an active contract with meter readings for the period
- **WHEN** Admin triggers invoice generation for March 2026
- **THEN** the system calculates rent + utilities
- **AND** creates an invoice with line items
- **AND** sets status to "pending"

#### Scenario: Bulk invoice generation via queue
- **GIVEN** Admin triggers "Generate invoices for March 2026"
- **WHEN** the request is submitted
- **THEN** a background job is enqueued via BullMQ
- **AND** the system returns job ID immediately
- **AND** invoices are generated asynchronously

#### Scenario: Invoice calculation with utilities
- **GIVEN** meter readings for electric (100 kWh) and water (10 m³)
- **WHEN** invoice is calculated
- **THEN** line items include base rent, electric charge, water charge
- **AND** total equals sum of all line items

---

### Requirement: Meter Reading Submission
The system SHALL allow meter readings to be submitted for billing calculation.

#### Scenario: Resident submits reading
- **GIVEN** an authenticated Resident
- **WHEN** submitting meter reading for their apartment
- **THEN** the system records the reading with timestamp
- **AND** associates it with the apartment

#### Scenario: Admin submits reading for any apartment
- **GIVEN** an authenticated Admin
- **WHEN** submitting meter reading for any apartment
- **THEN** the system records the reading

#### Scenario: Duplicate reading prevention
- **GIVEN** a meter reading already exists for the same meter and period
- **WHEN** another reading is submitted
- **THEN** the system returns 409 Conflict
- **AND** suggests editing the existing reading

---

### Requirement: Invoice Management
The system SHALL support full invoice lifecycle management.

#### Scenario: View invoice list
- **GIVEN** an authenticated user
- **WHEN** requesting `/api/invoices`
- **THEN** the system returns invoices visible to the user
- **AND** supports filtering by status, period, apartment

#### Scenario: Mark invoice as paid
- **GIVEN** an Admin with a pending invoice
- **WHEN** PATCH to `/api/invoices/:id` with `{ status: "paid" }`
- **THEN** the system updates status
- **AND** logs the payment action

#### Scenario: Invoice edit audit
- **GIVEN** any invoice modification by Admin
- **WHEN** the update succeeds
- **THEN** the system logs actor, invoice ID, changes, and timestamp

---

### Requirement: Background Job Reliability
The system SHALL ensure billing jobs are processed reliably.

#### Scenario: Job retry on failure
- **GIVEN** an invoice generation job fails
- **WHEN** the failure is detected
- **THEN** the system retries up to 3 times with exponential backoff

#### Scenario: Dead letter queue
- **GIVEN** a job fails after all retries
- **WHEN** moved to dead letter queue
- **THEN** Admin can view failed jobs
- **AND** manually retry or dismiss

---

### Requirement: Unit Test Coverage
The billing logic SHALL maintain >70% unit test coverage.

#### Scenario: Coverage verification
- **GIVEN** billing calculation and job processing code
- **WHEN** running unit tests
- **THEN** coverage report shows >70% for billing module
