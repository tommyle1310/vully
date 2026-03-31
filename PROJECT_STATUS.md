# Vully Project Status

**Last Updated**: March 31, 2026  
**Current Phase**: Phase 4 Real-time Complete (95%) → Ready for Phase 5 (Dashboard)

---

## Quick Summary

| Area | Status | Notes |
|------|--------|-------|
| Backend API | ✅ Running | http://localhost:3001 |
| Frontend Web | ✅ Running | http://localhost:3000 |
| Database | ✅ Connected | PostgreSQL (Neon) |
| Redis | ⚠️ Docker | Needed for BullMQ (Phase 3) |
| Authentication | ✅ JWT | Login works, no register UI |
| RBAC | ✅ Backend | Guards implemented |
| **WebSocket** | ✅ **Live** | **Real-time incidents with auto-reconnect** ✨ |

---

## What's Currently Implemented

### Backend (NestJS) - `apps/api/`

#### Identity Module (`/api/auth`, `/api/users`)
| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `/api/auth/login` | POST | ✅ | JWT token pair |
| `/api/auth/refresh` | POST | ✅ | Refresh access token |
| `/api/auth/logout` | POST | ✅ | Invalidate tokens |
| `/api/auth/logout-all` | POST | ✅ | All sessions |
| `/api/auth/me` | GET | ✅ | Current user info |
| `/api/users` | POST | ✅ | Admin-only create |
| `/api/users` | GET | ✅ | List users |
| `/api/users/:id` | GET/PATCH | ✅ | View/update user |
| `/api/users/me/password` | PATCH | ✅ | Change password |

**Missing**: 
- ❌ Public registration endpoint (currently admin creates users)
- ❌ Password reset flow (email token-based)
- ❌ Email verification

#### Apartments Module (`/api/buildings`, `/api/apartments`, `/api/contracts`)
| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/buildings` | CRUD | ✅ |
| `/api/buildings/:id/svg-map` | PATCH | ✅ |
| `/api/apartments` | CRUD | ✅ |
| `/api/apartments/:id/status` | PATCH | ✅ |
| `/api/apartments/my` | GET | ✅ |
| `/api/contracts` | CRUD | ✅ |
| `/api/contracts/:id/terminate` | POST | ✅ |

#### Infrastructure
- ✅ Swagger docs at `/api/docs`
- ✅ Health checks at `/api/health` and `/api/health/ready`
- ✅ Global exception filter
- ✅ Pino structured logging
- ✅ RBAC guards (`@Roles()` decorator)
- ✅ JWT strategy with access/refresh tokens

---

### Frontend (Next.js 15) - `apps/web/`

#### Pages Implemented
| Route | Component | Status | Features |
|-------|-----------|--------|----------|
| `/` | Home | ✅ | Landing with login/dashboard links |
| `/login` | Login | ✅ | Email/password form, Zod validation |
| `/dashboard` | Dashboard | ✅ | Stats cards, skeleton placeholders |
| `/apartments` | Apartments | ✅ | TanStack Table, search, pagination |

**Missing Pages**:
- ❌ `/register` - No public registration
- ❌ `/forgot-password` - No password reset
- ❌ `/users` - User management UI
- ❌ `/invoices` - Phase 3
- ❌ `/incidents` - Phase 4
- ❌ `/reports` - Phase 5
- ❌ `/settings` - User settings

#### Components Implemented
```
src/components/
├── ui/                          # Shadcn components
│   ├── button.tsx              ✅
│   ├── input.tsx               ✅
│   ├── card.tsx                ✅
│   ├── badge.tsx               ✅
│   ├── skeleton.tsx            ✅
│   ├── toast.tsx               ✅
│   ├── form.tsx                ✅
│   ├── label.tsx               ✅
│   ├── dropdown-menu.tsx       ✅
│   ├── sheet.tsx               ✅
│   ├── table.tsx               ✅
│   ├── avatar.tsx              ✅
│   └── page-transition.tsx     ✅
├── protected-route.tsx          ✅ Auth guard wrapper
├── theme-provider.tsx           ✅ Dark/light mode
└── user-profile-dropdown.tsx    ✅ Avatar + logout menu
```

#### Hooks Implemented
```
src/hooks/
├── use-auth.ts        ✅ useLogin, useLogout, useAuth, useCurrentUser
├── use-apartments.ts  ✅ useApartments, useApartment, useUpdateApartmentStatus
├── use-toast.ts       ✅ Toast notifications
└── use-tour-guide.ts  ✅ Shepherd.js integration (partial)
```

#### State Management
```
src/stores/
├── authStore.ts       ✅ User session, tokens (Zustand + persist)
└── mapStore.ts        ⏳ Prepared for SVG maps (Phase 5)
```

---

## Known Issues & Gaps

### Critical for MVP
1. **No User Registration UI/API** - Currently only admins can create users via API
2. **No Password Reset** - Users can't recover accounts
3. **Dashboard Stats are Hardcoded** - Phase 5 will add real data
4. **Sidebar was hidden on desktop** - Fixed (Framer Motion override) ✅

### Nice to Have (Deferred)
- Storybook for components
- E2E tests for apartment flows
- Husky pre-commit hooks
- File upload validation (ClamAV)

---

## How It Currently Works

### Authentication Flow
```
┌─────────┐     POST /auth/login      ┌─────────┐
│  Login  │ ─────────────────────────→│   API   │
│  Page   │←───────────────────────── │ NestJS  │
└────┬────┘  { accessToken, user }    └────┬────┘
     │                                      │
     │ Store in Zustand                     │ Verify password
     │ (user persisted,                     │ Generate JWT pair
     │  token in memory)                    │
     ▼                                      │
┌─────────┐                                 │
│Dashboard│ ─── Bearer accessToken ─────────┘
│  Page   │     (all API calls)
└─────────┘
```

### Protected Routes
```tsx
// All /dashboard/* routes wrapped in ProtectedRoute
<ProtectedRoute allowedRoles={['ADMIN']}>
  <UsersPage />  // Only admins see this
</ProtectedRoute>
```

### API Client Pattern
```tsx
// Hooks use TanStack Query + apiClient
const { data, isLoading } = useApartments({ page: 1, limit: 20 });

// apiClient automatically adds Bearer token
apiClient.setAccessToken(token); // Set on login
```

---

## Project Structure

```
vully/
├── apps/
│   ├── api/                    # NestJS Backend (port 3001)
│   │   └── src/
│   │       ├── modules/
│   │       │   ├── identity/   # Auth, users
│   │       │   └── apartments/ # Buildings, apartments, contracts
│   │       ├── common/         # Guards, decorators, filters
│   │       └── config/         # Env configuration
│   └── web/                    # Next.js Frontend (port 3000)
│       └── src/
│           ├── app/
│           │   ├── (auth)/     # Login (no register yet)
│           │   └── (dashboard)/ # Protected pages
│           ├── components/     # UI components
│           ├── hooks/          # React Query hooks
│           └── stores/         # Zustand stores
├── packages/
│   └── shared-types/           # Zod schemas
├── openspec/                   # Spec-driven development
└── docker-compose.yml          # PostgreSQL + Redis
```

---

## What's Next: Phase 3 - Billing System

### Backend Tasks
1. Define entities: `Invoice`, `LineItem`, `MeterReading`
2. Create meter reading submission endpoint
3. Implement invoice calculation logic (rent + utilities)
4. Add invoice CRUD endpoints
5. Setup BullMQ for `generate-monthly-invoices` job

### Frontend Tasks
1. Invoice list page with TanStack Table
2. Invoice detail view
3. Meter reading submission form
4. Bulk generation trigger for admin

### Infrastructure
- Ensure Redis is running (`docker-compose up -d`)
- BullMQ queue configuration

---

## Commands Reference

```bash
# Start development
pnpm dev                    # Both API + Web

# Database
pnpm db:migrate             # Run migrations
pnpm db:generate            # Generate Prisma client
pnpm db:studio              # Open Prisma Studio

# Type checking
pnpm typecheck              # All workspaces

# Docker
docker-compose up -d        # Start PostgreSQL + Redis
docker-compose down         # Stop containers
```

---

## Access Points

| Service | URL | Notes |
|---------|-----|-------|
| Web App | http://localhost:3000 | Next.js frontend |
| API | http://localhost:3001 | NestJS backend |
| API Docs | http://localhost:3001/api/docs | Swagger UI |
| Health | http://localhost:3001/api/health | Liveness check |

---

## Test Credentials

Currently no seeded test users. Create via API:
```bash
# Create admin user (requires another admin or direct DB)
curl -X POST http://localhost:3001/api/v1/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{
    "email": "admin@vully.vn",
    "password": "Admin123!",
    "firstName": "Admin",
    "lastName": "User",
    "role": "ADMIN"
  }'
```

---

## Phase Progress Overview

| Phase | Name | Status | Completion |
|-------|------|--------|------------|
| 0 | Design System | ✅ Done | 85% |
| 1 | Project Foundation | ✅ Done | 90% |
| 2 | Identity & Core Data | ✅ Done | 95% |
| 3 | Billing System | ⏳ Next | 0% |
| 4 | Incidents & Real-time | 🔜 | 0% |
| 5 | Dashboard & Maps | 🔜 | 0% |
| 6 | AI Assistant | 🔜 | 0% |
| 7 | Quality & Polish | 🔜 | 0% |
