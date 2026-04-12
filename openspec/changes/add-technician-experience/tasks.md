# Tasks: Add Technician Experience

## Phase 1: Backend — Technician Profile & Listing (parallelizable)

### 1.1 Technician Profile DTO & Validation
- [x] 1.1.1 Create `TechnicianProfileDto` Zod schema in `packages/shared-types` with `specialties`, `availabilityStatus`, `shiftPreferences` fields
- [x] 1.1.2 Add `UpdateTechnicianProfileDto` in `apps/api/src/modules/identity/users/dto/` with class-validator decorators
- [x] 1.1.3 Add `PATCH /users/:id/technician-profile` endpoint in `UsersController` (admin or self, technician only)
- [x] 1.1.4 Implement `updateTechnicianProfile()` in `UsersService` — merge into `profile_data` JSONB field
- [x] 1.1.5 Add Swagger decorators for new endpoint

### 1.2 Technician Listing Endpoint
- [x] 1.2.1 Create `TechnicianListResponseDto` with workload fields
- [x] 1.2.2 Add `GET /users/technicians` endpoint in `UsersController` with `@Roles('admin')`
- [x] 1.2.3 Implement `listTechnicians()` in `UsersService` — query `UserRoleAssignment` for technician role, aggregate incident counts per technician
- [x] 1.2.4 Add Redis caching (key: `technicians:list`, TTL: 2 min) using existing Redis provider
- [x] 1.2.5 Add cache invalidation in `IncidentsService.assignTechnician()` and `updateStatus()`
- [x] 1.2.6 Add Swagger decorators and unit tests for listing endpoint

### 1.3 Technician Dashboard Stats Endpoint
- [x] 1.3.1 Create `TechnicianDashboardStatsDto` response DTO
- [x] 1.3.2 Add `GET /stats/technician-dashboard` in `StatsController` with `@Roles('technician')`
- [x] 1.3.3 Implement stats aggregation in `StatsService` — count assigned/inProgress/pendingReview/resolvedThisMonth/avgResolutionHours/urgentCount for current user
- [x] 1.3.4 Add Redis caching (key: `stats:technician:{userId}`, TTL: 2 min)
- [x] 1.3.5 Add cache invalidation on incident status change for assigned technician
- [ ] 1.3.6 Add Swagger decorators and unit tests

## Phase 2: Frontend — Shared Hooks & Components

### 2.1 API Hooks
- [x] 2.1.1 Create `useTechnicians()` hook in `apps/web/src/hooks/use-technicians.ts` — calls `GET /users/technicians`, returns TanStack Query result
- [x] 2.1.2 Create `useTechnicianDashboardStats()` hook — calls `GET /stats/technician-dashboard`
- [x] 2.1.3 Create `useUpdateTechnicianProfile()` mutation hook — calls `PATCH /users/:id/technician-profile`

### 2.2 Technician Selector Component
- [x] 2.2.1 Create `TechnicianSelector` in `apps/web/src/components/incidents/technician-selector.tsx`
  - Shadcn `Popover` + `Command` pattern (searchable dropdown)
  - Display: avatar, name, specialties badges, workload color indicator, availability
  - Highlight category-matching technicians
- [x] 2.2.2 Add workload indicator logic (green ≤3, yellow 4-6, red 7+)
- [x] 2.2.3 Add skeleton loader for technician list loading state

## Phase 3: Frontend — Technician Dashboard

### 3.1 Technician Dashboard Component
- [x] 3.1.1 Create `TechnicianDashboard` in `apps/web/src/components/dashboard/technician-dashboard.tsx`
  - Stats cards: Assigned, In Progress, Pending Review, Urgent (Shadcn Card, Framer Motion entry)
  - Recent assignments list (last 5 incidents) with links to incident detail
  - Performance metrics: avg resolution hours, resolved this month
- [x] 3.1.2 Add skeleton loader for all dashboard sections
- [x] 3.1.3 Add Framer Motion page transition (consistent with admin/resident dashboards)

### 3.2 Dashboard Role Routing
- [x] 3.2.1 Modify `apps/web/src/app/(dashboard)/dashboard/page.tsx` to render:
  - Admin → `AdminDashboard` (existing)
  - Technician (without admin) → `TechnicianDashboard` (new)
  - Resident → `ResidentDashboard` (existing)
- [ ] 3.2.2 Add "Technician Workload" card to `AdminDashboard` — shows technician names, active counts, availability status using `useTechnicians()` hook

## Phase 4: Frontend — My Assignments Page

### 4.1 My Assignments Page
- [x] 4.1.1 Create `apps/web/src/app/(dashboard)/incidents/my-assignments/page.tsx`
  - Pre-filtered table showing only incidents assigned to current user
  - Default filter: active statuses (assigned, in_progress, pending_review)
  - Sort by priority (urgent first), then created date
  - URL state via nuqs for status/priority filters
- [x] 4.1.2 Create quick-action column in table:
  - `assigned` → "Start Work" button
  - `in_progress` → "Request Review" / "Mark Resolved" buttons
  - `pending_review` → no actions (read-only badge)
- [x] 4.1.3 Implement optimistic status updates with TanStack Query mutation + rollback on error
- [x] 4.1.4 Add skeleton loader for table loading state
- [x] 4.1.5 Wire up `useIncidentRealTime()` for real-time incident assignment notifications

### 4.2 Sidebar Navigation Update
- [x] 4.2.1 Add "My Assignments" nav item in `dashboard-sidebar.tsx` under Incidents group
  - Roles: `[technician]`
  - Icon: `ClipboardList` (lucide-react)
  - Show badge count of active assignments (assigned + in_progress)
- [x] 4.2.2 Verify "Incidents" nav item is visible for `[admin, technician]`

## Phase 5: Frontend — Incident Detail Sheet Enhancements

### 5.1 Assignment Controls
- [x] 5.1.1 Add `TechnicianSelector` to `IncidentDetailSheet` (visible for admin role only)
  - Show "Assign Technician" when unassigned
  - Show current technician with "Reassign" option when assigned
- [x] 5.1.2 Wire `useAssignTechnician()` mutation with optimistic update
- [x] 5.1.3 Show assigned technician as read-only for non-admin roles

### 5.2 Activity Timeline
- [x] 5.2.1 Create `IncidentTimeline` component in `apps/web/src/components/incidents/incident-timeline.tsx`
  - Vertical timeline with icons per event type (assignment, status change, comment)
  - Derive events from existing comments (system comments for assignment/status changes)
  - Filter internal notes by role (admin/technician see all, resident sees public only)
- [x] 5.2.2 Add "Timeline" tab to `IncidentDetailSheet` alongside existing content
- [x] 5.2.3 Add Framer Motion entry animations for timeline items

## Phase 6: Testing & Polish

### 6.1 Backend Testing
- [ ] 6.1.1 Unit tests for `listTechnicians()` service method (workload aggregation, caching)
- [ ] 6.1.2 Unit tests for `getTechnicianDashboardStats()` service method
- [ ] 6.1.3 Unit tests for `updateTechnicianProfile()` validation and persistence
- [ ] 6.1.4 Unit tests for cache invalidation on assignment/status change

### 6.2 Frontend Testing
- [ ] 6.2.1 Component tests for `TechnicianSelector` (render, search, selection, workload indicators)
- [ ] 6.2.2 Component tests for `TechnicianDashboard` (stats rendering, skeleton states)
- [ ] 6.2.3 Component tests for quick-action buttons (optimistic update, error rollback)

### 6.3 Integration
- [ ] 6.3.1 E2E test: Admin assigns technician → technician sees incident in My Assignments → technician starts work → admin sees status update
- [ ] 6.3.2 Verify WebSocket real-time updates work end-to-end for assignment flow
- [ ] 6.3.3 Lighthouse audit for new pages (Performance > 90, CLS = 0)
