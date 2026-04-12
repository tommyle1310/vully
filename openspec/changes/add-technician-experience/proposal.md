# Proposal: Add Technician Experience

## Change ID
`add-technician-experience`

## Status
Draft

## Summary
Build the missing frontend experience for the technician role, including a dedicated technician dashboard, work queue, technician assignment UI (for admins), and technician-specific incident workflow screens. The backend already supports ~80% of the required technician features (scoped incident listing, status transitions, WebSocket events, assignment endpoint). This proposal focuses on surfacing those capabilities in the frontend and filling small backend gaps.

## Motivation
Currently, technicians logging into Vully see the same admin analytics dashboard and a generic incidents table. There is:
- **No dedicated technician dashboard** showing assigned work at a glance
- **No work queue / "My Assignments" view** with quick-action status transitions
- **No admin-facing technician assignment UI** — admins must rely on the detail sheet which has limited UX
- **No technician availability or workload visibility** for admins when assigning
- **No technician profile specialization** (skills, availability, shift hours)
- **No SLA / response-time tracking** tied to technician performance

This leaves technicians without a first-class workflow and forces admins to assign blindly.

## Scope

### In Scope
1. **Technician Dashboard** — role-based landing page showing assigned incident counts by status, urgency alerts, and recent activity
2. **Technician Work Queue** — dedicated "My Assignments" page with kanban-style or list view, quick-status-change actions, and sorting by priority/due-date
3. **Technician Assignment Panel (Admin)** — enhanced admin UI to assign/reassign technicians with workload indicators and skill matching hints
4. **Technician Profile Fields** — backend schema additions for specialties, availability status, and shift preferences
5. **Incident Timeline Enhancement** — show technician activity (assignment, status changes, time-in-status) as a timeline in the incident detail view
6. **Workload Analytics (Admin)** — simple stats card showing per-technician assignment count, avg resolution time, active/idle status

### Out of Scope
- SLA engine with automated escalation (future)
- Technician scheduling / calendar integration (future)
- Mobile-native technician app (future)
- Push notifications / SMS alerts (future — Communication Hub)
- Automated technician assignment via AI (future)

## Impact Analysis

### Database
- **MODIFIED**: `users` table — add `specialties` (String[]), `availability_status` enum, `shift_preferences` (JSON) to `profile_data`
- No new tables required (leverages existing `incidents`, `users`, `user_role_assignments`)

### Backend
- **NEW**: `GET /users/technicians` — list technician users with workload summary (assigned count, availability)
- **MODIFIED**: `GET /incidents` — add `sortBy=priority,createdAt` support, add `assignedToMe` shortcut filter
- **NEW**: `GET /stats/technician-dashboard` — Redis-cached technician stats (assigned counts by status, avg resolution time)
- **MODIFIED**: Incident response DTO — include `time_in_status` computed field

### Frontend
- **NEW**: `TechnicianDashboard` component (role-conditional rendering on `/dashboard`)
- **NEW**: `/incidents/my-assignments` page — technician work queue
- **MODIFIED**: `IncidentDetailSheet` — add technician assignment selector dropdown (admin only) with workload hints
- **MODIFIED**: `IncidentDetailSheet` — add activity timeline tab
- **NEW**: `TechnicianSelector` component — reusable dropdown with avatar, specialties, workload badge
- **MODIFIED**: `DashboardSidebar` — add "My Assignments" nav item for technician role

### Breaking Changes
None. All changes are additive.

## Dependencies
- Existing incident CRUD and WebSocket gateway
- Existing RBAC system with `UserRoleAssignment`
- Existing `authStore.hasAnyRole()` for frontend role checks
- Existing `useIncidentRealTime()` hook for WebSocket integration

## Risks
| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Technician workload query performance | Low | Redis-cache with 2-min TTL (same pattern as stats module) |
| Profile data migration for existing users | Low | `specialties` defaults to `[]`, `availability_status` defaults to `available` |
| Cluttering incident detail sheet | Medium | Use tab-based layout (Details / Timeline / Comments) instead of stacking sections |
