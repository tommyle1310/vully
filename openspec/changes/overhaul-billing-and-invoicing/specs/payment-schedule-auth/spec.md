# Payment Schedule & Authorization — Spec Delta

## MODIFIED Requirements

### Requirement: REQ-PAY-001 — Admin and Technician Can Access All Payment Schedule Endpoints

Authorization checks in `payment-schedule.controller.ts` MUST use `user.roles` (multi-role array) instead of `user.role` (legacy singular field) to be consistent with `RolesGuard`.

#### Scenario: Admin can view payment schedules for any contract
- **Given** an authenticated user with `roles = ['admin']`
- **When** `GET /contracts/:contractId/payment-schedules` is called
- **Then** the response is 200 with the schedule list

#### Scenario: Admin can view financial summary for any contract
- **Given** an authenticated user with `roles = ['admin']`
- **When** `GET /contracts/:contractId/financial-summary` is called
- **Then** the response is 200 with the financial summary (not 403)

#### Scenario: Multi-role user with admin role gets admin access
- **Given** a user with `roles = ['resident', 'admin']`
- **When** accessing payment schedule endpoints
- **Then** the user is treated as admin (not blocked by resident check)

#### Scenario: Resident can only view own contract schedules
- **Given** a user with `roles = ['resident']` and `id = user-123`
- **And** contract `contract-abc` has `tenant_id = user-456`
- **When** `GET /contracts/contract-abc/payment-schedules` is called
- **Then** the response is 403 Forbidden

---

### Requirement: REQ-PAY-002 — Payment Schedule Edit Must Be Functional

Admin users MUST be able to edit payment schedule entries (period label, due date, expected amount, notes, status).

#### Scenario: Admin edits a schedule's due date
- **Given** a payment schedule with `due_date = 2026-05-01`
- **When** admin PATCHes with `{ dueDate: "2026-06-01" }`
- **Then** the schedule's `due_date` is updated to `2026-06-01`

#### Scenario: Edit button is enabled for admin in UI
- **Given** an admin user viewing the payment schedule table
- **When** the table renders
- **Then** the "Edit Schedule" dropdown item is clickable (not disabled)

---

### Requirement: REQ-PAY-003 — Add Entry Button Enables After Deletion

After deleting a payment schedule entry, the "Add Entry" button MUST become enabled immediately.

#### Scenario: Delete schedule then add new one
- **Given** a contract with 3 payment schedules
- **When** admin deletes schedule #2
- **Then** the "Add Entry" button is enabled
- **And** admin can create a new schedule entry to replace the deleted one

---

### Requirement: REQ-PAY-004 — Overdue Status Auto-Update

Payment schedules with `status = 'pending'` and `due_date < today` MUST be automatically updated to `status = 'overdue'`.

#### Scenario: Overdue statuses updated on server startup
- **Given** a payment schedule with `status = 'pending'` and `due_date = 2026-03-01`
- **And** today is `2026-04-06`
- **When** the billing module initializes
- **Then** the schedule's status is updated to `'overdue'`

---

## ADDED Requirements

### Requirement: REQ-PAY-005 — Financial Summary Uses Correct Contract Duration

For rental contracts, `totalContractValue` MUST be calculated from actual contract duration (not hardcoded 12 months).

#### Scenario: 6-month rental contract financial summary
- **Given** a rental contract with `rent_amount = 10,000,000`, `start_date = 2026-01-01`, `end_date = 2026-06-30`
- **When** financial summary is calculated
- **Then** `totalContractValue = 60,000,000` (6 months × 10M, not 120M)
