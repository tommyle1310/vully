# Technician Dashboard

## ADDED Requirements

### Requirement: Technician Dashboard Stats Endpoint
The system MUST provide a personalized dashboard statistics endpoint for technicians with their assigned incident metrics.

#### Scenario: Retrieve technician dashboard stats
- **GIVEN** an authenticated technician user
- **WHEN** `GET /stats/technician-dashboard` is called
- **THEN** the response includes:
  - `assignedCount`: incidents with status `assigned` assigned to current user
  - `inProgressCount`: incidents with status `in_progress` assigned to current user
  - `pendingReviewCount`: incidents with status `pending_review` assigned to current user
  - `resolvedThisMonth`: incidents resolved in the current calendar month by current user
  - `avgResolutionHours`: average hours from assignment to resolution over last 30 days
  - `urgentCount`: incidents with priority `urgent` or `high` in active statuses
- **AND** the response is cached per-user in Redis (key: `stats:technician:{userId}`, TTL: 2 minutes)

#### Scenario: Non-technician cannot access technician dashboard stats
- **GIVEN** a user without the `technician` role
- **WHEN** they call `GET /stats/technician-dashboard`
- **THEN** the response is `403 Forbidden`

### Requirement: Technician Dashboard UI
The system MUST render a dedicated dashboard for technician users when they navigate to `/dashboard`, replacing the admin analytics view.

#### Scenario: Technician sees personalized dashboard
- **GIVEN** a user with only the `technician` role
- **WHEN** they navigate to `/dashboard`
- **THEN** they see a `TechnicianDashboard` component instead of the admin analytics dashboard
- **AND** the dashboard shows: stats cards (Assigned, In Progress, Pending Review, Urgent), recent assignments list, and performance metrics

#### Scenario: Admin+Technician user sees admin dashboard
- **GIVEN** a user with both `admin` and `technician` roles
- **WHEN** they navigate to `/dashboard`
- **THEN** they see the admin analytics dashboard (admin role takes priority)
- **AND** the admin dashboard includes a "Technician Workload" summary card

### Requirement: Technician Workload Card (Admin Dashboard)
The admin dashboard MUST include a summary card showing technician workload distribution.

#### Scenario: Admin sees technician workload overview
- **GIVEN** an admin user on the dashboard page
- **WHEN** the dashboard loads
- **THEN** a "Technician Workload" card displays each technician's name, active incident count, and availability status
- **AND** clicking a technician name navigates to `/incidents?assignedToId={technicianId}`
