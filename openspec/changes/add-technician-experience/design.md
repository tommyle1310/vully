# Design: Add Technician Experience

## Overview
This design covers the technical decisions for adding a first-class technician experience across frontend and backend. The system already has strong backend support for technician roles; this change primarily builds the missing UI layer and adds lightweight backend endpoints for workload visibility.

---

## 1. Technician Profile Extension

### Decision: Store in `profile_data` JSON column
The existing `users.profile_data` column (JSONB) already holds arbitrary profile metadata (e.g., `avatarUrl`). Rather than adding new columns, extend the JSON shape.

**Schema shape** (TypeScript):
```typescript
interface TechnicianProfileData {
  avatarUrl?: string;
  specialties?: TechnicianSpecialty[]; // e.g., ['plumbing', 'electrical', 'hvac']
  availabilityStatus?: 'available' | 'busy' | 'off_duty';
  shiftPreferences?: {
    preferredDays?: string[];      // e.g., ['mon', 'tue', 'wed']
    preferredHours?: string;       // e.g., '08:00-17:00'
  };
}
```

**Rationale**: No migration needed. The JSONB column is schema-flexible. Backend validation uses Zod DTOs. The `specialties` field maps to `IncidentCategory` enum values so admins can match technician skills to incident types.

### Alternative Considered: Separate `technician_profiles` table
Rejected — adds join complexity for minimal structured data. Revisit if technician profiles grow to 10+ fields or need relational queries.

---

## 2. Technician Listing Endpoint

### `GET /users/technicians`
Returns users with `technician` role, enriched with workload counts.

**Response shape**:
```typescript
interface TechnicianListItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profileData: {
    avatarUrl?: string;
    specialties?: string[];
    availabilityStatus?: string;
  };
  workload: {
    assigned: number;     // status: assigned
    inProgress: number;   // status: in_progress
    pendingReview: number; // status: pending_review
    total: number;        // sum of above
  };
}
```

**Implementation**: 
- Query `UserRoleAssignment` for `role = 'technician'`, join users
- For each technician, count incidents by status using a single aggregate query
- Cache result in Redis (key: `technicians:list`, TTL: 2 minutes)
- Invalidate cache on incident assignment/status change

**Placement**: Add to existing `UsersController` as `@Get('technicians')` with `@Roles('admin')`.

---

## 3. Technician Dashboard Stats

### `GET /stats/technician-dashboard`
Returns personalized stats for the currently authenticated technician.

**Response shape**:
```typescript
interface TechnicianDashboardStats {
  assignedCount: number;        // incidents in 'assigned' status
  inProgressCount: number;      // incidents in 'in_progress' status
  pendingReviewCount: number;   // incidents in 'pending_review' status
  resolvedThisMonth: number;    // incidents resolved in current month
  avgResolutionHours: number;   // average hours from assignment to resolution (last 30 days)
  urgentCount: number;          // incidents with priority 'urgent' or 'high' in active statuses
}
```

**Implementation**: Add to existing `StatsController` with `@Roles('technician')`. Cache per-user (key: `stats:technician:{userId}`, TTL: 2 minutes). Invalidate on incident status changes via existing WebSocket event hooks.

---

## 4. Frontend Architecture

### 4.1 Technician Dashboard Component

**Location**: `apps/web/src/components/dashboard/technician-dashboard.tsx`

**Rendering logic** in `dashboard/page.tsx`:
```
Current: isAdmin (admin OR technician) → AdminDashboard
                                       → ResidentDashboard

Proposed: admin → AdminDashboard
          technician → TechnicianDashboard  ← NEW
          resident → ResidentDashboard
```

**Components**:
- `StatsCards` — 4 cards: Assigned, In Progress, Pending Review, Urgent (using existing `Card` from Shadcn)
- `RecentAssignments` — last 5 assigned incidents with quick-action buttons
- `ResolutionChart` — Recharts bar chart showing incidents resolved per week (last 4 weeks)
- `PerformanceMetrics` — avg resolution time, resolved this month

### 4.2 My Assignments Page

**Route**: `/incidents/my-assignments` (technician-only via sidebar role filter)

**Layout options considered**:
1. **Kanban board** (columns: Assigned → In Progress → Pending Review → Resolved)
2. **Filtered table** (reuse existing TanStack Table with pre-filtered `assignedToMe`)
3. **Split view** — list on left, detail on right

**Decision**: **Option 2 (filtered table)** with status-grouped sections. Rationale:
- Reuses existing `incident-columns.tsx` and table infrastructure
- Kanban adds drag-and-drop complexity with no clear benefit for read-heavy workflow
- Add quick-action buttons per row (e.g., "Start Work", "Mark Resolved") for efficiency
- Can upgrade to kanban later if requested

**Quick-action buttons per status**:
| Current Status | Available Actions |
|---------------|-------------------|
| `assigned` | "Start Work" → transitions to `in_progress` |
| `in_progress` | "Request Review" → `pending_review`, "Mark Resolved" → `resolved` |
| `pending_review` | (no quick action — awaiting admin) |

### 4.3 Technician Assignment Selector (Admin)

**Location**: `apps/web/src/components/incidents/technician-selector.tsx`

**Used in**: `IncidentDetailSheet` (admin view)

**UX Design**:
- Shadcn `Popover` + `Command` (searchable dropdown)
- Each option shows: Avatar, Name, Specialties badges, Workload indicator (color dot: green ≤3, yellow 4-6, red 7+)
- Highlights technicians whose specialties match the incident category
- Shows current assignment with "Reassign" button

**Data source**: `useTechnicians()` hook calling `GET /users/technicians`

### 4.4 Incident Activity Timeline

**Location**: `apps/web/src/components/incidents/incident-timeline.tsx`

**Used in**: `IncidentDetailSheet` as a new "Timeline" tab

**Data source**: Derive from existing incident data + comments:
- Status changes (from `updated_at` field diffs — computed at render time from audit trail or comment history)
- Technician assignments (from comments with type `system`)
- Comments (already loaded)

**Design**: Vertical timeline with icons per event type, timestamps, and actor name.

**Decision**: For MVP, build timeline from comments only (the backend already creates system comments on assignment/status changes). No new backend endpoint needed.

### 4.5 Admin Workload Overview

**Location**: Embedded in `AdminDashboard` as a new card "Technician Workload"

**Design**: Simple table/list showing each technician's name, active incident count, and availability status. Clicking navigates to filtered incident list.

---

## 5. Navigation Updates

### Sidebar Changes
Add to `dashboard-sidebar.tsx` nav config:

| Item | Path | Roles | Icon |
|------|------|-------|------|
| My Assignments | `/incidents/my-assignments` | `[technician]` | `Wrench` |

Move "Incidents" to be visible for `[admin, technician]` (verify current state).

---

## 6. Caching Strategy

| Cache Key | TTL | Invalidation Trigger |
|-----------|-----|---------------------|
| `technicians:list` | 2 min | Incident assignment, technician profile update |
| `stats:technician:{userId}` | 2 min | Incident status change for that technician |

Uses existing Redis provider. Same pattern as `stats` module (5-min TTL for admin stats, 2-min for technician due to more dynamic workload).

---

## 7. WebSocket Events (No Changes)

Existing events are sufficient:
- `incident:assigned` → already emitted to `role:technician` room
- `incident:updated` → already emitted to assigned technician's user room
- `incident:resolved` → already emitted

The frontend `useIncidentRealTime()` hook already listens for these and invalidates TanStack Query cache. The new technician dashboard and work queue will benefit from this automatically.
